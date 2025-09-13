-- =============================================================================
-- 안전한 팀 승인 시스템 수정 (기존 뷰 보존)
-- 목적: 기존 구조를 건드리지 않고 필요한 기능만 추가
-- =============================================================================

-- 1. 기존 문제가 되는 트리거와 함수만 제거
DROP TRIGGER IF EXISTS on_team_member_request ON team_members;
DROP FUNCTION IF EXISTS notify_team_leader_new_request();

-- 2. 기존 뷰들 확인 및 임시 제거 (있을 경우)
DROP VIEW IF EXISTS team_member_stats CASCADE;

-- 3. team_members 테이블에 필요한 컬럼들 안전하게 추가
-- status 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE team_members ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE team_members ADD CONSTRAINT team_members_status_check 
            CHECK (status IN ('pending', 'active', 'rejected', 'kicked'));
    END IF;
END $$;

-- join_type 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'join_type' AND table_schema = 'public') THEN
        ALTER TABLE team_members ADD COLUMN join_type VARCHAR(20) DEFAULT 'public';
        ALTER TABLE team_members ADD CONSTRAINT team_members_join_type_check 
            CHECK (join_type IN ('invite', 'public'));
    END IF;
END $$;

-- approved_by 컬럼 추가 (선택적)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_by' AND table_schema = 'public') THEN
        ALTER TABLE team_members ADD COLUMN approved_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- approved_at 컬럼 추가 (선택적)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_at' AND table_schema = 'public') THEN
        ALTER TABLE team_members ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. 기존 데이터 안전하게 업데이트
UPDATE team_members 
SET status = 'active', join_type = 'public' 
WHERE status IS NULL OR join_type IS NULL;

-- 5. 성능 인덱스 생성 (있을 경우 무시)
DO $$
BEGIN
    -- status 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_status') THEN
        CREATE INDEX idx_team_members_status ON team_members(team_id, status);
    END IF;
    
    -- pending 상태만 인덱스
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_pending') THEN
        CREATE INDEX idx_team_members_pending ON team_members(team_id) WHERE status = 'pending';
    END IF;
END $$;

-- 6. 뷰 재생성 (기본 통계용)
CREATE OR REPLACE VIEW team_member_stats AS
SELECT 
    team_id,
    COUNT(*) FILTER (WHERE status = 'active') as active_members,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) as total_requests
FROM team_members 
GROUP BY team_id;

-- =============================================================================
-- 검증 쿼리 (주석 해제해서 확인 가능)
-- =============================================================================

-- 컬럼 확인
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'team_members' AND table_schema = 'public'
-- AND column_name IN ('status', 'join_type', 'approved_by', 'approved_at')
-- ORDER BY column_name;

-- 데이터 확인  
-- SELECT 
--     status, 
--     join_type, 
--     COUNT(*) as count,
--     MIN(created_at) as first_created,
--     MAX(created_at) as last_created
-- FROM team_members 
-- GROUP BY status, join_type 
-- ORDER BY status, join_type;

-- 뷰 확인
-- SELECT * FROM team_member_stats ORDER BY active_members DESC LIMIT 5;