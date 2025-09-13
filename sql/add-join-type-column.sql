-- team_members 테이블에 join_type 컬럼 추가
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS join_type TEXT CHECK (join_type IN ('public', 'invite')) DEFAULT 'public';

-- 기존 레코드들의 join_type을 'public'으로 설정
UPDATE team_members 
SET join_type = 'public' 
WHERE join_type IS NULL;

-- 인덱스 추가 (선택적)
CREATE INDEX IF NOT EXISTS idx_team_members_join_type ON team_members(join_type);