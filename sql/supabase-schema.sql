-- ============================================================================
-- 롤내전매니저 데이터베이스 스키마
-- ============================================================================

-- 1. profiles 테이블 (auth.users 확장)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT CHECK (provider IN ('kakao', 'naver', 'google')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. teams 테이블
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    leader_id UUID REFERENCES profiles(id) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 1 CHECK (member_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. team_members 테이블 (가장 복잡한 테이블)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('leader', 'member')) DEFAULT 'member',
    nickname TEXT NOT NULL,
    tier TEXT NOT NULL,
    main_position TEXT CHECK (main_position IN ('top', 'jungle', 'mid', 'adc', 'support')) NOT NULL,
    sub_position TEXT CHECK (sub_position IN ('top', 'jungle', 'mid', 'adc', 'support')) NOT NULL,
    
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
    CHECK (main_position != sub_position) -- 주/부 포지션이 달라야 함
);

-- 4. team_invites 테이블
CREATE TABLE team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER CHECK (max_uses > 0),
    current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 제약 조건
    CHECK (expires_at > created_at),
    CHECK (max_uses IS NULL OR current_uses <= max_uses)
);

-- 5. sessions 테이블
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    status TEXT CHECK (status IN ('preparing', 'in_progress', 'completed')) DEFAULT 'preparing',
    selected_members JSONB, -- 선택된 멤버들의 ID 배열
    team1_members JSONB,    -- 팀1 구성원 상세 정보
    team2_members JSONB,    -- 팀2 구성원 상세 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. matches 테이블
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    winner TEXT CHECK (winner IN ('team1', 'team2')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. match_members 테이블
CREATE TABLE match_members (
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
CREATE INDEX idx_teams_leader_id ON teams(leader_id);
CREATE INDEX idx_teams_is_public ON teams(is_public);
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);

-- team_members 테이블 인덱스
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_tier_score ON team_members(tier_score DESC);

-- team_invites 테이블 인덱스
CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX idx_team_invites_active ON team_invites(is_active, expires_at);

-- sessions 테이블 인덱스
CREATE INDEX idx_sessions_team_id ON sessions(team_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

-- matches 테이블 인덱스
CREATE INDEX idx_matches_session_id ON matches(session_id);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- match_members 테이블 인덱스
CREATE INDEX idx_match_members_match_id ON match_members(match_id);
CREATE INDEX idx_match_members_team_member_id ON match_members(team_member_id);

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
        COALESCE(NEW.raw_user_meta_data->>'provider', 'google')
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
-- Row Level Security (RLS) 활성화
-- ============================================================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 기본 RLS 정책들
-- ============================================================================

-- profiles: 본인의 프로필은 모든 권한, 다른 사람은 읽기만
CREATE POLICY "Users can view their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles" ON profiles
    FOR SELECT USING (true);

-- teams: 공개 팀은 모든 사람이 읽기 가능, 팀장은 수정 가능
CREATE POLICY "Anyone can view public teams" ON teams
    FOR SELECT USING (is_public = true);

CREATE POLICY "Team leaders can manage their teams" ON teams
    FOR ALL USING (auth.uid() = leader_id);

-- team_members: 팀 멤버만 팀 정보 접근 가능
CREATE POLICY "Team members can view team member info" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join teams" ON team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership" ON team_members
    FOR UPDATE USING (auth.uid() = user_id);

-- team_invites: 팀 멤버만 초대 관리 가능
CREATE POLICY "Team members can manage invites" ON team_invites
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- sessions: 팀 멤버만 세션 접근 가능
CREATE POLICY "Team members can access sessions" ON sessions
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- matches: 팀 멤버만 경기 결과 접근 가능
CREATE POLICY "Team members can access matches" ON matches
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- match_members: 경기 참가자 정보는 같은 팀 멤버만 접근 가능
CREATE POLICY "Team members can access match member details" ON match_members
    FOR ALL USING (
        match_id IN (
            SELECT m.id FROM matches m
            INNER JOIN team_members tm ON m.team_id = tm.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이 스키마를 Supabase SQL 에디터에서 실행하면 모든 테이블과 정책이 생성됩니다.