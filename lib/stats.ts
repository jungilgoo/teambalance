import { TeamMember, TierType, Position, MatchMemberResult, Match } from './types'

// 티어별 통계
export interface TierStats {
  tier: TierType
  count: number
  percentage: number
  averageWinRate: number
  averageTierScore: number
}

// 포지션별 통계
export interface PositionStats {
  position: Position
  count: number
  percentage: number
  averageWinRate: number
  averageTierScore: number
}

// 팀 전체 통계
export interface TeamOverallStats {
  totalMembers: number
  averageTierScore: number
  averageWinRate: number
  totalGames: number
  totalWins: number
  totalLosses: number
}

// 멤버 랭킹 정보
export interface MemberRanking extends TeamMember {
  winRate: number
  totalGames: number
  tierScoreRank: number
  winRateRank: number
}

// 팀 전체 통계 계산
export const calculateTeamStats = (members: TeamMember[]): TeamOverallStats => {
  if (members.length === 0) {
    return {
      totalMembers: 0,
      averageTierScore: 0,
      averageWinRate: 0,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0
    }
  }

  const totalWins = members.reduce((sum, member) => sum + member.stats.totalWins, 0)
  const totalLosses = members.reduce((sum, member) => sum + member.stats.totalLosses, 0)
  const totalGames = totalWins + totalLosses
  const averageTierScore = Math.round(members.reduce((sum, member) => sum + member.stats.tierScore, 0) / members.length)
  const averageWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

  return {
    totalMembers: members.length,
    averageTierScore,
    averageWinRate,
    totalGames,
    totalWins,
    totalLosses
  }
}

// 티어별 통계 계산
export const calculateTierStats = (members: TeamMember[]): TierStats[] => {
  if (members.length === 0) return []

  const tierGroups = members.reduce((groups, member) => {
    const tier = member.tier
    if (!groups[tier]) {
      groups[tier] = []
    }
    groups[tier].push(member)
    return groups
  }, {} as Record<TierType, TeamMember[]>)

  return Object.entries(tierGroups).map(([tier, tierMembers]) => {
    const totalGames = tierMembers.reduce((sum, member) => 
      sum + member.stats.totalWins + member.stats.totalLosses, 0)
    const totalWins = tierMembers.reduce((sum, member) => sum + member.stats.totalWins, 0)
    const averageWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
    const averageTierScore = Math.round(tierMembers.reduce((sum, member) => sum + member.stats.tierScore, 0) / tierMembers.length)

    return {
      tier: tier as TierType,
      count: tierMembers.length,
      percentage: Math.round((tierMembers.length / members.length) * 100),
      averageWinRate,
      averageTierScore
    }
  }).sort((a, b) => b.averageTierScore - a.averageTierScore) // TierScore 높은 순으로 정렬
}

// 포지션별 통계 계산
export const calculatePositionStats = (members: TeamMember[]): PositionStats[] => {
  if (members.length === 0) return []

  const positionGroups = members.reduce((groups, member) => {
    const position = member.mainPosition
    if (!groups[position]) {
      groups[position] = []
    }
    groups[position].push(member)
    return groups
  }, {} as Record<Position, TeamMember[]>)

  return Object.entries(positionGroups).map(([position, posMembers]) => {
    const totalGames = posMembers.reduce((sum, member) => 
      sum + member.stats.totalWins + member.stats.totalLosses, 0)
    const totalWins = posMembers.reduce((sum, member) => sum + member.stats.totalWins, 0)
    const averageWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
    const averageTierScore = Math.round(posMembers.reduce((sum, member) => sum + member.stats.tierScore, 0) / posMembers.length)

    return {
      position: position as Position,
      count: posMembers.length,
      percentage: Math.round((posMembers.length / members.length) * 100),
      averageWinRate,
      averageTierScore
    }
  })
}

// 멤버 랭킹 계산
export const calculateMemberRankings = (members: TeamMember[]): MemberRanking[] => {
  if (members.length === 0) return []

  // 각 멤버의 승률과 총 경기 수 계산
  const membersWithStats = members.map(member => {
    const totalGames = member.stats.totalWins + member.stats.totalLosses
    const winRate = totalGames > 0 ? Math.round((member.stats.totalWins / totalGames) * 100) : 0
    
    return {
      ...member,
      winRate,
      totalGames,
      tierScoreRank: 0,
      winRateRank: 0
    }
  })

  // TierScore 순위 계산
  const tierScoreSorted = [...membersWithStats].sort((a, b) => b.stats.tierScore - a.stats.tierScore)
  tierScoreSorted.forEach((member, index) => {
    const originalIndex = membersWithStats.findIndex(m => m.id === member.id)
    membersWithStats[originalIndex].tierScoreRank = index + 1
  })

  // 승률 순위 계산
  const winRateSorted = [...membersWithStats].sort((a, b) => b.winRate - a.winRate)
  winRateSorted.forEach((member, index) => {
    const originalIndex = membersWithStats.findIndex(m => m.id === member.id)
    membersWithStats[originalIndex].winRateRank = index + 1
  })

  return membersWithStats
}

// 개별 승률 계산 유틸리티
export const calculateWinRate = (wins: number, losses: number): number => {
  const total = wins + losses
  return total > 0 ? Math.round((wins / total) * 100) : 0
}

