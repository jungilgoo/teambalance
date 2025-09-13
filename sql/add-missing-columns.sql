-- ============================================================================
-- 누락된 컬럼 추가 스크립트
-- ============================================================================
-- 기존 데이터베이스에 누락된 컬럼들을 안전하게 추가합니다.

-- 1. team_members 테이블에 status 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'status') THEN
        ALTER TABLE team_members 
        ADD COLUMN status TEXT CHECK (status IN ('pending', 'active', 'rejected', 'kicked')) DEFAULT 'active';
        
        -- 기존 데이터를 모두 'active' 상태로 설정
        UPDATE team_members SET status = 'active' WHERE status IS NULL;
        
        RAISE NOTICE 'team_members.status 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'team_members.status 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 2. team_members 테이블에 approved_at 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_at') THEN
        ALTER TABLE team_members 
        ADD COLUMN approved_at TIMESTAMPTZ;
        
        -- 기존 active 멤버들은 가입일을 승인일로 설정
        UPDATE team_members 
        SET approved_at = joined_at 
        WHERE status = 'active' AND approved_at IS NULL;
        
        RAISE NOTICE 'team_members.approved_at 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'team_members.approved_at 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 3. team_members 테이블에 approved_by 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'approved_by') THEN
        ALTER TABLE team_members 
        ADD COLUMN approved_by UUID REFERENCES profiles(id);
        
        RAISE NOTICE 'team_members.approved_by 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'team_members.approved_by 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 4. matches 테이블에 mvp_member_id 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'matches' AND column_name = 'mvp_member_id') THEN
        ALTER TABLE matches 
        ADD COLUMN mvp_member_id UUID REFERENCES team_members(id);
        
        RAISE NOTICE 'matches.mvp_member_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'matches.mvp_member_id 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_matches_mvp_member_id ON matches(mvp_member_id);

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이 스크립트를 실행하면 누락된 컬럼들이 안전하게 추가됩니다.
-- 기존 데이터는 보존되며, 새로운 컬럼에는 적절한 기본값이 설정됩니다.