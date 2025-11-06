-- ============================================================================
-- Team Balance 데이터베이스 스키마
-- ============================================================================

-- 1. profiles 테이블 (auth.users 확장)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    birth_date DATE, -- 비밀번호 찾기용 생년월일 (신규 가입자는 필수, 기존 사용자는 선택)
    avatar_url TEXT,
    provider TEXT CHECK (provider IN ('email')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. teams 테이블
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    leader_id UUID REFERENCES profiles(id) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 1 CHECK (member_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. team_members 테이블 (가장 복잡한 테이블)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('leader', 'member')) DEFAULT 'member',
    nickname TEXT NOT NULL,
    tier TEXT NOT NULL,
    main_position TEXT CHECK (main_position IN ('top', 'jungle', 'mid', 'adc', 'support')) NOT NULL,
    sub_positions TEXT[] DEFAULT ARRAY['support'], -- 다중 부포지션 지원
    
    -- 승인 시스템
    status TEXT CHECK (status IN ('pending', 'active', 'rejected', 'kicked')) DEFAULT 'active',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    
    -- 통계 컬럼들 (성능 최적화를 위한 비정규화)
    total_wins INTEGER DEFAULT 0 CHECK (total_wins >= 0),
    total_losses INTEGER DEFAULT 0 CHECK (total_losses >= 0),
    main_position_games INTEGER DEFAULT 0 CHECK (main_position_games >= 0),
    main_position_wins INTEGER DEFAULT 0 CHECK (main_position_wins >= 0),
    sub_position_games INTEGER DEFAULT 0 CHECK (sub_position_games >= 0),
    sub_position_wins INTEGER DEFAULT 0 CHECK (sub_position_wins >= 0),
    tier_score INTEGER DEFAULT 1000 CHECK (tier_score >= 0),
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    UNIQUE(team_id, user_id), -- 한 팀에 한 번만 참가 가능
    CHECK (main_position != ALL(sub_positions)) -- 주 포지션이 부포지션 배열에 포함되지 않도록
);


-- 4. sessions 테이블
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    status TEXT CHECK (status IN ('preparing', 'in_progress', 'completed')) DEFAULT 'preparing',
    selected_members JSONB, -- 선택된 멤버들의 ID 배열
    team1_members JSONB,    -- 팀1 구성원 상세 정보
    team2_members JSONB,    -- 팀2 구성원 상세 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. matches 테이블
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    winner TEXT CHECK (winner IN ('team1', 'team2')) NOT NULL,
    mvp_member_id UUID REFERENCES team_members(id), -- MVP 멤버 ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. match_members 테이블
CREATE TABLE IF NOT EXISTS match_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    team_member_id UUID REFERENCES team_members(id) NOT NULL,
    team_side TEXT CHECK (team_side IN ('team1', 'team2')) NOT NULL,
    position TEXT CHECK (position IN ('top', 'jungle', 'mid', 'adc', 'support')) NOT NULL,
    champion TEXT NOT NULL,
    kills INTEGER DEFAULT 0 CHECK (kills >= 0),
    deaths INTEGER DEFAULT 0 CHECK (deaths >= 0),
    assists INTEGER DEFAULT 0 CHECK (assists >= 0)
);

-- ============================================================================
-- 인덱스 생성 (성능 최적화)
-- ============================================================================

-- teams 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_public ON teams(is_public);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);

-- team_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_tier_score ON team_members(tier_score DESC);


-- sessions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_team_id ON sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);

-- matches 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_matches_session_id ON matches(session_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_mvp_member_id ON matches(mvp_member_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- match_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_match_members_match_id ON match_members(match_id);
CREATE INDEX IF NOT EXISTS idx_match_members_team_member_id ON match_members(team_member_id);

-- ============================================================================
-- 트리거 함수 정의 (비즈니스 로직 자동화)
-- ============================================================================

-- 새 사용자 프로필 자동 생성
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name, provider)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auth.users에 새 레코드가 생성될 때 프로필 자동 생성
CREATE OR REPLACE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- 팀 멤버 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE teams 
        SET member_count = member_count + 1 
        WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE teams 
        SET member_count = member_count - 1 
        WHERE id = OLD.team_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- team_members 테이블에 INSERT/DELETE 시 팀 멤버 수 자동 업데이트
CREATE OR REPLACE TRIGGER team_member_count_trigger
    AFTER INSERT OR DELETE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_member_count();

-- ============================================================================
-- 라이트 보안: RLS 비활성화 (1인 개발자 친화적)
-- ============================================================================
-- Supabase 기본 인증만 사용하여 복잡도 최소화

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이 스키마를 Supabase SQL 에디터에서 실행하면 모든 테이블이 생성됩니다.
-- RLS 없이 Supabase 기본 인증만 사용하여 1인 개발자 친화적으로 설계됨.