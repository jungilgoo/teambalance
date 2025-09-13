-- TeamBalance: profiles 테이블 provider 제약 조건 수정
-- 작성일: 2025-01-03
-- 목적: 이메일 회원가입을 지원하기 위해 'email' provider 추가

BEGIN;

-- 기존 제약 조건 제거
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_provider_check;

-- 새로운 제약 조건 추가 (email 포함)
ALTER TABLE profiles ADD CONSTRAINT profiles_provider_check 
  CHECK (provider IN ('email', 'kakao', 'naver', 'google'));

COMMIT;
