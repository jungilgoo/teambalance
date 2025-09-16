import { createSupabaseBrowser } from '../supabase'
import { TeamMember, Match, MatchMember, Position } from '../types'
import { validateUUID } from '../input-validator'

const supabase = createSupabaseBrowser()

// 개인 통계 관련 타입 정의
export interface ChampionStats {
  champion: string
  gamesPlayed: number
  wins: number
  winRate: number
  averageKDA: number
  totalKills: number
  totalDeaths: number
  totalAssists: number
}

export interface PersonalStats {
  totalGames: number
  totalWins: number
  totalLosses: number
  winRate: number
  averageKDA: number
  tierScore: number
  mvpCount: number
  currentStreak: number
  mainPositionGames: number
  mainPositionWins: number
  subPositionGames: number
  subPositionWins: number
}

export interface PositionChampionStats {
  position: Position
  topChampion: string | null
  gamesPlayed: number
  wins: number
  winRate: number
}

// ============================================================================
// 개인 통계 API 함수들
// ============================================================================

/**
 * 사용자의 팀 내 매치 기록을 조회합니다
 */
export const getUserMatchHistory = async (
  teamId: string,
  userId: string
): Promise<MatchMember[]> => {
  try {
    if (!validateUUID(teamId) || !validateUUID(userId)) {
      console.error('잘못된 ID 형식:', { teamId, userId })
      return []
    }

    // 먼저 해당 팀에서 사용자의 팀 멤버 ID를 조회
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (memberError || !teamMember) {
      console.error('팀 멤버 조회 오류:', memberError)
      return []
    }

    // match_members 테이블에서 해당 사용자의 기록을 조회
    const { data: matchMembers, error: matchMembersError } = await supabase
      .from('match_members')
      .select(`
        id,
        match_id,
        team_member_id,
        team_side,
        position,
        champion,
        kills,
        deaths,
        assists,
        matches!inner(
          id,
          team_id,
          winner,
          created_at
        )
      `)
      .eq('team_member_id', (teamMember as any).id)
      .eq('matches.team_id', teamId)
      .order('matches(created_at)', { ascending: false })

    if (matchMembersError) {
      console.error('매치 멤버 기록 조회 오류:', matchMembersError)
      return []
    }

    // MatchMember 형태로 변환
    const userMatchRecords: MatchMember[] = (matchMembers as any[] || []).map((record: any) => ({
      id: record.id,
      matchId: record.match_id,
      memberId: record.team_member_id,
      teamSide: record.team_side,
      position: record.position,
      champion: record.champion,
      kills: record.kills,
      deaths: record.deaths,
      assists: record.assists
    }))

    return userMatchRecords
  } catch (error) {
    console.error('매치 기록 조회 실패:', error)
    return []
  }
}

/**
 * 사용자의 챔피언별 통계를 계산합니다
 */
export const getUserChampionStats = async (
  teamId: string,
  userId: string
): Promise<ChampionStats[]> => {
  try {
    const matchHistory = await getUserMatchHistory(teamId, userId)

    if (matchHistory.length === 0) {
      return []
    }

    // 챔피언별 통계 집계
    const championData: Record<string, {
      gamesPlayed: number
      wins: number
      totalKills: number
      totalDeaths: number
      totalAssists: number
    }> = {}

    // 승패 정보를 위해 매치 데이터 조회
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, winner')
      .eq('team_id', teamId)

    if (error) {
      console.error('매치 승패 정보 조회 오류:', error)
      return []
    }

    // 매치 ID별 승패 정보 매핑
    const matchResults = new Map<string, string>()
    ;(matches as any[] || []).forEach((match: any) => {
      matchResults.set(match.id, match.winner)
    })

    matchHistory.forEach(record => {
      const champion = record.champion

      if (!championData[champion]) {
        championData[champion] = {
          gamesPlayed: 0,
          wins: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAssists: 0
        }
      }

      championData[champion].gamesPlayed++
      championData[champion].totalKills += record.kills
      championData[champion].totalDeaths += record.deaths
      championData[champion].totalAssists += record.assists

      // 승패 판정 - record.teamSide와 match.winner 비교
      const matchWinner = matchResults.get(record.matchId || '')
      if (matchWinner && record.teamSide === matchWinner) {
        championData[champion].wins++
      }
    })

    // ChampionStats 배열로 변환
    const championStats: ChampionStats[] = Object.entries(championData).map(([champion, stats]) => ({
      champion,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
      averageKDA: stats.gamesPlayed > 0
        ? Math.round(((stats.totalKills + stats.totalAssists) / Math.max(stats.totalDeaths, 1)) * 100) / 100
        : 0,
      totalKills: stats.totalKills,
      totalDeaths: stats.totalDeaths,
      totalAssists: stats.totalAssists
    }))

    // 플레이 횟수 기준으로 정렬
    return championStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed)
  } catch (error) {
    console.error('챔피언 통계 계산 실패:', error)
    return []
  }
}

/**
 * 사용자의 종합 개인 통계를 조회합니다
 */
