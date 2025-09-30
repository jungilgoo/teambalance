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
      .select(`
        id,
        result,
        team1_member_ids,
        team2_member_ids
      `)
      .eq('team_id', teamId)
      .not('result', 'is', null)

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
      
      // result가 'team1'이면 팀1 승리, 'team2'이면 팀2 승리
      if (matchData.result === 'team1') {
        blueTeamWins++
      } else if (matchData.result === 'team2') {
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

    // 팀의 모든 경기에서 챔피언 픽 정보 조회
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        result,
        team1_champions,
        team2_champions
      `)
      .eq('team_id', teamId)
      .not('team1_champions', 'is', null)
      .not('team2_champions', 'is', null)

    if (matchesError) {
      console.error('챔피언 데이터 조회 오류:', matchesError)
      return []
    }

    if (!matches || matches.length === 0) {
      return []
    }

    // 챔피언별 통계 집계
    const championStats = new Map<string, {
      totalPicks: number
      totalWins: number
    }>()

    // 각 경기에서 챔피언 픽과 승패 분석
    for (const match of matches) {
      const matchData = match as any
      
      // 팀1 (블루팀) 챔피언들
      if (matchData.team1_champions) {
        const team1Champions = matchData.team1_champions as Record<string, string>
        const isTeam1Winner = matchData.result === 'team1'
        
        Object.values(team1Champions).forEach(championId => {
          if (championId && championId !== '') {
            const stats = championStats.get(championId) || { totalPicks: 0, totalWins: 0 }
            stats.totalPicks++
            if (isTeam1Winner) stats.totalWins++
            championStats.set(championId, stats)
          }
        })
      }

      // 팀2 (레드팀) 챔피언들
      if (matchData.team2_champions) {
        const team2Champions = matchData.team2_champions as Record<string, string>
        const isTeam2Winner = matchData.result === 'team2'
        
        Object.values(team2Champions).forEach(championId => {
          if (championId && championId !== '') {
            const stats = championStats.get(championId) || { totalPicks: 0, totalWins: 0 }
            stats.totalPicks++
            if (isTeam2Winner) stats.totalWins++
            championStats.set(championId, stats)
          }
        })
      }
    }

    const totalGames = matches.length

    // 챔피언 통계를 배열로 변환하고 정렬
    const championMetaStats: ChampionMetaStats[] = Array.from(championStats.entries())
      .map(([championId, stats]) => ({
        championId,
        championName: getChampionName(championId),
        totalPicks: stats.totalPicks,
        totalWins: stats.totalWins,
        winRate: Math.round((stats.totalWins / stats.totalPicks) * 100),
        pickRate: Math.round((stats.totalPicks / (totalGames * 10)) * 100) // 전체 픽 중 비율
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

/**
 * 챔피언 ID를 이름으로 변환하는 헬퍼 함수
 */
function getChampionName(championId: string): string {
  // 실제 챔피언 이름이 저장되어 있다면 그대로 사용
  if (championId && championId.length > 2) {
    return championId
  }
  
  // 숫자 ID인 경우 기본 챔피언 이름 반환
  const defaultChampionNames: Record<string, string> = {
    '1': '애니',
    '2': '올라프', 
    '3': '갈리오',
    '4': '트위스티드 페이트',
    '5': '신 짜오',
    '6': '우르곳',
    '7': '르블랑',
    '8': '블라디미르',
    '9': '피들스틱',
    '10': '케일',
    '11': '마스터 이',
    '12': '알리스타',
    '13': '라이즈',
    '14': '사이온',
    '15': '시비르',
    '16': '소라카',
    '17': '티모',
    '18': '트리스타나',
    '19': '워윅',
    '20': '누누와 윌럼프'
  }

  return defaultChampionNames[championId] || `챔피언 ${championId}`
}
