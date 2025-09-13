-- TeamBalance: 트리거 함수 디버깅 강화
-- 작성일: 2025-01-03
-- 목적: raw_user_meta_data에서 provider 값이 제대로 전달되지 않는 문제 해결

-- 기존 트리거 함수를 디버깅 버전으로 교체
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 디버깅 정보 로깅
    RAISE LOG 'Profile creation started for user_id: %', NEW.id;
    RAISE LOG 'User email: %', NEW.email;
    RAISE LOG 'Raw user meta data: %', NEW.raw_user_meta_data;
    RAISE LOG 'Provider from meta_data: %', NEW.raw_user_meta_data->>'provider';
    RAISE LOG 'Name from meta_data: %', NEW.raw_user_meta_data->>'name';
    
    -- 프로필 삽입 시도
    INSERT INTO profiles (id, email, name, provider, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
        COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),  -- 기본값: email
        NULL  -- username은 일단 null
    );
    
    RAISE LOG 'Profile created successfully for user_id: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Profile creation failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE LOG 'Failed insertion values - id: %, email: %, name: %, provider: %', 
            NEW.id, 
            NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
            COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
        RETURN NEW;  -- 사용자 생성은 계속 진행되도록
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 올바르게 연결되어 있는지 확인
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();