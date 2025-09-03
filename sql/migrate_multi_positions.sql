-- 다중 부포지션 시스템으로 마이그레이션하는 SQL 스크립트
-- 기존 sub_position 컬럼을 sub_positions 배열로 변경

-- 1. 새로운 sub_positions 컬럼 추가 (text[] 타입)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS sub_positions text[] DEFAULT '{}';

-- 2. 기존 sub_position 데이터를 sub_positions 배열로 마이그레이션
UPDATE team_members 
SET sub_positions = ARRAY[sub_position]
WHERE sub_position IS NOT NULL
  AND (sub_positions IS NULL OR sub_positions = '{}');

-- 3. 데이터 검증 - 마이그레이션이 올바르게 되었는지 확인
-- 마이그레이션 후 이 쿼리를 실행해서 결과를 확인
SELECT 
    nickname,
    main_position,
    sub_position as old_sub_position,
    sub_positions as new_sub_positions,
    array_length(sub_positions, 1) as sub_positions_count
FROM team_members 
ORDER BY nickname
LIMIT 10;

-- 4. 마이그레이션 완료 후 기존 sub_position 컬럼 제거
-- 주의: 데이터 검증 후에만 실행하세요!
-- ALTER TABLE team_members DROP COLUMN IF EXISTS sub_position;

-- 5. 인덱스 추가 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_team_members_main_position 
ON team_members(main_position);

CREATE INDEX IF NOT EXISTS idx_team_members_sub_positions 
ON team_members USING gin(sub_positions);

-- 6. 제약조건 추가
-- 주포지션과 부포지션들이 겹치지 않도록 제약
-- 부포지션은 최대 4개까지만 허용
ALTER TABLE team_members 
ADD CONSTRAINT check_sub_positions_limit 
CHECK (array_length(sub_positions, 1) <= 4);

-- 7. 샘플 데이터 업데이트 (테스트용)
-- 기존 데이터에 추가 부포지션 할당 예시
UPDATE team_members 
SET sub_positions = CASE 
    WHEN main_position = 'mid' THEN ARRAY['adc', 'support']
    WHEN main_position = 'jungle' THEN ARRAY['top', 'mid']
    WHEN main_position = 'adc' THEN ARRAY['mid', 'support']
    WHEN main_position = 'support' THEN ARRAY['adc', 'jungle']
    WHEN main_position = 'top' THEN ARRAY['jungle', 'mid']
    ELSE sub_positions
END
WHERE team_id IN (
    SELECT id FROM teams 
    WHERE name LIKE '%테스트%' -- 테스트 팀에만 적용
    LIMIT 1
);

-- 8. 트리거 함수 생성 (부포지션 유효성 검사)
CREATE OR REPLACE FUNCTION validate_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- 주포지션이 부포지션 배열에 포함되어 있으면 오류
    IF NEW.main_position = ANY(NEW.sub_positions) THEN
        RAISE EXCEPTION '주포지션과 부포지션이 같을 수 없습니다: %', NEW.main_position;
    END IF;
    
    -- 부포지션 배열에 중복이 있으면 오류
    IF array_length(NEW.sub_positions, 1) != 
       array_length(array(SELECT DISTINCT unnest(NEW.sub_positions)), 1) THEN
        RAISE EXCEPTION '부포지션에 중복된 값이 있습니다: %', NEW.sub_positions;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 트리거 생성
DROP TRIGGER IF EXISTS trigger_validate_positions ON team_members;
CREATE TRIGGER trigger_validate_positions
    BEFORE INSERT OR UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_positions();

-- 10. 최종 검증 쿼리
-- 마이그레이션 완료 후 실행하여 모든 데이터가 올바른지 확인
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN sub_positions IS NOT NULL AND array_length(sub_positions, 1) > 0 THEN 1 END) as members_with_sub_positions,
    AVG(array_length(sub_positions, 1)) as avg_sub_positions_per_member,
    MAX(array_length(sub_positions, 1)) as max_sub_positions
FROM team_members;