export const getUserPersonalStats = async (
  teamId: string,
  userId: string
): Promise<PersonalStats | null> => {
  try {
    if (!validateUUID(teamId) || !validateUUID(userId)) {
      console.error('잘못된 ID 형식:', { teamId, userId })
      return null
    }

    // 팀 멤버 정보 조회
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (memberError || !teamMember) {
      console.error('팀 멤버 조회 오류:', memberError)
      return null
    }

    const memberData = teamMember as any

    // 매치 기록으로부터 평균 KDA 계산 (총합 방식)
    const matchHistory = await getUserMatchHistory(teamId, userId)
    let totalKills = 0
    let totalDeaths = 0
    let totalAssists = 0

    matchHistory.forEach(record => {
      totalKills += record.kills
      totalDeaths += record.deaths
      totalAssists += record.assists
    })

    const averageKDA = matchHistory.length > 0 
      ? Math.round(((totalKills + totalAssists) / Math.max(totalDeaths, 1)) * 100) / 100 
      : 0

    // MVP 횟수 계산 - NULL이 아닌 경우만 카운트
    const { data: mvpMatches, error: mvpError } = await supabase
      .from('matches')
      .select('id, mvp_member_id')
      .eq('team_id', teamId)
      .eq('mvp_member_id', memberData.id)
      .not('mvp_member_id', 'is', null)

    if (mvpError) {
      console.error('MVP 매치 조회 오류:', mvpError)
    }

    const mvpCount = mvpError ? 0 : (mvpMatches?.length || 0)

    // 연속 기록 계산 (최근 경기부터 역순으로)
    let currentStreak = 0
    if (matchHistory.length > 0) {
      // 승패 정보를 위해 매치 데이터 조회
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('id, winner, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (!matchError && matches) {
        // 매치 ID별 승패 정보 매핑
        const matchResults = new Map<string, string>()
        matches.forEach((match: any) => {
          matchResults.set(match.id, match.winner)
        })

        // 사용자 매치 기록을 최신순으로 정렬
        const sortedMatchHistory = [...matchHistory].sort((a, b) => {
          const matchA = (matches as any[]).find((m: any) => m.id === a.matchId)
          const matchB = (matches as any[]).find((m: any) => m.id === b.matchId)
          if (!matchA || !matchB) return 0
          return new Date(matchB.created_at).getTime() - new Date(matchA.created_at).getTime()
        })

        // 연속 기록 계산
        let lastResult: boolean | null = null
        for (const record of sortedMatchHistory) {
          const matchWinner = matchResults.get(record.matchId || '')
          if (!matchWinner) continue

          const isWin = record.teamSide === matchWinner

          if (lastResult === null) {
            // 첫 번째 경기
            lastResult = isWin
            currentStreak = isWin ? 1 : -1
          } else if (lastResult === isWin) {
            // 같은 결과가 계속됨
            if (isWin) {
              currentStreak++
            } else {
              currentStreak--
            }
          } else {
            // 연속 기록이 끊어짐
            break
          }
        }
      }
    }

    return {
      totalGames: memberData.total_wins + memberData.total_losses,
      totalWins: memberData.total_wins,
      totalLosses: memberData.total_losses,
      winRate: (memberData.total_wins + memberData.total_losses) > 0
        ? Math.round((memberData.total_wins / (memberData.total_wins + memberData.total_losses)) * 100)
        : 0,
      averageKDA,
      tierScore: memberData.tier_score,
      mvpCount,
      currentStreak,
      mainPositionGames: memberData.main_position_games,
      mainPositionWins: memberData.main_position_wins,
      subPositionGames: memberData.sub_position_games,
      subPositionWins: memberData.sub_position_wins
    }
  } catch (error) {
    console.error('개인 통계 조회 실패:', error)
    return null
  }
}

/**
 * 포지션별 주력 챔피언 정보를 조회합니다
 */
export const getUserPositionChampionStats = async (
  teamId: string,
  userId: string
): Promise<PositionChampionStats[]> => {
  try {
    const matchHistory = await getUserMatchHistory(teamId, userId)

    if (matchHistory.length === 0) {
      return []
    }

    // 포지션별 챔피언 통계 집계
    const positionStats: Record<Position, Record<string, { games: number, wins: number }>> = {
      top: {},
      jungle: {},
      mid: {},
      adc: {},
      support: {}
    }

    // 승패 정보를 위해 매치 데이터 조회
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, winner')
      .eq('team_id', teamId)

    if (error) {
      console.error('매치 승패 정보 조회 오류:', error)
      return []
    }

    // 매치 ID별 승패 정보 매핑
    const matchResults = new Map<string, string>()
    ;(matches as any[] || []).forEach((match: any) => {
      matchResults.set(match.id, match.winner)
    })

    matchHistory.forEach(record => {
      const position = record.position
      const champion = record.champion

      if (!positionStats[position][champion]) {
        positionStats[position][champion] = { games: 0, wins: 0 }
      }

      positionStats[position][champion].games++

      // 승패 판정 - record.teamSide와 match.winner 비교
      const matchWinner = matchResults.get(record.matchId || '')
      if (matchWinner && record.teamSide === matchWinner) {
        positionStats[position][champion].wins++
      }
    })

    // 포지션별 가장 많이 플레이한 챔피언 찾기
    const result: PositionChampionStats[] = []

    Object.entries(positionStats).forEach(([position, champions]) => {
      const championEntries = Object.entries(champions)

      if (championEntries.length === 0) {
        result.push({
          position: position as Position,
          topChampion: null,
          gamesPlayed: 0,
          wins: 0,
          winRate: 0
        })
      } else {
        // 가장 많이 플레이한 챔피언 찾기
        const topChampionEntry = championEntries
          .sort(([, a], [, b]) => b.games - a.games)[0]

        const [championName, stats] = topChampionEntry

        result.push({
          position: position as Position,
          topChampion: championName,
          gamesPlayed: stats.games,
          wins: stats.wins,
          winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0
        })
      }
    })

    return result
  } catch (error) {
    console.error('포지션별 챔피언 통계 조회 실패:', error)
    return []
  }
}