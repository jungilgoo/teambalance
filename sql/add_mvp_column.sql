-- matches 테이블에 mvp_member_id 컬럼 추가
ALTER TABLE matches 
ADD COLUMN mvp_member_id UUID REFERENCES team_members(id);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_matches_mvp_member_id ON matches(mvp_member_id);

-- 기존 데이터 확인 (선택사항)
-- SELECT COUNT(*) FROM matches;
-- SELECT COUNT(*) FROM matches WHERE mvp_member_id IS NOT NULL;