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

// 티어 점수 계산 함수 (팀 밸런싱용 - CLAUDE.md 기준)
export const calculateTierScore = (tier: TierType, stats: { totalWins: number, totalLosses: number, mainPositionGames: number, mainPositionWins: number, subPositionGames: number, subPositionWins: number }): number => {
  // 기본 티어 점수 매핑
  const tierScoreMap: Record<TierType, number> = {
    iron_iv: 400, iron_iii: 500, iron_ii: 600, iron_i: 700,
    bronze_iv: 800, bronze_iii: 900, bronze_ii: 1000, bronze_i: 1100,
    silver_iv: 1200, silver_iii: 1300, silver_ii: 1400, silver_i: 1500,
    gold_iv: 1600, gold_iii: 1700, gold_ii: 1800, gold_i: 1900,
    platinum_iv: 2000, platinum_iii: 2100, platinum_ii: 2200, platinum_i: 2300,
    emerald_iv: 2400, emerald_iii: 2500, emerald_ii: 2600, emerald_i: 2700,
    diamond_iv: 2800, diamond_iii: 2900, diamond_ii: 3000, diamond_i: 3100,
    master: 3300,
    grandmaster: 3600,
    challenger: 4000
  }

  const baseTierScore = tierScoreMap[tier] || 1000
  const totalGames = stats.totalWins + stats.totalLosses
  const winRate = totalGames > 0 ? stats.totalWins / totalGames : 0

  // 경기 수에 따른 계산 방식 (CLAUDE.md 기준)
  if (totalGames <= 5) {
    // 0~5경기: 티어 점수 100%
    return baseTierScore
  } else if (totalGames <= 20) {
    // 5~20경기: 티어 70% + 승률 30%
    return Math.round(baseTierScore * 0.7 + winRate * 1000 * 0.3)
  } else {
    // 20경기 이상: 티어 50% + 승률 50%
    return Math.round(baseTierScore * 0.5 + winRate * 1000 * 0.5)
  }
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

// MVP 점수 계산 (KDA 60% + 킬관여도 40%)
export const calculateMVPScore = (
  player: MatchMemberResult, 
  teamTotalKills: number
): number => {
  const kda = (player.kills + player.assists) / Math.max(player.deaths, 1)
  const killParticipation = calculateKillParticipation(
    player.kills, 
    player.assists, 
    teamTotalKills
  )
  
  // KDA 60% + 킬관여도 40% 가중 평균
  return (kda * 0.6) + (killParticipation * 0.4)
}

// 경기에서 승리팀 MVP 계산
export const calculateMatchMVP = (match: Match): string | null => {
  const winningTeam = match.winner === 'team1' ? match.team1 : match.team2
  const teamTotalKills = winningTeam.members.reduce((sum, member) => 
    sum + member.kills, 0
  )
  
  // 킬이 없으면 MVP 없음
  if (teamTotalKills === 0) return null
  
  // 승리팀 멤버들의 MVP 점수 계산
  const mvpCandidate = winningTeam.members
    .map(member => ({
      ...member,
      mvpScore: calculateMVPScore(member, teamTotalKills)
    }))
    .sort((a, b) => b.mvpScore - a.mvpScore)[0]
    
  return mvpCandidate.memberId
}