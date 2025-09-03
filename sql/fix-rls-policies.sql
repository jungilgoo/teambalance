-- RLS 정책 문제 해결을 위한 SQL

-- 1. 기존 profiles 정책들 확인
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. profiles 테이블에 대한 INSERT 권한 추가 (인증된 사용자)
DROP POLICY IF EXISTS "Anyone can create profile" ON profiles;
CREATE POLICY "Authenticated users can create profile" ON profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. profiles 업데이트 권한 추가
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. 트리거 함수 다시 생성 (안전하게)
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, provider)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
        COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- 이미 존재하는 경우 무시
        RETURN NEW;
    WHEN OTHERS THEN
        -- 다른 오류도 무시하고 계속 진행
        RETURN NEW;
END;
$$;

-- 5. 트리거 재생성
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- 6. 현재 정책들 다시 확인
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';