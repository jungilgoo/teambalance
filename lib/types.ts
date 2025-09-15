// 사용자 및 인증 관련 타입
export interface User {
  id: string
  email: string
  name: string
  username?: string  // 게이머 닉네임 (선택사항, 3-20자, 영문/한글/숫자/_/- 허용)
  birthDate?: Date  // 생년월일 (비밀번호 찾기용, 신규 가입자는 필수)
  avatar?: string
  provider: 'email'  // 이메일/닉네임 하이브리드 로그인만 지원
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

// 팀 초대 타입
export interface TeamInvite {
  id: string
  teamId: string
  createdBy: string
  inviteCode: string
  expiresAt: Date
  maxUses?: number
  currentUses: number
  isActive: boolean
  createdAt: Date
}

// 세션 및 경기 관련 타입
export interface Session {
  id: string
  teamId: string
  createdBy: string
  status: 'preparing' | 'in_progress' | 'completed' | 'waiting' | 'cancelled'
  selectedMembers?: string[]
  team1Members?: string[]
  team2Members?: string[]
  startedAt?: Date
  completedAt?: Date
  result?: {
    winner: 'team1' | 'team2' | 'draw'
    team1Score: number
    team2Score: number
    mvp?: string
    notes?: string
  }
  createdAt: Date
}

export interface Match {
  id: string
  teamId: string
  winner: 'team1' | 'team2'
  team1: { members: MatchMember[] } // team1 멤버 정보 배열
  team2: { members: MatchMember[] } // team2 멤버 정보 배열
  mvpMemberId?: string
  createdAt: Date
}

export interface MatchMember {
  id: string
  matchId?: string
  memberId: string // 실제 사용되는 필드명
  teamMemberId?: string // 레거시 호환성
  teamSide?: 'team1' | 'team2'
  position: Position
  champion: string
  kills: number
  deaths: number
  assists: number
}

// 경기 결과 분석용 타입
export interface MatchMemberResult extends MatchMember {
  memberId: string
  nickname: string
  tier: TierType
  won: boolean
  kda: number
  scoreContribution: number
}

// 정렬 및 필터 타입
export type SortField = 'name' | 'tier' | 'winRate' | 'joinedAt'
export type SortOrder = 'asc' | 'desc'

export interface TableSort {
  field: SortField
  order: SortOrder
}

// 멤버 필터 타입
export interface MemberFilters {
  position?: Position
  tier?: string[]
  status?: TeamMember['status'][]
  searchQuery?: string
}

// 모달 상태 타입
export interface ModalState {
  isOpen: boolean
  data?: any
  onClose: () => void
}

// 폼 데이터 타입들
export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  name: string
  username?: string
}

export interface LoginFormData {
  loginId: string
  password: string
  rememberMe: boolean
}

export interface CreateTeamFormData {
  name: string
  description: string
  isPublic: boolean
}

export interface JoinTeamFormData {
  nickname: string
  tier: TierType
  mainPosition: Position
  subPositions: Position[]
}

export interface CreateSessionFormData {
  selectedMembers: string[]
}

// 에러 타입
export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

// 통계 및 분석 관련 타입
export interface TeamStats {
  totalGames: number
  totalWins: number
  averageTierScore: number
  mostPlayedPosition: Position
  topPerformers: TeamMember[]
  recentMatches: Match[]
}

export interface MemberPerformance {
  memberId: string
  nickname: string
  gamesPlayed: number
  winRate: number
  averageKDA: number
  favoriteChampions: string[]
  positionPerformance: Record<Position, {
    games: number
    wins: number
    averageKDA: number
  }>
}

// 실시간 업데이트 관련 타입
export interface RealtimeUpdate<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
  table: string
  commitTimestamp: string
}

// 페이지네이션 타입
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination
}

// 유틸리티 타입들
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// 환경변수 타입
export interface EnvironmentConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  nextAuthSecret: string
  isDevelopment: boolean
  isProduction: boolean
}

// 설정 타입
export interface AppConfig {
  teamMember: {
    maxCount: number
    minCount: number
  }
  session: {
    maxDuration: number // 시간 (hours)
    autoCompleteAfter: number // 시간 (hours)
  }
  match: {
    maxPlayersPerTeam: number
    requiredPositions: Position[]
  }
  invite: {
    defaultExpirationHours: number
    maxUses: number
  }
}

// 게임 밸런싱 관련 타입
export interface BalancingOptions {
  prioritizePositions: boolean
  considerTierScore: boolean
  considerWinRate: boolean
  allowPositionFlexibility: boolean
}

export interface TeamBalanceResult {
  team1: TeamMember[]
  team2: TeamMember[]
  balanceScore: number
  scoreDifference: number
  positionOptimal: boolean
  explanation: string
}

// 알림 관련 타입
export interface Notification {
  id: string
  userId: string
  type: 'invite' | 'match_result' | 'team_update' | 'system'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  data?: any // 알림과 관련된 추가 데이터
}

export interface NotificationSettings {
  matchResults: boolean
  teamInvites: boolean
  systemUpdates: boolean
  emailNotifications: boolean
}

// 팀 멤버 분석 및 밸런싱 유틸리티 함수들
export function canMemberPlay(member: TeamMember, position: Position): boolean {
  // 메인 포지션이거나 서브 포지션에 포함되어 있으면 플레이 가능
  return member.mainPosition === position || member.subPositions.includes(position)
}


export function getMemberPositionPreferences(member: TeamMember): Position[] {
  // 메인 포지션을 첫 번째로, 서브 포지션들을 그 뒤에
  return [member.mainPosition, ...member.subPositions]
}