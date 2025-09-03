-- =============================================================================
-- 롤 내전 매니저: 닉네임 하이브리드 로그인 시스템 마이그레이션
-- 작성일: 2025-01-02
-- 목적: profiles 테이블에 username 컬럼 추가 및 하이브리드 로그인 지원
-- =============================================================================

-- 1. profiles 테이블에 username 컬럼 추가 (UNIQUE 제약 조건 포함)
ALTER TABLE profiles 
ADD COLUMN username VARCHAR(20) UNIQUE;

-- 2. username 컬럼에 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_profiles_username ON profiles(username);

-- 3. username 길이 및 형식 제약 조건 추가
ALTER TABLE profiles 
ADD CONSTRAINT username_length_check 
CHECK (username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 20));

ALTER TABLE profiles 
ADD CONSTRAINT username_format_check 
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9가-힣_-]+$');

-- 4. 기존 사용자들을 위한 임시 username 생성 (선택사항)
-- 실행하기 전에 기존 데이터 백업 권장
-- UPDATE profiles SET username = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9가-힣]', '', 'g'))
-- WHERE username IS NULL AND char_length(REGEXP_REPLACE(name, '[^a-zA-Z0-9가-힣]', '', 'g')) >= 3;

-- 5. Row Level Security 정책 업데이트 (기존 정책 유지)
-- profiles 테이블의 기존 RLS 정책들은 그대로 유지됩니다.

-- =============================================================================
-- 롤백 스크립트 (필요시 사용)
-- =============================================================================

-- DROP INDEX IF EXISTS idx_profiles_username;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_format_check;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_length_check;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS username;

-- =============================================================================
-- 검증 쿼리들
-- =============================================================================

-- 스키마 확인
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public';

-- 제약 조건 확인
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.profiles'::regclass;

-- 인덱스 확인
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles' AND schemaname = 'public';