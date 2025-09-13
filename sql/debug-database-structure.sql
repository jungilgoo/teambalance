-- TeamBalance: 데이터베이스 실제 구조 확인 및 디버깅
-- 작성일: 2025-01-03
-- 목적: provider null 문제의 근본 원인 파악

-- 1. profiles 테이블의 실제 컬럼 순서와 구조 확인
SELECT 
    column_name, 
    ordinal_position, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 제약조건 확인
SELECT 
    conname, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- 3. 트리거 함수 현재 상태 확인
SELECT 
    proname, 
    prosrc
FROM pg_proc 
WHERE proname = 'create_profile_for_user';

-- 4. 트리거 확인
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 5. 최근 프로필 데이터 확인 (null provider 확인)
SELECT id, email, name, provider, username, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';