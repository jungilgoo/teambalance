-- ============================================================================
-- 레거시 sub_position 컬럼 제거 스크립트
-- ============================================================================

-- 1. 먼저 sub_positions 데이터가 올바르게 마이그레이션되었는지 확인
SELECT 
  'Data validation' as check_type,
  count(*) as total_members,
  count(CASE WHEN sub_positions IS NOT NULL AND array_length(sub_positions, 1) > 0 THEN 1 END) as with_sub_positions,
  count(CASE WHEN sub_position IS NOT NULL THEN 1 END) as with_old_sub_position
FROM team_members;

-- 2. 데이터 불일치가 있는 레코드 확인 (있으면 안됨)
SELECT 
  id, 
  nickname,
  main_position,
  sub_position as old_sub_position,
  sub_positions as new_sub_positions
FROM team_members 
WHERE sub_position IS NOT NULL 
  AND (sub_positions IS NULL OR array_length(sub_positions, 1) = 0)
LIMIT 5;

-- 3. sub_position 컬럼과 관련된 제약조건 제거
-- (이미 새로운 제약조건으로 교체됨)

-- 4. 안전하게 sub_position 컬럼 제거
-- 주의: 이 명령은 되돌릴 수 없습니다!
ALTER TABLE team_members DROP COLUMN IF EXISTS sub_position;

-- 5. 제거 후 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_members' 
  AND table_schema = 'public'
  AND column_name LIKE '%position%'
ORDER BY column_name;

-- 6. 최종 데이터 확인
SELECT 
  id,
  nickname,
  main_position,
  sub_positions,
  array_length(sub_positions, 1) as sub_count
FROM team_members 
ORDER BY joined_at DESC 
LIMIT 10;