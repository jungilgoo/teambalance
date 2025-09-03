-- =============================================================================
-- 롤 내전 매니저: 하이브리드 팀 참가 승인 시스템 마이그레이션
-- 작성일: 2025-01-02
-- 목적: 팀 참가 승인/거절 기능 추가 (초대링크는 바로승인, 공개참가는 승인대기)
-- =============================================================================

-- 1. team_members 테이블에 status 컬럼 추가
ALTER TABLE team_members 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected', 'kicked'));

-- 2. 참가 방식을 구분하는 컬럼 추가 
ALTER TABLE team_members 
ADD COLUMN join_type VARCHAR(20) DEFAULT 'public' CHECK (join_type IN ('invite', 'public'));

-- 3. 승인/거절 관련 메타데이터
ALTER TABLE team_members 
ADD COLUMN approved_by UUID REFERENCES profiles(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT;

-- 4. 성능을 위한 인덱스 생성
CREATE INDEX idx_team_members_status ON team_members(team_id, status);
CREATE INDEX idx_team_members_pending ON team_members(team_id) WHERE status = 'pending';

-- 5. 기존 데이터를 'active' 상태로 설정 (이미 참가된 멤버들)
UPDATE team_members SET status = 'active', join_type = 'invite' WHERE status IS NULL;

-- 6. 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW team_member_stats AS
SELECT 
    team_id,
    COUNT(*) FILTER (WHERE status = 'active') as active_members,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
    COUNT(*) as total_requests
FROM team_members 
GROUP BY team_id;

-- =============================================================================
-- 승인 관련 함수들
-- =============================================================================

-- 자동 알림을 위한 함수 (향후 확장용)
CREATE OR REPLACE FUNCTION notify_team_leader_new_request() 
RETURNS TRIGGER AS $$
BEGIN
    -- 새로운 승인 대기 요청이 있을 때 로그 남기기
    IF NEW.status = 'pending' THEN
        INSERT INTO team_notifications (team_id, user_id, type, message, created_at)
        VALUES (
            NEW.team_id, 
            (SELECT leader_id FROM teams WHERE id = NEW.team_id),
            'member_request',
            '새로운 팀 참가 요청이 있습니다.',
            NOW()
        ) ON CONFLICT DO NOTHING; -- notifications 테이블이 없으면 무시
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성 (notifications 테이블 존재할 때만 작동)
CREATE OR REPLACE TRIGGER on_team_member_request
    AFTER INSERT ON team_members
    FOR EACH ROW 
    WHEN (NEW.status = 'pending')
    EXECUTE PROCEDURE notify_team_leader_new_request();

-- =============================================================================
-- 롤백 스크립트 (필요시 사용)
-- =============================================================================

-- DROP TRIGGER IF EXISTS on_team_member_request ON team_members;
-- DROP FUNCTION IF EXISTS notify_team_leader_new_request();
-- DROP VIEW IF EXISTS team_member_stats;
-- DROP INDEX IF EXISTS idx_team_members_pending;
-- DROP INDEX IF EXISTS idx_team_members_status;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS rejection_reason;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS rejected_at;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS join_type;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS status;

-- =============================================================================
-- 검증 쿼리들
-- =============================================================================

-- 스키마 확인
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'team_members' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 새 컬럼 확인
-- SELECT status, join_type, COUNT(*) 
-- FROM team_members 
-- GROUP BY status, join_type;

-- 팀별 상태 통계
-- SELECT * FROM team_member_stats ORDER BY active_members DESC;