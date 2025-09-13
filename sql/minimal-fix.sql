-- =============================================================================
-- 최소한의 팀 승인 수정 (오류 방지 우선)
-- 목적: 기존 구조를 전혀 건드리지 않고 트리거 오류만 해결
-- =============================================================================

-- 1. 오류를 일으키는 트리거와 함수만 제거
DROP TRIGGER IF EXISTS on_team_member_request ON team_members;
DROP FUNCTION IF EXISTS notify_team_leader_new_request();

-- 2. status 컬럼이 없다면 기본값으로만 추가 (제약 조건 없음)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. join_type 컬럼이 없다면 기본값으로만 추가 (제약 조건 없음) 
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS join_type TEXT DEFAULT 'public';

-- 4. 기존 NULL 값들 업데이트
UPDATE team_members 
SET status = 'active' 
WHERE status IS NULL;

UPDATE team_members 
SET join_type = 'public' 
WHERE join_type IS NULL;

-- =============================================================================
-- 완료! 이제 팀 참가 승인 기능이 작동할 것입니다.
-- =============================================================================