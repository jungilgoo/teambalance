-- TeamBalance: 수동 프로필 삽입을 위한 RPC 함수
-- 작성일: 2025-01-03
-- 목적: provider 제약조건 문제 해결을 위한 명시적 삽입 함수

-- 프로필 수동 삽입 함수
CREATE OR REPLACE FUNCTION insert_profile_manually(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT 'email',
  p_username TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- 명시적으로 컬럼 순서를 지정하여 삽입
  INSERT INTO profiles (id, email, name, avatar_url, provider, created_at, username)
  VALUES (
    p_id,
    p_email,
    p_name,
    p_avatar_url,
    p_provider,
    NOW(),
    p_username
  );
  
  -- 예외 발생 시 상세한 오류 정보 제공
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile insertion failed: % - %', SQLSTATE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수에 대한 RLS 정책 (인증된 사용자만 실행 가능)
REVOKE ALL ON FUNCTION insert_profile_manually FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_profile_manually TO authenticated;