-- TeamBalance Phase 1: Row Level Security (RLS) 정책 완전 구현
-- 작성일: 2025-01-03
-- 목적: 모든 테이블에 사용자별/팀별 데이터 접근 권한 구현

BEGIN;

-- =================================================================
-- 1. PROFILES 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "사용자는 자신의 프로필만 조회 가능" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "사용자는 자신의 프로필만 수정 가능" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- 새 사용자 프로필 생성 허용 (회원가입용)
CREATE POLICY "인증된 사용자는 프로필 생성 가능" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 사용자는 자신의 프로필만 삭제 가능
CREATE POLICY "사용자는 자신의 프로필만 삭제 가능" ON profiles 
  FOR DELETE USING (auth.uid() = id);

-- =================================================================
-- 2. TEAMS 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 공개 팀은 모든 사용자가 조회 가능, 비공개 팀은 멤버만 조회 가능
CREATE POLICY "팀 조회 권한" ON teams 
  FOR SELECT USING (
    is_public = true OR 
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = teams.id AND status = 'active'
    )
  );

-- 인증된 사용자는 새 팀 생성 가능
CREATE POLICY "인증된 사용자는 팀 생성 가능" ON teams 
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- 팀 리더만 팀 정보 수정 가능
CREATE POLICY "팀 리더만 팀 수정 가능" ON teams 
  FOR UPDATE USING (auth.uid() = leader_id);

-- 팀 리더만 팀 삭제 가능
CREATE POLICY "팀 리더만 팀 삭제 가능" ON teams 
  FOR DELETE USING (auth.uid() = leader_id);

-- =================================================================
-- 3. TEAM_MEMBERS 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 같은 팀 멤버들끼리만 조회 가능
CREATE POLICY "같은 팀 멤버들끼리 조회 가능" ON team_members 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM team_members tm 
      WHERE tm.team_id = team_members.team_id AND tm.status = 'active'
    )
  );

-- 팀 리더 또는 본인만 멤버 정보 추가 가능
CREATE POLICY "팀 멤버 추가 권한" ON team_members 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- 팀 리더 또는 본인만 멤버 정보 수정 가능
CREATE POLICY "팀 멤버 수정 권한" ON team_members 
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- 팀 리더 또는 본인만 멤버 제거 가능
CREATE POLICY "팀 멤버 제거 권한" ON team_members 
  FOR DELETE USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- =================================================================
-- 4. TEAM_INVITES 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- 같은 팀 멤버들만 초대 정보 조회 가능
CREATE POLICY "팀 멤버만 초대 정보 조회 가능" ON team_invites 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = team_invites.team_id AND status = 'active'
    )
  );

-- 팀 멤버만 초대 생성 가능
CREATE POLICY "팀 멤버만 초대 생성 가능" ON team_invites 
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = team_invites.team_id AND status = 'active'
    )
  );

-- 초대 생성자 또는 팀 리더만 초대 수정 가능
CREATE POLICY "초대 수정 권한" ON team_invites 
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- 초대 생성자 또는 팀 리더만 초대 삭제 가능
CREATE POLICY "초대 삭제 권한" ON team_invites 
  FOR DELETE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- =================================================================
-- 5. SESSIONS 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 같은 팀 멤버만 세션 조회 가능
CREATE POLICY "팀 멤버만 세션 조회 가능" ON sessions 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = sessions.team_id AND status = 'active'
    )
  );

-- 팀 멤버만 세션 생성 가능
CREATE POLICY "팀 멤버만 세션 생성 가능" ON sessions 
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = sessions.team_id AND status = 'active'
    )
  );

-- 세션 생성자 또는 팀 리더만 세션 수정 가능
CREATE POLICY "세션 수정 권한" ON sessions 
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- 세션 생성자 또는 팀 리더만 세션 삭제 가능
CREATE POLICY "세션 삭제 권한" ON sessions 
  FOR DELETE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- =================================================================
-- 6. MATCHES 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 관련 팀 멤버만 경기 조회 가능
CREATE POLICY "관련 팀 멤버만 경기 조회 가능" ON matches 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = matches.team_id AND status = 'active'
    )
  );

-- 관련 팀 멤버만 경기 생성 가능
CREATE POLICY "관련 팀 멤버만 경기 생성 가능" ON matches 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = matches.team_id AND status = 'active'
    )
  );

-- 관련 팀 멤버만 경기 수정 가능
CREATE POLICY "관련 팀 멤버만 경기 수정 가능" ON matches 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = matches.team_id AND status = 'active'
    )
  );

-- 팀 리더만 경기 삭제 가능
CREATE POLICY "팀 리더만 경기 삭제 가능" ON matches 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT leader_id FROM teams WHERE id = team_id
    )
  );

-- =================================================================
-- 7. MATCH_MEMBERS 테이블 RLS 정책
-- =================================================================

-- RLS 활성화
ALTER TABLE match_members ENABLE ROW LEVEL SECURITY;

-- 관련 팀 멤버만 경기 멤버 정보 조회 가능
CREATE POLICY "관련 팀 멤버만 경기 멤버 정보 조회 가능" ON match_members 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT tm.user_id FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE m.id = match_members.match_id AND tm.status = 'active'
    )
  );

-- 관련 팀 멤버만 경기 멤버 정보 생성 가능
CREATE POLICY "관련 팀 멤버만 경기 멤버 정보 생성 가능" ON match_members 
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT tm.user_id FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE m.id = match_members.match_id AND tm.status = 'active'
    )
  );

-- 관련 팀 멤버만 경기 멤버 정보 수정 가능
CREATE POLICY "관련 팀 멤버만 경기 멤버 정보 수정 가능" ON match_members 
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT tm.user_id FROM team_members tm
      JOIN matches m ON m.team_id = tm.team_id
      WHERE m.id = match_members.match_id AND tm.status = 'active'
    )
  );

-- 팀 리더만 경기 멤버 정보 삭제 가능
CREATE POLICY "팀 리더만 경기 멤버 정보 삭제 가능" ON match_members 
  FOR DELETE USING (
    auth.uid() IN (
      SELECT t.leader_id FROM teams t
      JOIN matches m ON m.team_id = t.id
      WHERE m.id = match_members.match_id
    )
  );

-- =================================================================
-- 8. 추가 보안 설정
-- =================================================================

-- 인증되지 않은 사용자의 접근을 완전히 차단
-- (기본적으로 모든 정책은 auth.uid()가 존재할 때만 작동)

-- 익명 사용자의 접근을 명시적으로 차단
DO $$
BEGIN
    -- 모든 테이블에 대해 익명 접근 차단 확인
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname LIKE '%익명%' AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "익명 사용자 접근 차단" ON profiles 
            FOR ALL TO anon USING (false);
    END IF;
END $$;

COMMIT;

-- =================================================================
-- 9. RLS 정책 검증 쿼리
-- =================================================================

-- 다음 쿼리들로 RLS 정책이 올바르게 적용되었는지 확인할 수 있습니다:

/*
-- 1. 모든 테이블의 RLS 활성화 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. 생성된 모든 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. 특정 테이블의 정책 상세 확인
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'teams';
*/