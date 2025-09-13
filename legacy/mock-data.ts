import { Team, TeamMember, User, TierType, Position, Match, TeamInvite } from '../lib/types'
import { calculateTierScore } from '../lib/stats'

// 임시 팀 데이터
export const mockTeams: Team[] = [
  {
    id: '1',
    name: '롤 내전 클럽',
    leaderId: '1',
    createdAt: new Date('2024-08-01'),
    memberCount: 10,
    isPublic: true,
    description: '친구들과 함께하는 즐거운 내전'
  },
  {
    id: '2',
    name: '다이아몬드 이상 내전',
    leaderId: '2',
    createdAt: new Date('2024-08-10'),
    memberCount: 12,
    isPublic: true,
    description: '고티어 유저들의 진지한 내전'
  }
]

// 임시 사용자 데이터
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'leader@kakao.com',
    name: '팀장홍길동',
    provider: 'kakao',
    createdAt: new Date('2024-07-15')
  },
  {
    id: '2',
    email: 'member1@naver.com',
    name: '김철수',
    provider: 'naver',
    createdAt: new Date('2024-07-20')
  },
  {
    id: '3',
    email: 'member2@google.com',
    name: '이영희',
    provider: 'google',
    createdAt: new Date('2024-07-25')
  },
  {
    id: '4',
    email: 'member3@kakao.com',
    name: '박민수',
    provider: 'kakao',
    createdAt: new Date('2024-08-01')
  },
  {
    id: '5',
    email: 'member4@naver.com',
    name: '정수연',
    provider: 'naver',
    createdAt: new Date('2024-08-05')
  },
  {
    id: '6',
    email: 'member5@google.com',
    name: '최마스터',
    provider: 'google',
    createdAt: new Date('2024-08-06')
  },
  {
    id: '7',
    email: 'member6@kakao.com',
    name: '신브론즈',
    provider: 'kakao',
    createdAt: new Date('2024-08-07')
  },
  {
    id: '8',
    email: 'member7@naver.com',
    name: '윤실버',
    provider: 'naver',
    createdAt: new Date('2024-08-08')
  },
  {
    id: '9',
    email: 'member8@google.com',
    name: '강다이아',
    provider: 'google',
    createdAt: new Date('2024-08-09')
  },
  {
    id: '10',
    email: 'member9@kakao.com',
    name: '임골드',
    provider: 'kakao',
    createdAt: new Date('2024-08-10')
  }
]

