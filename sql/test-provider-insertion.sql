-- TeamBalance: Provider 삽입 테스트
-- 작성일: 2025-01-03
-- 목적: 수동으로 provider 값이 올바르게 삽입되는지 테스트

-- 테스트용 임시 사용자 ID 생성
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
    test_name TEXT := '테스트사용자';
    test_provider TEXT := 'email';
BEGIN
    RAISE LOG 'Starting manual profile insertion test';
    RAISE LOG 'Test values - ID: %, Email: %, Name: %, Provider: %', 
        test_id, test_email, test_name, test_provider;
    
    -- 직접 프로필 삽입 테스트
    INSERT INTO profiles (id, email, name, provider, username)
    VALUES (test_id, test_email, test_name, test_provider, NULL);
    
    RAISE LOG 'Manual insertion successful';
    
    -- 삽입된 데이터 확인
    DECLARE
        inserted_provider TEXT;
    BEGIN
        SELECT provider INTO inserted_provider FROM profiles WHERE id = test_id;
        RAISE LOG 'Inserted provider value: %', inserted_provider;
        
        -- 테스트 데이터 정리
        DELETE FROM profiles WHERE id = test_id;
        RAISE LOG 'Test data cleaned up';
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Manual insertion failed - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
END;
$$;