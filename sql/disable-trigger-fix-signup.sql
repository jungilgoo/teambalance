-- TeamBalance: 트리거 비활성화 및 수동 프로필 생성으로 전환
-- 작성일: 2025-01-03
-- 목적: raw_user_meta_data 접근 문제 해결을 위해 트리거를 비활성화하고 수동 생성 방식 사용

BEGIN;

-- 1. 기존 트리거 비활성화 (삭제하지 않고 비활성화)
ALTER TABLE auth.users DISABLE TRIGGER create_profile_trigger;

-- 또는 완전히 제거할 경우:
-- DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- 2. 트리거 함수도 백업 후 제거 (선택사항)
-- DROP FUNCTION IF EXISTS create_profile_for_user();

-- 3. insert_profile_manually 함수 최적화
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
  
  -- 성공 로깅
  RAISE LOG 'Profile manually created - ID: %, Email: %, Provider: %', p_id, p_email, p_provider;
  
EXCEPTION 
  WHEN unique_violation THEN
    RAISE LOG 'Profile already exists for user: %', p_id;
    -- 이미 존재하는 경우 오류가 아닌 정상 처리
    RETURN;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile insertion failed: % - %', SQLSTATE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 함수 권한 설정
REVOKE ALL ON FUNCTION insert_profile_manually FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_profile_manually TO authenticated;
GRANT EXECUTE ON FUNCTION insert_profile_manually TO anon;  -- 회원가입 시에도 실행 가능하도록

COMMIT;