// 임시 팀 멤버 데이터
export const mockTeamMembers: any[] = [
  {
    id: '1',
    teamId: '1',
    userId: '1',
    role: 'leader',
    joinedAt: new Date('2024-08-01'),
    nickname: '탑갓홍길동',
    tier: 'diamond_ii',
    mainPosition: 'top',
    subPositions: ['jungle'],
    status: 'active',
    joinType: 'invite',
    stats: {
      totalWins: 15,
      totalLosses: 8,
      mainPositionGames: 18,
      mainPositionWins: 12,
      subPositionGames: 5,
      subPositionWins: 3,
      tierScore: 2900,
      mvpCount: 3,
      currentStreak: 2
    }
  },
  {
    id: '2',
    teamId: '1',
    userId: '2',
    role: 'member',
    joinedAt: new Date('2024-08-02'),
    nickname: '정글러철수',
    tier: 'platinum_i',
    mainPosition: 'jungle',
    subPositions: ['mid'],
    stats: {
      totalWins: 12,
      totalLosses: 11,
      mainPositionGames: 20,
      mainPositionWins: 11,
      subPositionGames: 3,
      subPositionWins: 1,
      tierScore: 2300,
      mvpCount: 1,
      currentStreak: -1
    }
  },
  {
    id: '3',
    teamId: '1',
    userId: '3',
    role: 'member',
    joinedAt: new Date('2024-08-03'),
    nickname: '미드영희',
    tier: 'emerald_iii',
    mainPosition: 'mid',
    subPositions: ['adc'],
    stats: {
      totalWins: 18,
      totalLosses: 7,
      mainPositionGames: 22,
      mainPositionWins: 16,
      subPositionGames: 3,
      subPositionWins: 2,
      tierScore: 2600,
      mvpCount: 4,
      currentStreak: 3
    }
  },
  {
    id: '4',
    teamId: '1',
    userId: '4',
    role: 'member',
    joinedAt: new Date('2024-08-04'),
    nickname: '원딜민수',
    tier: 'gold_i',
    mainPosition: 'adc',
    subPositions: ['support'],
    stats: {
      totalWins: 8,
      totalLosses: 14,
      mainPositionGames: 19,
      mainPositionWins: 7,
      subPositionGames: 3,
      subPositionWins: 1,
      tierScore: 1900,
      mvpCount: 0,
      currentStreak: -2
    }
  },
  {
    id: '5',
    teamId: '1',
    userId: '5',
    role: 'member',
    joinedAt: new Date('2024-08-05'),
    nickname: '서폿수연',
    tier: 'platinum_iii',
    mainPosition: 'support',
    subPositions: ['top'],
    stats: {
      totalWins: 14,
      totalLosses: 9,
      mainPositionGames: 21,
      mainPositionWins: 13,
      subPositionGames: 2,
      subPositionWins: 1,
      tierScore: 2200,
      mvpCount: 2,
      currentStreak: 1
    }
  },
  {
    id: '6',
    teamId: '1',
    userId: '6',
    role: 'member',
    joinedAt: new Date('2024-08-06'),
    nickname: '마스터탑',
    tier: 'master',
    mainPosition: 'top',
    subPositions: ['jungle'],
    stats: {
      totalWins: 28,
      totalLosses: 12,
      mainPositionGames: 35,
      mainPositionWins: 24,
      subPositionGames: 5,
      subPositionWins: 4,
      tierScore: 3300,
      mvpCount: 8,
      currentStreak: 4
    }
  },
  {
    id: '7',
    teamId: '1',
    userId: '7',
    role: 'member',
    joinedAt: new Date('2024-08-07'),
    nickname: '정글브론즈',
    tier: 'bronze_ii',
    mainPosition: 'jungle',
    subPositions: ['support'],
    stats: {
      totalWins: 5,
      totalLosses: 18,
      mainPositionGames: 20,
      mainPositionWins: 4,
      subPositionGames: 3,
      subPositionWins: 1,
      tierScore: 1000,
      mvpCount: 0,
      currentStreak: -3
    }
  },
  {
    id: '8',
    teamId: '1',
    userId: '8',
    role: 'member',
    joinedAt: new Date('2024-08-08'),
    nickname: '미드실버',
    tier: 'silver_iii',
    mainPosition: 'mid',
    subPositions: ['top'],
    stats: {
      totalWins: 15,
      totalLosses: 15,
      mainPositionGames: 28,
      mainPositionWins: 14,
      subPositionGames: 2,
      subPositionWins: 1,
      tierScore: 1300,
      mvpCount: 1,
      currentStreak: 0
    }
  },
  {
    id: '9',
    teamId: '1',
    userId: '9',
    role: 'member',
    joinedAt: new Date('2024-08-09'),
    nickname: '원딜다이아',
    tier: 'diamond_iv',
    mainPosition: 'adc',
    subPositions: ['mid'],
    stats: {
      totalWins: 22,
      totalLosses: 8,
      mainPositionGames: 27,
      mainPositionWins: 20,
      subPositionGames: 3,
      subPositionWins: 2,
      tierScore: 2800,
      mvpCount: 5,
      currentStreak: 2
    }
  },
  {
    id: '10',
    teamId: '1',
    userId: '10',
    role: 'member',
    joinedAt: new Date('2024-08-10'),
    nickname: '서폿골드',
    tier: 'gold_iii',
    mainPosition: 'support',
    subPositions: ['adc'],
    stats: {
      totalWins: 11,
      totalLosses: 16,
      mainPositionGames: 24,
      mainPositionWins: 9,
      subPositionGames: 3,
      subPositionWins: 2,
      tierScore: 1700,
      mvpCount: 1,
      currentStreak: -1
    }
  }
]

