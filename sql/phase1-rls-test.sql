-- TeamBalance Phase 1: RLS 정책 테스트 및 검증
-- 작성일: 2025-01-03
-- 목적: RLS 정책이 올바르게 작동하는지 검증

-- =================================================================
-- 1. RLS 활성화 상태 확인
-- =================================================================

-- 모든 테이블의 RLS 활성화 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS 활성화",
  CASE 
    WHEN rowsecurity THEN '✅ 활성화됨'
    ELSE '❌ 비활성화됨'
  END as "상태"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members')
ORDER BY tablename;

-- =================================================================
-- 2. 생성된 RLS 정책 확인
-- =================================================================

-- 모든 RLS 정책 목록 확인
SELECT 
  tablename as "테이블",
  policyname as "정책명",
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'  
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE cmd::text
  END as "작업",
  permissive as "허용형",
  array_to_string(roles, ', ') as "역할"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =================================================================
-- 3. 테이블별 정책 상세 확인
-- =================================================================

-- profiles 테이블 정책 확인
SELECT 
  '=== PROFILES 테이블 ===' as info,
  policyname as "정책명",
  cmd::text as "작업",
  qual as "조건",
  with_check as "생성조건"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'

UNION ALL

-- teams 테이블 정책 확인  
SELECT 
  '=== TEAMS 테이블 ===' as info,
  policyname,
  cmd::text,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'teams'

UNION ALL

-- team_members 테이블 정책 확인
SELECT 
  '=== TEAM_MEMBERS 테이블 ===' as info,
  policyname,
  cmd::text,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'team_members'

ORDER BY info, "정책명";

-- =================================================================
-- 4. RLS 정책 개수 확인
-- =================================================================

-- 테이블별 정책 개수 통계
SELECT 
  tablename as "테이블",
  COUNT(*) as "정책 개수",
  STRING_AGG(
    CASE cmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE' 
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE cmd::text
    END, ', '
  ) as "적용된 작업"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members')
GROUP BY tablename
ORDER BY tablename;

-- =================================================================
-- 5. RLS 정책 효과 시뮬레이션
-- =================================================================

-- 다음 테스트들은 실제 데이터가 있을 때 실행 가능합니다:

/*
-- 테스트 1: 자신의 프로필만 조회 가능한지 확인
-- (실제 사용자 세션에서 실행)
SELECT 
  '프로필 조회 테스트' as test_name,
  id,
  email,
  name
FROM profiles
WHERE id = auth.uid();  -- 자신의 프로필만 조회되어야 함

-- 테스트 2: 공개 팀만 조회 가능한지 확인  
SELECT 
  '공개 팀 조회 테스트' as test_name,
  id,
  name,
  is_public
FROM teams
WHERE is_public = true;  -- 공개 팀만 조회되어야 함

-- 테스트 3: 자신이 속한 팀의 멤버만 조회 가능한지 확인
SELECT 
  '팀 멤버 조회 테스트' as test_name,
  tm.id,
  tm.nickname,
  tm.tier,
  t.name as team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = auth.uid();  -- 자신이 속한 팀만 조회되어야 함
*/

-- =================================================================
-- 6. 잠재적 보안 이슈 확인
-- =================================================================

-- RLS가 비활성화된 테이블 확인
SELECT 
  '⚠️ RLS 비활성화된 테이블' as warning,
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
  AND tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members');

-- 정책이 없는 테이블 확인
SELECT 
  '⚠️ 정책이 없는 테이블' as warning,
  t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members')
  AND p.policyname IS NULL;

-- =================================================================  
-- 7. RLS 정책 성공 기준
-- =================================================================

/*
✅ 성공 기준:
1. 모든 주요 테이블에 RLS가 활성화되어야 함 (rowsecurity = true)
2. 각 테이블마다 최소 SELECT, INSERT, UPDATE, DELETE 정책이 있어야 함
3. 모든 정책이 auth.uid() 기반으로 사용자를 식별해야 함
4. 팀 기반 접근 제어가 올바르게 구현되어야 함
5. 익명 사용자 접근이 차단되어야 함

❌ 실패 조건:
1. RLS가 비활성화된 테이블이 있음
2. 정책이 없는 테이블이 있음
3. 정책 조건이 너무 관대함 (예: true 조건)
4. 인증되지 않은 접근이 허용됨
*/