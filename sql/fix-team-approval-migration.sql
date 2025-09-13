-- =============================================================================
-- 팀 참가 승인 시스템 트리거 수정
-- 목적: team_notifications 테이블 의존성 제거
-- =============================================================================

-- 1. 기존 트리거와 함수 제거
DROP TRIGGER IF EXISTS on_team_member_request ON team_members;
DROP FUNCTION IF EXISTS notify_team_leader_new_request();

-- 2. 수정된 알림 함수 (team_notifications 테이블 없이 작동)
CREATE OR REPLACE FUNCTION notify_team_leader_new_request() 
RETURNS TRIGGER AS $$
BEGIN
    -- 새로운 승인 대기 요청이 있을 때 로그만 남기기 (실제 알림은 나중에 구현)
    IF NEW.status = 'pending' THEN
        -- 현재는 로그만 출력하고 향후 확장 가능하도록 구조 유지
        RAISE NOTICE '새로운 팀 참가 요청: team_id=%, user_id=%', NEW.team_id, NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 수정된 트리거 다시 생성
CREATE OR REPLACE TRIGGER on_team_member_request
    AFTER INSERT ON team_members
    FOR EACH ROW 
    WHEN (NEW.status = 'pending')
    EXECUTE PROCEDURE notify_team_leader_new_request();

-- =============================================================================
-- 추가: team_members 테이블의 필수 컬럼들이 있는지 확인
-- =============================================================================

-- status 컬럼이 없다면 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'status') THEN
        ALTER TABLE team_members 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('pending', 'active', 'rejected', 'kicked'));
    END IF;
END $$;

-- join_type 컬럼이 없다면 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'join_type') THEN
        ALTER TABLE team_members 
        ADD COLUMN join_type VARCHAR(20) DEFAULT 'public' 
        CHECK (join_type IN ('invite', 'public'));
    END IF;
END $$;

-- approved_by 컬럼이 없다면 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_by') THEN
        ALTER TABLE team_members 
        ADD COLUMN approved_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- approved_at 컬럼이 없다면 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_at') THEN
        ALTER TABLE team_members 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 기존 데이터 업데이트 (status가 NULL인 경우)
UPDATE team_members 
SET status = 'active', join_type = 'public' 
WHERE status IS NULL OR join_type IS NULL;

-- 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_members_pending ON team_members(team_id) WHERE status = 'pending';

-- =============================================================================
-- 검증 쿼리
-- =============================================================================

-- 스키마 확인 쿼리를 주석으로 제공
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'team_members' AND table_schema = 'public'
-- ORDER BY ordinal_position;