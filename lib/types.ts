// 사용자 및 인증 관련 타입
export interface User {
  id: string
  email: string
  name: string
  username?: string  // 게이머 닉네임 (선택사항, 3-20자, 영문/한글/숫자/_/- 허용)
  avatar?: string
  provider: 'kakao' | 'naver' | 'google'
  createdAt: Date
}

// 팀 관련 타입
export interface Team {
  id: string
  name: string
  leaderId: string
  createdAt: Date
  memberCount: number
  isPublic: boolean
  description?: string
}

// 팀 멤버 타입
export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'leader' | 'member'
  joinedAt: Date
  nickname: string
  tier: TierType
  mainPosition: Position
  subPositions: Position[] // 다중 부포지션 (최대 4개)
  stats: MemberStats
  // 승인 시스템 추가
  status: 'pending' | 'active' | 'rejected' | 'kicked'
  joinType: 'invite' | 'public'
  approvedBy?: string
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
}

// LoL 티어 타입
export type TierType = 
  | 'iron_iv' | 'iron_iii' | 'iron_ii' | 'iron_i'
  | 'bronze_iv' | 'bronze_iii' | 'bronze_ii' | 'bronze_i'
  | 'silver_iv' | 'silver_iii' | 'silver_ii' | 'silver_i'
  | 'gold_iv' | 'gold_iii' | 'gold_ii' | 'gold_i'
  | 'platinum_iv' | 'platinum_iii' | 'platinum_ii' | 'platinum_i'
  | 'emerald_iv' | 'emerald_iii' | 'emerald_ii' | 'emerald_i'
  | 'diamond_iv' | 'diamond_iii' | 'diamond_ii' | 'diamond_i'
  | 'master' | 'grandmaster' | 'challenger'

// LoL 포지션 타입
export type Position = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

// 포지션 선호도 레벨
export type PositionLevel = 'main' | 'sub1' | 'sub2' | 'sub3' | 'sub4'

// 포지션 선호도 정보
export interface PositionPreference {
  position: Position
  level: PositionLevel
  skillWeight: number // 100%, 80%, 70%, 60%, 50%
}

// 플레이어의 모든 포지션 선호도
export interface PlayerPositions {
  mainPosition: Position
  subPositions: Position[]
  getAllPositions(): PositionPreference[]
  canPlay(position: Position): boolean
  getSkillWeight(position: Position): number
}

// 멤버 통계 타입
export interface MemberStats {
  totalWins: number
  totalLosses: number
  mainPositionGames: number
  mainPositionWins: number
  subPositionGames: number
  subPositionWins: number
  tierScore: number
  mvpCount: number        // MVP 획득 횟수
  currentStreak: number   // 현재 연승/연패 (양수: 연승, 음수: 연패)
}

// 인증 상태 타입
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 폼 데이터 타입들
export interface LoginFormData {
  provider: 'kakao' | 'naver' | 'google'
}

// 하이브리드 로그인 폼 데이터
export interface HybridLoginFormData {
  loginId: string      // 이메일 또는 닉네임
  password: string
}

// 회원가입 폼 데이터 (닉네임 포함)
export interface SignUpFormData {
  email: string
  password: string
  name: string
  username?: string    // 선택적 게이머 닉네임
}

export interface CreateTeamFormData {
  name: string
  description?: string
  isPublic: boolean
}

// 팀 초대 관련 타입
export interface TeamInvite {
  id: string
  teamId: string
  createdBy: string
  inviteCode: string
  expiresAt: Date
  createdAt: Date
  maxUses?: number
  currentUses: number
  isActive: boolean
}

export interface InviteLink {
  inviteCode: string
  teamName: string
  teamDescription?: string
  inviterName: string
  expiresAt: Date
}

export interface JoinTeamFormData {
  teamName?: string
  teamId?: string
}

export interface MemberProfileFormData {
  nickname: string
  tier: TierType
  mainPosition: Position
  subPositions: Position[] // 다중 부포지션
}

// 경기 및 세션 관련 타입
export interface Session {
  id: string
  teamId: string
  createdBy: string
  selectedMembers: string[] // member IDs selected for session
  participants: string[] // member IDs
  team1: SessionTeam
  team2: SessionTeam
  balancingMethod: 'smart' | 'random'
  status: 'preparing' | 'playing' | 'finished'
  createdAt: Date
}

export interface SessionTeam {
  members: SessionMember[]
  color: 'blue' | 'red'
}

export interface SessionMember {
  memberId: string
  position: Position
  nickname: string
  champion?: string
  kills?: number
  deaths?: number
  assists?: number
}

export interface Match {
  id: string
  sessionId: string
  team1: MatchTeamResult
  team2: MatchTeamResult
  winner: 'team1' | 'team2'
  mvpMemberId?: string  // 승리팀 MVP 멤버 ID
  createdAt: Date
}

export interface MatchTeamResult {
  members: MatchMemberResult[]
}

export interface MatchMemberResult {
  memberId: string
  position: Position
  champion: string
  kills: number
  deaths: number
  assists: number
}

// ============================================================================
// 포지션 관련 유틸리티 클래스 및 함수들
// ============================================================================

// 포지션 스킬 가중치 계산 함수 (주포지션/부포지션 동일)
export const getPositionSkillWeight = (level: PositionLevel): number => {
  const weights = {
    main: 1.0,   // 100% (주포지션)
    sub1: 1.0,   // 100% (부포지션도 동일)
    sub2: 1.0,   // 100%
    sub3: 1.0,   // 100%
    sub4: 1.0    // 100%
  }
  return weights[level] || 0
}

// TeamMember에서 포지션 정보 추출하는 헬퍼 함수들
export const getMemberPositionPreferences = (member: TeamMember): PositionPreference[] => {
  const preferences: PositionPreference[] = [
    {
      position: member.mainPosition,
      level: 'main',
      skillWeight: getPositionSkillWeight('main')
    }
  ]
  
  member.subPositions.forEach((position, index) => {
    const level = `sub${index + 1}` as PositionLevel
    preferences.push({
      position,
      level,
      skillWeight: getPositionSkillWeight(level)
    })
  })
  
  return preferences
}

export const canMemberPlay = (member: TeamMember, position: Position): boolean => {
  return member.mainPosition === position || member.subPositions.includes(position)
}

export const getMemberSkillWeight = (member: TeamMember, position: Position): number => {
  if (member.mainPosition === position) {
    return getPositionSkillWeight('main')
  }
  
  const subIndex = member.subPositions.indexOf(position)
  if (subIndex >= 0) {
    const level = `sub${subIndex + 1}` as PositionLevel
    return getPositionSkillWeight(level)
  }
  
  return 0 // 해당 포지션을 플레이할 수 없음
}