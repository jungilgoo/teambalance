import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from './useRealtime'
import { getMatchesByTeamId, saveMatchResult } from '../supabase-api'
import { Match } from '../types'

/**
 * 매치 결과 실시간 관리 Hook
 * 경기 결과 업데이트를 실시간으로 추적하고 관련 액션들을 제공
 */
export function useMatchRealtime(teamId: string, enabled: boolean = true) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])

  // 실시간 구독 설정
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    connected,
    updateData
  } = useRealtime<Match>({
    subscriptionId: `team_matches_${teamId}`,
    table: 'matches',
    initialData: [],
    filter: { column: 'team_id', value: teamId },
    enabled: !!teamId && enabled,
    onInsert: (newMatch) => {
      console.log(`[MatchRealtime] 새 경기 결과 추가:`, newMatch.id)
      // 새 경기 결과 알림을 여기서 처리 가능
    },
    onUpdate: (oldMatch, newMatch) => {
      console.log(`[MatchRealtime] 경기 결과 업데이트:`, {
        matchId: newMatch.id,
        result: (newMatch as any).result
      })
    },
    onDelete: (deletedMatch) => {
      console.log(`[MatchRealtime] 경기 결과 삭제:`, deletedMatch.id)
    }
  })

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = useCallback(async () => {
    if (!teamId || !enabled) return

    try {
      setInitialLoading(true)
      console.log(`[MatchRealtime] 초기 데이터 로드 시작: ${teamId}`)
      
      const matchesData = await getMatchesByTeamId(teamId)
      console.log(`[MatchRealtime] 초기 데이터 로드 완료: ${matchesData.length}개 경기`)
      
      setMatches(matchesData)
      updateData(() => matchesData)
    } catch (error) {
      console.error('[MatchRealtime] 초기 데이터 로드 실패:', error)
    } finally {
      setInitialLoading(false)
    }
  }, [teamId, enabled, updateData])

  /**
   * 컴포넌트 마운트 시 초기 데이터 로드
   */
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  /**
   * 실시간 데이터를 로컬 상태와 동기화
   */
  useEffect(() => {
    if (realtimeData) {
      setMatches(realtimeData)
    }
  }, [realtimeData])

  /**
   * 새 경기 결과 저장 (로컬 상태 즉시 반영 + API 호출)
   */
  const saveNewMatchResult = useCallback(async (matchResult: any) => {
    try {
      console.log(`[MatchRealtime] 새 경기 결과 저장 시작:`, matchResult.teamId)
      
      // API 호출로 서버에 저장
      const savedMatch = await saveMatchResult(matchResult)
      console.log(`[MatchRealtime] 경기 결과 저장 성공:`, (savedMatch as any)?.id)
      
      return savedMatch
    } catch (error) {
      console.error('[MatchRealtime] 경기 결과 저장 실패:', error)
      throw error
    }
  }, [])

  /**
   * 경기 결과 새로고침
   */
  const refreshMatches = useCallback(async () => {
    await loadInitialData()
  }, [loadInitialData])

  /**
   * 최근 경기들 (최신순)
   */
  const recentMatches = useMemo(() => 
    [...matches].sort((a, b) => 
      new Date((b as any).playedAt).getTime() - new Date((a as any).playedAt).getTime()
    ),
    [matches]
  )

  /**
   * 오늘 경기들
   */
  const todayMatches = useMemo(() => {
    const today = new Date().toDateString()
    return matches.filter(match => 
      new Date((match as any).playedAt).toDateString() === today
    )
  }, [matches])

  /**
   * 경기 통계
   */
  const matchStats = useMemo(() => {
    const total = matches.length
    const wins = matches.filter(m => (m as any).result === 'team1_win' || (m as any).result === 'team2_win').length
    const draws = matches.filter(m => (m as any).result === 'draw').length
    
    return {
      total,
      wins,
      draws,
      todayCount: todayMatches.length
    }
  }, [matches, todayMatches])

  return {
    // 데이터
    matches,
    recentMatches,
    todayMatches,
    matchStats,

    // 상태
    loading: initialLoading || realtimeLoading,
    error: realtimeError,
    connected,

    // 액션
    saveNewMatchResult,
    refreshMatches
  }
}


export default useMatchRealtime