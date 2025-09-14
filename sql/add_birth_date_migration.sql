-- 생년월일 컬럼 추가 마이그레이션
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 기존 데이터에 대한 주석
COMMENT ON COLUMN profiles.birth_date IS '비밀번호 찾기용 생년월일 (신규 가입자는 필수, 기존 사용자는 선택)';

-- 확인 쿼리 (선택사항)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- ORDER BY ordinal_position;