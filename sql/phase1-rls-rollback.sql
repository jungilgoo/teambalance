-- TeamBalance Phase 1: RLS 정책 롤백 스크립트
-- 작성일: 2025-01-03
-- 목적: RLS 정책 적용 중 문제 발생 시 안전하게 되돌리기
-- ⚠️ 주의: 이 스크립트는 비상시에만 사용하세요!

BEGIN;

-- =================================================================
-- ⚠️ 경고: RLS 정책 완전 제거 
-- =================================================================

-- 이 스크립트는 모든 RLS 정책을 제거하고 RLS를 비활성화합니다.
-- 프로덕션 환경에서는 절대 사용하지 마세요!

-- =================================================================
-- 1. 모든 RLS 정책 제거
-- =================================================================

-- profiles 테이블 정책 제거
DROP POLICY IF EXISTS "사용자는 자신의 프로필만 조회 가능" ON profiles;
DROP POLICY IF EXISTS "사용자는 자신의 프로필만 수정 가능" ON profiles;
DROP POLICY IF EXISTS "인증된 사용자는 프로필 생성 가능" ON profiles;
DROP POLICY IF EXISTS "사용자는 자신의 프로필만 삭제 가능" ON profiles;
DROP POLICY IF EXISTS "익명 사용자 접근 차단" ON profiles;

-- teams 테이블 정책 제거
DROP POLICY IF EXISTS "팀 조회 권한" ON teams;
DROP POLICY IF EXISTS "인증된 사용자는 팀 생성 가능" ON teams;
DROP POLICY IF EXISTS "팀 리더만 팀 수정 가능" ON teams;
DROP POLICY IF EXISTS "팀 리더만 팀 삭제 가능" ON teams;

-- team_members 테이블 정책 제거
DROP POLICY IF EXISTS "같은 팀 멤버들끼리 조회 가능" ON team_members;
DROP POLICY IF EXISTS "팀 멤버 추가 권한" ON team_members;
DROP POLICY IF EXISTS "팀 멤버 수정 권한" ON team_members;
DROP POLICY IF EXISTS "팀 멤버 제거 권한" ON team_members;

-- team_invites 테이블 정책 제거
DROP POLICY IF EXISTS "팀 멤버만 초대 정보 조회 가능" ON team_invites;
DROP POLICY IF EXISTS "팀 멤버만 초대 생성 가능" ON team_invites;
DROP POLICY IF EXISTS "초대 수정 권한" ON team_invites;
DROP POLICY IF EXISTS "초대 삭제 권한" ON team_invites;

-- sessions 테이블 정책 제거
DROP POLICY IF EXISTS "팀 멤버만 세션 조회 가능" ON sessions;
DROP POLICY IF EXISTS "팀 멤버만 세션 생성 가능" ON sessions;
DROP POLICY IF EXISTS "세션 수정 권한" ON sessions;
DROP POLICY IF EXISTS "세션 삭제 권한" ON sessions;

-- matches 테이블 정책 제거
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 조회 가능" ON matches;
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 생성 가능" ON matches;
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 수정 가능" ON matches;
DROP POLICY IF EXISTS "팀 리더만 경기 삭제 가능" ON matches;

-- match_members 테이블 정책 제거
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 멤버 정보 조회 가능" ON match_members;
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 멤버 정보 생성 가능" ON match_members;
DROP POLICY IF EXISTS "관련 팀 멤버만 경기 멤버 정보 수정 가능" ON match_members;
DROP POLICY IF EXISTS "팀 리더만 경기 멤버 정보 삭제 가능" ON match_members;

-- =================================================================
-- 2. 모든 테이블 RLS 비활성화
-- =================================================================

-- ⚠️ 경고: 이렇게 하면 모든 데이터에 무제한 접근이 가능해집니다!
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_members DISABLE ROW LEVEL SECURITY;

COMMIT;

-- =================================================================
-- 3. 롤백 후 상태 확인
-- =================================================================

-- 롤백이 성공했는지 확인
SELECT 
  tablename as "테이블",
  rowsecurity as "RLS 활성화",
  CASE 
    WHEN rowsecurity THEN '❌ 여전히 활성화됨'
    ELSE '✅ 비활성화됨'
  END as "롤백 상태"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members')
ORDER BY tablename;

-- 남아있는 정책이 있는지 확인
SELECT 
  tablename as "테이블",
  COUNT(*) as "남은 정책 개수"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'teams', 'team_members', 'team_invites', 'sessions', 'matches', 'match_members')
GROUP BY tablename
ORDER BY tablename;

-- =================================================================
-- 4. 롤백 후 주의사항
-- =================================================================

/*
⚠️ 롤백 후 주의사항:

1. 모든 데이터에 무제한 접근이 가능해집니다
2. 프론트엔드 코드는 여전히 인증이 필요합니다
3. 이 상태는 개발/테스트 환경에서만 사용하세요
4. 가능한 빨리 RLS 정책을 다시 적용하세요

재적용 방법:
- phase1-rls-policies.sql 스크립트를 다시 실행하세요
*/