// 티어 한글 이름 매핑
export const tierNames: Record<TierType, string> = {
  iron_iv: '아이언 IV', iron_iii: '아이언 III', iron_ii: '아이언 II', iron_i: '아이언 I',
  bronze_iv: '브론즈 IV', bronze_iii: '브론즈 III', bronze_ii: '브론즈 II', bronze_i: '브론즈 I',
  silver_iv: '실버 IV', silver_iii: '실버 III', silver_ii: '실버 II', silver_i: '실버 I',
  gold_iv: '골드 IV', gold_iii: '골드 III', gold_ii: '골드 II', gold_i: '골드 I',
  platinum_iv: '플래티넘 IV', platinum_iii: '플래티넘 III', platinum_ii: '플래티넘 II', platinum_i: '플래티넘 I',
  emerald_iv: '에메랄드 IV', emerald_iii: '에메랄드 III', emerald_ii: '에메랄드 II', emerald_i: '에메랄드 I',
  diamond_iv: '다이아몬드 IV', diamond_iii: '다이아몬드 III', diamond_ii: '다이아몬드 II', diamond_i: '다이아몬드 I',
  master: '마스터',
  grandmaster: '그랜드마스터',
  challenger: '챌린저'
}

// 포지션 한글 이름 매핑
export const positionNames: Record<Position, string> = {
  top: '탑',
  jungle: '정글',
  mid: '미드',
  adc: '원딜',
  support: '서폿'
}

// 유틸리티 함수들
export const getTeamById = (teamId: string): Team | undefined => {
  return mockTeams.find(team => team.id === teamId)
}

export const getTeamMembers = (teamId: string): TeamMember[] => {
  return mockTeamMembers.filter(member => member.teamId === teamId)
}

export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(user => user.id === userId)
}

export const getMemberWithUser = (member: TeamMember) => {
  const user = getUserById(member.userId)
  return { ...member, user }
}

export const calculateWinRate = (wins: number, losses: number): number => {
  const total = wins + losses
  return total > 0 ? Math.round((wins / total) * 100) : 0
}

// 티어 업데이트 함수
export const updateMemberTier = (memberId: string, newTier: TierType): boolean => {
  const memberIndex = mockTeamMembers.findIndex(member => member.id === memberId)
  if (memberIndex === -1) {
    return false
  }
  
  mockTeamMembers[memberIndex] = {
    ...mockTeamMembers[memberIndex],
    tier: newTier
  }
  
  return true
}

// localStorage에서 팀별 경기 결과 조회
export const getMatchesByTeamId = (teamId: string): any[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const matches: any[] = []
    
    // localStorage의 모든 키를 확인
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      
      // match_result_ 로 시작하는 키만 확인
      if (key && key.startsWith('match_result_')) {
        const matchData = localStorage.getItem(key)
        if (matchData) {
          const parsed = JSON.parse(matchData)
          
          // 날짜 문자열을 Date 객체로 변환
          const match: any = {
            ...parsed,
            createdAt: new Date(parsed.createdAt)
          }
          
          // 해당 팀의 경기인지 확인 (sessionId를 통해 팀 확인)
          // sessionId 형식: teamId_timestamp 이므로 teamId로 시작하는지 확인
          if (match.sessionId.startsWith(teamId + '_')) {
            matches.push(match)
          }
        }
      }
    }
    
    // 최신순으로 정렬 (createdAt 내림차순)
    return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
  } catch (error) {
    console.error('경기 결과 로드 중 오류:', error)
    return []
  }
}

