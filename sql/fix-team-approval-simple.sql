-- =============================================================================
-- 간단한 팀 승인 시스템 수정 (기존 데이터베이스와 호환)
-- 목적: 최소한의 변경으로 팀 참가 승인 기능 작동
-- =============================================================================

-- 1. 기존 트리거와 함수 제거 (오류 방지)
DROP TRIGGER IF EXISTS on_team_member_request ON team_members;
DROP FUNCTION IF EXISTS notify_team_leader_new_request();

-- 2. team_members 테이블에 status 컬럼만 추가 (가장 중요)
DO $$
BEGIN
    -- status 컬럼 추가 (없을 경우에만)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'status') THEN
        ALTER TABLE team_members 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('pending', 'active', 'rejected', 'kicked'));
        
        -- 기존 데이터는 모두 'active'로 설정
        UPDATE team_members SET status = 'active' WHERE status IS NULL;
    END IF;

    -- join_type 컬럼 추가 (없을 경우에만)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'join_type') THEN
        ALTER TABLE team_members 
        ADD COLUMN join_type VARCHAR(20) DEFAULT 'public' 
        CHECK (join_type IN ('invite', 'public'));
        
        -- 기존 데이터는 모두 'public'으로 설정
        UPDATE team_members SET join_type = 'public' WHERE join_type IS NULL;
    END IF;
END $$;

-- 3. 성능을 위한 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_pending ON team_members(team_id) WHERE status = 'pending';

-- 4. 간단한 통계 뷰 (선택사항)
CREATE OR REPLACE VIEW team_member_stats AS
SELECT 
    team_id,
    COUNT(*) FILTER (WHERE status = 'active') as active_members,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) as total_requests
FROM team_members 
GROUP BY team_id;

-- =============================================================================
-- 검증
-- =============================================================================

-- 추가된 컬럼 확인
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'team_members' AND column_name IN ('status', 'join_type')
-- ORDER BY column_name;

-- 데이터 확인
-- SELECT status, join_type, COUNT(*) 
-- FROM team_members 
-- GROUP BY status, join_type;