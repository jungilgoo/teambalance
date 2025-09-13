-- ============================================================================
-- 글로벌 닉네임 기능을 위한 username 컬럼 설정
-- 작성일: 2025-01-15
-- 목적: 기존 profiles 테이블의 username 컬럼에 제약 조건 추가
-- ============================================================================

-- 1. username 컬럼이 이미 존재하므로 컬럼 추가는 생략
-- ALTER TABLE profiles ADD COLUMN username TEXT; -- 이미 존재함

-- 2. 기존 유니크 인덱스가 있는지 확인 후 생성 (중복 방지)
DO $$ 
BEGIN
    -- 기존 인덱스 확인 후 없으면 생성
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_profiles_username_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_profiles_username_unique 
        ON profiles(username) 
        WHERE username IS NOT NULL;
    END IF;
END $$;

-- 3. 기존 체크 제약 조건 확인 후 생성 (중복 방지)
DO $$ 
BEGIN
    -- 기존 제약 조건 확인 후 없으면 생성
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_username_format'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT chk_username_format 
        CHECK (
            username IS NULL OR (
                LENGTH(username) >= 2 AND 
                LENGTH(username) <= 20 AND
                username ~ '^[가-힣a-zA-Z0-9_-]+$'
            )
        );
    END IF;
END $$;

-- 4. 기존 사용자들을 위한 기본 username 설정 (선택사항)
-- 주의: 실제 운영에서는 사용자가 직접 설정하도록 하는 것이 좋음
-- UPDATE profiles 
-- SET username = LOWER(SUBSTRING(name, 1, 15)) || '_' || SUBSTRING(id::text, 1, 4)
-- WHERE username IS NULL;

-- 5. 기존 인덱스 확인 후 생성 (성능 최적화)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_profiles_username'
    ) THEN
        CREATE INDEX idx_profiles_username ON profiles(username);
    END IF;
END $$;

-- ============================================================================
-- 롤백 스크립트 (필요시 사용)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_profiles_username;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_username_format;
-- DROP INDEX IF EXISTS idx_profiles_username_unique;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS username;