// 예시 경기 결과 데이터 생성
export const createSampleMatchData = (teamId: string = '1') => {
  if (typeof window === 'undefined') {
    return
  }

  // 현재 날짜 기준으로 과거 경기들 생성
  const now = new Date()
  
  // 경기 1: Team 1 승리 (3일 전)
  const match1: any = {
    id: 'match_' + Date.now() + '_1',
    sessionId: teamId + '_' + (now.getTime() - 3 * 24 * 60 * 60 * 1000),
    team1: {
      members: [
        { memberId: '6', position: 'top', champion: '가렌', kills: 8, deaths: 2, assists: 5 },
        { memberId: '7', position: 'jungle', champion: '그레이브즈', kills: 6, deaths: 4, assists: 8 },
        { memberId: '8', position: 'mid', champion: '아리', kills: 12, deaths: 1, assists: 6 },
        { memberId: '9', position: 'adc', champion: '진', kills: 9, deaths: 3, assists: 4 },
        { memberId: '10', position: 'support', champion: '룰루', kills: 1, deaths: 2, assists: 15 }
      ]
    },
    team2: {
      members: [
        { memberId: '1', position: 'top', champion: '다리우스', kills: 4, deaths: 7, assists: 3 },
        { memberId: '2', position: 'jungle', champion: '리 신', kills: 3, deaths: 8, assists: 4 },
        { memberId: '3', position: 'mid', champion: '야스오', kills: 6, deaths: 6, assists: 2 },
        { memberId: '4', position: 'adc', champion: '케이틀린', kills: 5, deaths: 7, assists: 3 },
        { memberId: '5', position: 'support', champion: '쓰레쉬', kills: 0, deaths: 8, assists: 6 }
      ]
    },
    winner: 'team1',
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  }

  // 경기 2: Team 2 승리 (1일 전)
  const match2: any = {
    id: 'match_' + Date.now() + '_2',
    sessionId: teamId + '_' + (now.getTime() - 1 * 24 * 60 * 60 * 1000),
    team1: {
      members: [
        { memberId: '1', position: 'top', champion: '말파이트', kills: 2, deaths: 5, assists: 8 },
        { memberId: '2', position: 'jungle', champion: '카직스', kills: 7, deaths: 6, assists: 3 },
        { memberId: '8', position: 'mid', champion: '르블랑', kills: 4, deaths: 4, assists: 5 },
        { memberId: '9', position: 'adc', champion: '루시안', kills: 6, deaths: 7, assists: 2 },
        { memberId: '5', position: 'support', champion: '나미', kills: 1, deaths: 3, assists: 9 }
      ]
    },
    team2: {
      members: [
        { memberId: '6', position: 'top', champion: '오른', kills: 3, deaths: 4, assists: 12 },
        { memberId: '7', position: 'jungle', champion: '그라가스', kills: 8, deaths: 3, assists: 7 },
        { memberId: '3', position: 'mid', champion: '아지르', kills: 9, deaths: 2, assists: 8 },
        { memberId: '4', position: 'adc', champion: '애쉬', kills: 11, deaths: 4, assists: 6 },
        { memberId: '10', position: 'support', champion: '브라움', kills: 0, deaths: 7, assists: 13 }
      ]
    },
    winner: 'team2',
    createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  }

  // 경기 3: Team 1 승리 (6시간 전)
  const match3: any = {
    id: 'match_' + Date.now() + '_3',
    sessionId: teamId + '_' + (now.getTime() - 6 * 60 * 60 * 1000),
    team1: {
      members: [
        { memberId: '6', position: 'top', champion: '잭스', kills: 5, deaths: 3, assists: 7 },
        { memberId: '2', position: 'jungle', champion: '헤카림', kills: 4, deaths: 4, assists: 9 },
        { memberId: '3', position: 'mid', champion: '신드라', kills: 8, deaths: 2, assists: 5 },
        { memberId: '4', position: 'adc', champion: '바루스', kills: 7, deaths: 3, assists: 4 },
        { memberId: '10', position: 'support', champion: '소나', kills: 2, deaths: 1, assists: 11 }
      ]
    },
    team2: {
      members: [
        { memberId: '1', position: 'top', champion: '나르', kills: 3, deaths: 6, assists: 4 },
        { memberId: '7', position: 'jungle', champion: '킨드레드', kills: 2, deaths: 5, assists: 6 },
        { memberId: '8', position: 'mid', champion: '제드', kills: 6, deaths: 5, assists: 2 },
        { memberId: '9', position: 'adc', champion: '이즈리얼', kills: 4, deaths: 6, assists: 3 },
        { memberId: '5', position: 'support', champion: '파이크', kills: 1, deaths: 4, assists: 7 }
      ]
    },
    winner: 'team1',
    createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
  }

  // localStorage에 저장
  try {
    localStorage.setItem(`match_result_${match1.id}`, JSON.stringify(match1))
    localStorage.setItem(`match_result_${match2.id}`, JSON.stringify(match2))
    localStorage.setItem(`match_result_${match3.id}`, JSON.stringify(match3))
    console.log('샘플 경기 결과 3개가 생성되었습니다.')
  } catch (error) {
    console.error('샘플 데이터 생성 중 오류:', error)
  }
}

// memberId를 닉네임으로 변환
export const getMemberNickname = (memberId: string): string => {
  const member = mockTeamMembers.find(m => m.id === memberId)
  return member ? member.nickname : `Player ${memberId}`
}

