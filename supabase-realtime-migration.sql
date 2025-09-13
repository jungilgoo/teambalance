-- TeamBalance Supabase Realtime 활성화 마이그레이션
-- Phase 2: 실시간 기능 구현을 위한 Realtime 설정

-- ============================================================================
-- Realtime Publication에 테이블 추가
-- ============================================================================

-- 팀 관련 실시간 업데이트
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;

-- 세션 및 경기 관련 실시간 업데이트
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- 초대 관련 실시간 업데이트 (가입 승인 시스템)
ALTER PUBLICATION supabase_realtime ADD TABLE team_invites;

-- ============================================================================
-- RLS 정책 확인 및 Realtime 호환성 검증
-- ============================================================================

-- 현재 RLS 정책들이 Realtime과 호환되는지 확인
-- teams 테이블: 팀 멤버만 접근 가능
-- team_members 테이블: 해당 팀 멤버만 접근 가능
-- sessions 테이블: 세션 참가자만 접근 가능
-- matches 테이블: 매치 참가자만 접근 가능
-- team_invites 테이블: 초대 관련자(팀 리더, 초대받은 사용자)만 접근 가능

-- ============================================================================
-- 실시간 함수 및 트리거 (선택적)
-- ============================================================================

-- 팀 멤버 수 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 팀 멤버가 추가되거나 상태가 변경될 때 팀의 member_count 업데이트
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE teams 
    SET member_count = (
      SELECT COUNT(*) 
      FROM team_members 
      WHERE team_id = NEW.team_id AND status = 'active'
    )
    WHERE id = NEW.team_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams 
    SET member_count = (
      SELECT COUNT(*) 
      FROM team_members 
      WHERE team_id = OLD.team_id AND status = 'active'
    )
    WHERE id = OLD.team_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON team_members;
CREATE TRIGGER trigger_update_team_member_count
  AFTER INSERT OR UPDATE OR DELETE
  ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- ============================================================================
-- 마이그레이션 실행 가이드
-- ============================================================================

/*
이 마이그레이션을 Supabase에서 실행하는 방법:

1. Supabase 대시보드 접속
2. SQL Editor로 이동
3. 위 SQL 스크립트 복사하여 실행
4. 실행 후 "Table Editor"에서 각 테이블의 Realtime이 활성화되었는지 확인

또는 Supabase CLI 사용:
```bash
supabase db push
```

확인 방법:
- Supabase 대시보드 → Database → Publications
- supabase_realtime publication에 teams, team_members, sessions, matches, team_invites가 포함되어 있는지 확인
*/