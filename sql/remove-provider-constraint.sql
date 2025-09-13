-- TeamBalance: Provider 제약조건 완전 제거 (임시 해결책)
-- 작성일: 2025-01-03
-- 목적: 회원가입 문제 즉시 해결을 위한 제약조건 제거

BEGIN;

-- 기존 provider 제약조건 완전 제거
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_provider_check;

-- provider 컬럼을 NULL 허용으로 변경 (임시)
ALTER TABLE profiles ALTER COLUMN provider DROP NOT NULL;

-- 기존 null 데이터 정리
UPDATE profiles SET provider = 'email' WHERE provider IS NULL;

-- provider 컬럼 다시 NOT NULL 설정 (제약조건 없이)
ALTER TABLE profiles ALTER COLUMN provider SET NOT NULL;

COMMIT;