// 멤버 포지션 업데이트 함수
export const updateMemberPositions = (memberId: string, mainPosition: Position, subPositions: Position[]): boolean => {
  const memberIndex = mockTeamMembers.findIndex(member => member.id === memberId)
  if (memberIndex === -1) {
    return false
  }
  
  mockTeamMembers[memberIndex] = {
    ...mockTeamMembers[memberIndex],
    mainPosition,
    subPositions
  }
  
  return true
}

// 경기 결과 저장 및 통계 업데이트 함수
export const saveMatchResult = async (matchData: {
  sessionId: string
  teamId: string
  team1Members: Array<{
    memberId: string
    position: Position
    champion: string
    kills: number
    deaths: number
    assists: number
  }>
  team2Members: Array<{
    memberId: string
    position: Position
    champion: string
    kills: number
    deaths: number
    assists: number
  }>
  winner: 'team1' | 'team2'
}): Promise<string> => {
  try {
    // Match 객체 생성
    const match: any = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: matchData.sessionId,
      team1: {
        members: matchData.team1Members.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion,
          kills: member.kills,
          deaths: member.deaths,
          assists: member.assists
        }))
      },
      team2: {
        members: matchData.team2Members.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion,
          kills: member.kills,
          deaths: member.deaths,
          assists: member.assists
        }))
      },
      winner: matchData.winner,
      createdAt: new Date()
    }

    // localStorage에 경기 결과 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(`match_result_${match.id}`, JSON.stringify(match))
    }

    // 각 플레이어의 통계 업데이트
    const allMembers = [...matchData.team1Members, ...matchData.team2Members]
    const team1Won = matchData.winner === 'team1'
    const team2Won = matchData.winner === 'team2'

    for (const memberData of allMembers) {
      const isTeam1 = matchData.team1Members.includes(memberData)
      const won = isTeam1 ? team1Won : team2Won
      const isMainPosition = await updateMemberStats(memberData.memberId, memberData.position, won)
    }

    console.log('경기 결과가 성공적으로 저장되었습니다:', match.id)
    return match.id

  } catch (error) {
    console.error('경기 결과 저장 중 오류:', error)
    throw new Error('경기 결과 저장에 실패했습니다.')
  }
}

// 멤버 통계 업데이트 함수
const updateMemberStats = async (memberId: string, playedPosition: Position, won: boolean): Promise<boolean> => {
  const memberIndex = mockTeamMembers.findIndex(member => member.id === memberId)
  if (memberIndex === -1) {
    console.warn(`멤버를 찾을 수 없습니다: ${memberId}`)
    return false
  }

  const member = mockTeamMembers[memberIndex]
  const isMainPosition = member.mainPosition === playedPosition
  const isSubPosition = member.subPositions && member.subPositions.includes(playedPosition)

  // 통계 업데이트
  const updatedStats = {
    ...member.stats,
    // 전체 통계
    totalWins: member.stats.totalWins + (won ? 1 : 0),
    totalLosses: member.stats.totalLosses + (won ? 0 : 1),
    
    // 포지션별 통계
    mainPositionGames: member.stats.mainPositionGames + (isMainPosition ? 1 : 0),
    mainPositionWins: member.stats.mainPositionWins + (isMainPosition && won ? 1 : 0),
    subPositionGames: member.stats.subPositionGames + (isSubPosition ? 1 : 0),
    subPositionWins: member.stats.subPositionWins + (isSubPosition && won ? 1 : 0)
  }

  // 티어 점수 재계산
  updatedStats.tierScore = calculateTierScore(member.tier, updatedStats)

  // 멤버 데이터 업데이트
  mockTeamMembers[memberIndex] = {
    ...member,
    stats: updatedStats
  }

  return isMainPosition
}

// 임시 초대 데이터 저장소
const mockInvites: TeamInvite[] = []

// 초대 코드 생성 함수
export const generateInviteCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 팀 초대 링크 생성
export const createTeamInvite = async (teamId: string, createdBy: string, maxUses?: number, expiresInHours: number = 24): Promise<TeamInvite> => {
  const inviteCode = generateInviteCode()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresInHours)

  const invite: TeamInvite = {
    id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    teamId,
    createdBy,
    inviteCode,
    expiresAt,
    createdAt: new Date(),
    maxUses,
    currentUses: 0,
    isActive: true
  }

  mockInvites.push(invite)

  // localStorage에도 저장
  if (typeof window !== 'undefined') {
    localStorage.setItem(`team_invite_${invite.id}`, JSON.stringify(invite))
  }

  console.log('팀 초대 링크가 생성되었습니다:', invite.inviteCode)
  return invite
}