// 티어 점수 계산 함수 (승패 기반 동적 시스템)
export const calculateTierScore = (tier: TierType, stats?: { totalWins: number, totalLosses: number, mainPositionGames: number, mainPositionWins: number, subPositionGames: number, subPositionWins: number }): number => {
  // 새로운 50점 단위 티어 점수 매핑
  const tierScoreMap: Record<TierType, number> = {
    iron_iv: 400, iron_iii: 450, iron_ii: 500, iron_i: 550,
    bronze_iv: 600, bronze_iii: 650, bronze_ii: 700, bronze_i: 750,
    silver_iv: 800, silver_iii: 850, silver_ii: 900, silver_i: 950,
    gold_iv: 1000, gold_iii: 1050, gold_ii: 1100, gold_i: 1150,
    platinum_iv: 1200, platinum_iii: 1250, platinum_ii: 1300, platinum_i: 1350,
    emerald_iv: 1400, emerald_iii: 1450, emerald_ii: 1500, emerald_i: 1550,
    diamond_iv: 1600, diamond_iii: 1650, diamond_ii: 1700, diamond_i: 1750,
    master: 1800,
    grandmaster: 1900,
    challenger: 2000
  }

  const baseTierScore = tierScoreMap[tier] || 800
  
  // stats가 없는 경우 기본 티어 점수 반환
  if (!stats) {
    return baseTierScore
  }
  
  // 승패 기반 동적 점수 계산: 승리 +50점, 패배 -50점
  const netWins = stats.totalWins - stats.totalLosses
  const adjustedScore = baseTierScore + (netWins * 50)
  
  // 최소값 보장: 아이언4(400점) 이하로는 떨어지지 않음
  return Math.max(400, adjustedScore)
}

// TeamMember 객체로부터 직접 티어 점수 계산하는 편의 함수
export const calculateMemberTierScore = (member: { tier: TierType, stats: { totalWins: number, totalLosses: number, mainPositionGames: number, mainPositionWins: number, subPositionGames: number, subPositionWins: number } }): number => {
  return calculateTierScore(member.tier, member.stats)
}

// 티어 분포를 차트용 데이터로 변환
export const prepareTierChartData = (tierStats: TierStats[]) => {
  return tierStats.map(stat => ({
    tier: stat.tier,
    count: stat.count,
    percentage: stat.percentage
  }))
}

// 포지션 분포를 차트용 데이터로 변환
export const preparePositionChartData = (positionStats: PositionStats[]) => {
  return positionStats.map(stat => ({
    position: stat.position,
    count: stat.count,
    percentage: stat.percentage
  }))
}

// ============================================================================
// MVP 계산 관련 함수들
// ============================================================================

// 킬 관여도 계산
export const calculateKillParticipation = (
  playerKills: number,
  playerAssists: number, 
  teamTotalKills: number
): number => {
  if (teamTotalKills === 0) return 0
  return ((playerKills + playerAssists) / teamTotalKills) * 100
}

// 포지션별 킬관여도 가중치
const POSITION_KILL_PARTICIPATION_WEIGHTS: Record<string, number> = {
  'top': 1.1,      // 탑: 킬에 더 많이 기여
  'jungle': 0.9,   // 정글: 킬에 덜 기여 (갱킹은 하지만 직접 킬은 적음)
  'mid': 1.0,      // 미드: 기본 가중치
  'adc': 1.0,      // 원딜: 기본 가중치
  'support': 1.0   // 서포터: 기본 가중치
}

// MVP 점수 계산 (KDA 60% + 포지션별 가중치 적용 킬관여도 40%)
export const calculateMVPScore = (
  player: MatchMemberResult, 
  teamTotalKills: number
): number => {
  const kda = (player.kills + player.assists) / Math.max(player.deaths, 1)
  const baseKillParticipation = calculateKillParticipation(
    player.kills, 
    player.assists, 
    teamTotalKills
  )
  
  // 포지션별 가중치 적용
  const positionWeight = POSITION_KILL_PARTICIPATION_WEIGHTS[player.position] || 1.0
  const adjustedKillParticipation = baseKillParticipation * positionWeight
  
  // KDA와 킬관여도를 0-10 스케일로 정규화 후 가중 평균
  // KDA 정규화: 로그20 스케일 사용 (KDA 1.0 = 0점, KDA 20.0 = 10점)
  const normalizedKDA = Math.min(Math.log(Math.max(kda, 1)) / Math.log(20) * 10, 10)
  // 킬관여도 정규화: 킬관여도 100% = 10점
  const normalizedKillParticipation = Math.min(adjustedKillParticipation / 10, 10)
  
  // 정규화된 값으로 60:40 비중 적용
  return (normalizedKDA * 0.6) + (normalizedKillParticipation * 0.4)
}

// 경기에서 승리팀 MVP 계산
export const calculateMatchMVP = (match: Match): string | null => {
  // winner가 null이면 MVP 없음
  if (!match.winner) {
    return null
  }
  
  const winningTeam = match.winner === 'team1' ? match.team1 : match.team2
  
  // null safety 체크
  if (!winningTeam || !(winningTeam as any).members || (winningTeam as any).members.length === 0) {
    return null
  }
  
  const teamTotalKills = (winningTeam as any).members.reduce((sum: any, member: any) => 
    sum + (member?.kills || 0), 0
  )
  
  // 킬이 없으면 MVP 없음
  if (teamTotalKills === 0) return null
  
  // 승리팀 멤버들의 MVP 점수 계산
  const mvpCandidate = (winningTeam as any).members
    .map((member: any) => ({
      ...member,
      mvpScore: calculateMVPScore(member, teamTotalKills)
    }))
    .sort((a: any, b: any) => b.mvpScore - a.mvpScore)[0]
    
  return mvpCandidate.memberId
}