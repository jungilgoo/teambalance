-- TeamBalance: Provider 제약조건 최종 해결
-- 작성일: 2025-01-03
-- 목적: profiles_provider_check 제약조건 완전 재설정

BEGIN;

-- 1. 기존 제약조건 완전 제거
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_provider_check;

-- 2. provider 컬럼이 NULL을 허용하도록 임시 변경
ALTER TABLE profiles ALTER COLUMN provider DROP NOT NULL;

-- 3. 기존 잘못된 데이터 정리 (provider가 null인 행들)
UPDATE profiles SET provider = 'email' WHERE provider IS NULL;

-- 4. 새로운 제약조건 추가 (더 명확한 정의)
ALTER TABLE profiles ADD CONSTRAINT profiles_provider_valid 
  CHECK (provider IN ('email', 'kakao', 'naver', 'google'));

-- 5. provider 컬럼을 다시 NOT NULL로 설정
ALTER TABLE profiles ALTER COLUMN provider SET NOT NULL;

-- 6. 현재 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname LIKE '%provider%';

COMMIT;