// 초대 코드로 팀 정보 가져오기
export const getTeamByInviteCode = async (inviteCode: string): Promise<any | null> => {
  try {
    // localStorage에서 모든 초대 검색
    if (typeof window === 'undefined') return null

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('team_invite_')) {
        const inviteData = localStorage.getItem(key)
        if (inviteData) {
          const invite: TeamInvite = JSON.parse(inviteData)
          
          if (invite.inviteCode === inviteCode && invite.isActive) {
            // 만료 확인
            if (new Date() > new Date(invite.expiresAt)) {
              continue // 만료된 초대는 건너뛰기
            }

            // 사용 횟수 확인
            if (invite.maxUses && invite.currentUses >= invite.maxUses) {
              continue // 최대 사용 횟수 초과
            }

            // 팀 정보 가져오기
            const team = getTeamById(invite.teamId)
            const inviter = getUserById(invite.createdBy)

            if (team && inviter) {
              return {
                inviteCode: invite.inviteCode,
                teamName: team.name,
                teamDescription: team.description,
                inviterName: inviter.name,
                expiresAt: new Date(invite.expiresAt)
              }
            }
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('초대 코드 확인 중 오류:', error)
    return null
  }
}

// 초대 코드로 팀 참가
export const joinTeamByInviteCode = async (inviteCode: string, userId: string, nickname: string, tier: TierType, mainPosition: Position, subPosition: Position): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false

    // 초대 찾기
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('team_invite_')) {
        const inviteData = localStorage.getItem(key)
        if (inviteData) {
          const invite: TeamInvite = JSON.parse(inviteData)
          
          if (invite.inviteCode === inviteCode && invite.isActive) {
            // 만료 및 사용 횟수 확인
            if (new Date() > new Date(invite.expiresAt)) {
              throw new Error('만료된 초대 링크입니다.')
            }
            if (invite.maxUses && invite.currentUses >= invite.maxUses) {
              throw new Error('초대 링크 사용 한도를 초과했습니다.')
            }

            // 이미 팀에 속해있는지 확인
            const existingMember = mockTeamMembers.find(m => m.userId === userId && m.teamId === invite.teamId)
            if (existingMember) {
              throw new Error('이미 이 팀의 멤버입니다.')
            }

            // 새 멤버 추가
            const newMember: any = {
              id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              teamId: invite.teamId,
              userId,
              role: 'member',
              joinedAt: new Date(),
              nickname,
              tier,
              mainPosition,
              subPositions: [subPosition],
              stats: {
                totalWins: 0,
                totalLosses: 0,
                mainPositionGames: 0,
                mainPositionWins: 0,
                subPositionGames: 0,
                subPositionWins: 0,
                tierScore: calculateTierScore(tier, {
                  totalWins: 0,
                  totalLosses: 0,
                  mainPositionGames: 0,
                  mainPositionWins: 0,
                  subPositionGames: 0,
                  subPositionWins: 0
                }),
                mvpCount: 0,
                currentStreak: 0
              }
            }

            mockTeamMembers.push(newMember)

            // 팀 멤버 수 업데이트
            const teamIndex = mockTeams.findIndex(t => t.id === invite.teamId)
            if (teamIndex !== -1) {
              mockTeams[teamIndex].memberCount += 1
            }

            // 초대 사용 횟수 증가
            invite.currentUses += 1
            localStorage.setItem(key, JSON.stringify(invite))

            console.log('팀 참가 성공:', newMember.nickname)
            return true
          }
        }
      }
    }

    throw new Error('유효하지 않은 초대 코드입니다.')
  } catch (error) {
    console.error('팀 참가 중 오류:', error)
    throw error
  }
}

// 팀의 활성 초대 목록 가져오기
export const getTeamInvites = (teamId: string): TeamInvite[] => {
  if (typeof window === 'undefined') return []

  const invites: TeamInvite[] = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('team_invite_')) {
      const inviteData = localStorage.getItem(key)
      if (inviteData) {
        const invite: TeamInvite = JSON.parse(inviteData)
        if (invite.teamId === teamId && invite.isActive) {
          invites.push(invite)
        }
      }
    }
  }

  return invites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}