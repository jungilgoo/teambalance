import { supabase } from '../supabase'
import { validateUUID } from '../input-validator'

// 블루팀/레드팀 승률 분석 결과
export interface SideWinRateAnalysis {
  blueTeamWinRate: number
  redTeamWinRate: number
  totalGames: number
  blueTeamWins: number
  redTeamWins: number
}

// 챔피언 메타 분석 결과
export interface ChampionMetaStats {
  championId: string
  championName: string
  totalPicks: number
  totalWins: number
  winRate: number
  pickRate: number // 전체 경기 대비 픽률
}

// 팀별 메타 분석 결과
export interface TeamMetaAnalysis {
  sideWinRate: SideWinRateAnalysis
  topChampions: ChampionMetaStats[]
  totalMatches: number
}

/**
 * 팀의 블루팀/레드팀 승률을 분석합니다
 */
export const analyzeSideWinRate = async (teamId: string): Promise<SideWinRateAnalysis | null> => {
  try {
    if (!validateUUID(teamId)) {
      console.error('잘못된 팀 ID 형식:', teamId)
      return null
    }

    // 팀의 모든 경기 결과 조회
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, winner')
      .eq('team_id', teamId)

    if (matchesError) {
      console.error('경기 데이터 조회 오류:', matchesError)
      return null
    }

    if (!matches || matches.length === 0) {
      return {
        blueTeamWinRate: 0,
        redTeamWinRate: 0,
        totalGames: 0,
        blueTeamWins: 0,
        redTeamWins: 0
      }
    }

    let blueTeamWins = 0
    let redTeamWins = 0

    // 각 경기의 승패 결과 분석
    for (const match of matches) {
      const matchData = match as any
      
      // winner가 'team1'이면 블루팀(team1) 승리, 'team2'이면 레드팀(team2) 승리
      if (matchData.winner === 'team1') {
        blueTeamWins++
      } else if (matchData.winner === 'team2') {
        redTeamWins++
      }
    }

    const totalGames = blueTeamWins + redTeamWins
    const blueTeamWinRate = totalGames > 0 ? Math.round((blueTeamWins / totalGames) * 100) : 0
    const redTeamWinRate = totalGames > 0 ? Math.round((redTeamWins / totalGames) * 100) : 0

    return {
      blueTeamWinRate,
      redTeamWinRate,
      totalGames,
      blueTeamWins,
      redTeamWins
    }

  } catch (error) {
    console.error('사이드 승률 분석 실패:', error)
    return null
  }
}

/**
 * 팀의 인기 챔피언 순위를 분석합니다 (상위 10위)
 */
export const analyzeTopChampions = async (teamId: string, limit: number = 10): Promise<ChampionMetaStats[]> => {
  try {
    if (!validateUUID(teamId)) {
      console.error('잘못된 팀 ID 형식:', teamId)
      return []
    }

    // match_members 테이블에서 챔피언 픽 정보 조회
    const { data: matchMembers, error: matchMembersError } = await supabase
      .from('match_members')
      .select(`
        champion,
        team_side,
        match_id,
        matches!inner(team_id, winner)
      `)
      .eq('matches.team_id', teamId)

    if (matchMembersError) {
      console.error('챔피언 데이터 조회 오류:', matchMembersError)
      return []
    }

    if (!matchMembers || matchMembers.length === 0) {
      return []
    }

    // 챔피언별 통계 집계
    const championStats = new Map<string, {
      totalPicks: number
      totalWins: number
    }>()

    // 각 멤버의 챔피언 픽과 승패 분석
    for (const member of matchMembers) {
      const memberData = member as any
      const champion = memberData.champion
      const teamSide = memberData.team_side
      const winner = memberData.matches?.winner
      
      if (champion && champion !== '') {
        const stats = championStats.get(champion) || { totalPicks: 0, totalWins: 0 }
        stats.totalPicks++
        
        // 해당 멤버가 속한 팀이 이겼는지 확인
        if (teamSide === winner) {
          stats.totalWins++
        }
        
        championStats.set(champion, stats)
      }
    }

    // 총 경기 수 계산 (고유한 match_id 개수)
    const uniqueMatches = new Set(matchMembers.map((m: any) => m.match_id))
    const totalGames = uniqueMatches.size

    // 챔피언 통계를 배열로 변환하고 정렬
    const championMetaStats: ChampionMetaStats[] = Array.from(championStats.entries())
      .map(([championName, stats]) => ({
        championId: championName,
        championName: championName,
        totalPicks: stats.totalPicks,
        totalWins: stats.totalWins,
        winRate: stats.totalPicks > 0 ? Math.round((stats.totalWins / stats.totalPicks) * 100) : 0,
        pickRate: totalGames > 0 ? Math.round((stats.totalPicks / (totalGames * 10)) * 100) : 0 // 전체 픽 중 비율
      }))
      .sort((a, b) => b.totalPicks - a.totalPicks) // 픽 횟수 순으로 정렬
      .slice(0, limit)

    return championMetaStats

  } catch (error) {
    console.error('챔피언 메타 분석 실패:', error)
    return []
  }
}

/**
 * 팀의 종합 메타 분석을 수행합니다
 */
export const getTeamMetaAnalysis = async (teamId: string): Promise<TeamMetaAnalysis | null> => {
  try {
    const [sideWinRate, topChampions] = await Promise.all([
      analyzeSideWinRate(teamId),
      analyzeTopChampions(teamId, 10)
    ])

    if (!sideWinRate) {
      return null
    }

    return {
      sideWinRate,
      topChampions,
      totalMatches: sideWinRate.totalGames
    }

  } catch (error) {
    console.error('팀 메타 분석 실패:', error)
    return null
  }
}

