-- ============================================================================
-- 부포지션 다중 선택 마이그레이션 스크립트
-- sub_position (단일) -> sub_positions (배열)
-- ============================================================================

-- 1. 새 컬럼 추가 (이미 스키마에 있다면 무시됨)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS sub_positions TEXT[] DEFAULT ARRAY['support'];

-- 2. 기존 sub_position 데이터를 sub_positions 배열로 마이그레이션
UPDATE team_members 
SET sub_positions = ARRAY[sub_position]
WHERE sub_position IS NOT NULL 
  AND (sub_positions IS NULL OR array_length(sub_positions, 1) = 0);

-- 3. sub_positions가 NULL이거나 비어있는 레코드에 기본값 설정
UPDATE team_members 
SET sub_positions = ARRAY['support']
WHERE sub_positions IS NULL 
   OR array_length(sub_positions, 1) = 0 
   OR array_length(sub_positions, 1) IS NULL;

-- 4. 주포지션과 부포지션이 같은 경우 수정
UPDATE team_members 
SET sub_positions = CASE 
  WHEN main_position = 'support' THEN ARRAY['adc']
  ELSE ARRAY['support']
END
WHERE main_position = ANY(sub_positions);

-- 5. 기존 CHECK 제약조건 제거 및 새로운 제약조건 추가
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_main_position_check;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_sub_position_check;

-- 새로운 제약조건: 주포지션이 부포지션 배열에 포함되지 않도록
ALTER TABLE team_members 
ADD CONSTRAINT team_members_position_check 
CHECK (main_position != ALL(sub_positions));

-- 6. (선택사항) 기존 sub_position 컬럼 제거
-- 주의: 이 단계는 모든 애플리케이션 코드가 업데이트된 후에 실행하세요
-- ALTER TABLE team_members DROP COLUMN IF EXISTS sub_position;

-- 7. 마이그레이션 결과 확인 쿼리
SELECT 
  id,
  nickname,
  main_position,
  sub_positions,
  array_length(sub_positions, 1) as sub_positions_count
FROM team_members 
ORDER BY joined_at DESC 
LIMIT 10;

-- 8. 통계 확인
SELECT 
  'Total members' as category,
  count(*) as count
FROM team_members
UNION ALL
SELECT 
  'Members with multiple sub_positions' as category,
  count(*) as count
FROM team_members 
WHERE array_length(sub_positions, 1) > 1
UNION ALL
SELECT 
  'Members with single sub_position' as category,
  count(*) as count
FROM team_members 
WHERE array_length(sub_positions, 1) = 1;