import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from './useRealtime'
import { getSession, updateSession } from '../supabase-api'
import { Session } from '../types'

/**
 * 세션 실시간 관리 Hook
 * 세션 상태 변경을 실시간으로 추적하고 관련 액션들을 제공
 */
export function useSessionRealtime(sessionId: string, enabled: boolean = true) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  // 실시간 구독 설정
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    connected,
    updateData
  } = useRealtime<Session>({
    subscriptionId: `session_${sessionId}`,
    table: 'sessions',
    initialData: [],
    filter: { column: 'id', value: sessionId },
    enabled: !!sessionId && enabled,
    onInsert: (newSession) => {
      console.log(`[SessionRealtime] 새 세션 생성:`, newSession.id)
    },
    onUpdate: (oldSession, newSession) => {
      console.log(`[SessionRealtime] 세션 상태 변경:`, {
        sessionId: newSession.id,
        changes: {
          status: oldSession.status !== newSession.status ? `${oldSession.status} → ${newSession.status}` : undefined,
          result: oldSession.result !== newSession.result ? `${oldSession.result} → ${newSession.result}` : undefined
        }
      })
    },
    onDelete: (deletedSession) => {
      console.log(`[SessionRealtime] 세션 삭제:`, deletedSession.id)
    }
  })

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = useCallback(async () => {
    if (!sessionId || !enabled) return

    try {
      setInitialLoading(true)
      console.log(`[SessionRealtime] 초기 데이터 로드 시작: ${sessionId}`)
      
      const sessionData = await getSession(sessionId)
      if (sessionData) {
        // console.log(`[SessionRealtime] 초기 데이터 로드 완료:`, sessionData && (sessionData as any).status)
        (setSession as any)(sessionData)
        (updateData as any)(() => [sessionData])
      } else {
        console.warn(`[SessionRealtime] 세션을 찾을 수 없음: ${sessionId}`)
        setSession(null)
      }
    } catch (error) {
      console.error('[SessionRealtime] 초기 데이터 로드 실패:', error)
    } finally {
      setInitialLoading(false)
    }
  }, [sessionId, enabled, updateData])

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
    if (realtimeData && realtimeData.length > 0) {
      const sessionData = realtimeData.find(s => s.id === sessionId)
      if (sessionData) {
        (setSession as any)(sessionData)
      }
    }
  }, [realtimeData, sessionId])

  /**
   * 세션 상태 업데이트 (로컬 상태 즉시 반영 + API 호출)
   */
  const updateSessionStatus = useCallback(async (
    status: 'waiting' | 'in_progress' | 'completed' | 'cancelled',
    additionalData?: Partial<Session>
  ) => {
    if (!session) return

    // 1. 로컬 상태 즉시 업데이트 (UX 향상)
    const updatedSession = { ...session, status, ...additionalData }
    setSession(updatedSession)

    // 2. API 호출로 서버 데이터 업데이트
    try {
      await updateSession(sessionId, { status: status as any, ...additionalData } as any)
      console.log(`[SessionRealtime] 세션 상태 업데이트 성공: ${sessionId} → ${status}`)
    } catch (error) {
      console.error('[SessionRealtime] 세션 상태 업데이트 실패:', error)
      
      // 실패 시 이전 상태로 롤백
      await loadInitialData()
      throw error
    }
  }, [session, sessionId, loadInitialData])

  /**
   * 세션 시작
   */
  const startSession = useCallback(async () => {
    await updateSessionStatus('in_progress', {
      startedAt: new Date()
    })
  }, [updateSessionStatus])

  /**
   * 세션 완료
   */
  const completeSession = useCallback(async (result: 'team1_win' | 'team2_win' | 'draw') => {
    await updateSessionStatus('completed', {
      result: result as any,
      completedAt: new Date()
    })
  }, [updateSessionStatus])

  /**
   * 세션 취소
   */
  const cancelSession = useCallback(async () => {
    await updateSessionStatus('cancelled')
  }, [updateSessionStatus])

  /**
   * 세션 새로고침
   */
  const refreshSession = useCallback(async () => {
    await loadInitialData()
  }, [loadInitialData])

  /**
   * 세션 상태 계산
   */
  const sessionStatus = useMemo(() => {
    if (!session) return { 
      canStart: false, 
      canComplete: false, 
      canCancel: false,
      isWaiting: false,
      isInProgress: false,
      isCompleted: false,
      isCancelled: false
    }

    const isWaiting = session.status === 'waiting'
    const isInProgress = session.status === 'in_progress'
    const isCompleted = session.status === 'completed'
    const isCancelled = session.status === 'cancelled'

    return {
      canStart: isWaiting,
      canComplete: isInProgress,
      canCancel: isWaiting || isInProgress,
      isWaiting,
      isInProgress,
      isCompleted,
      isCancelled
    }
  }, [session])

  /**
   * 세션 참가자 정보
   */
  const sessionInfo = useMemo(() => {
    if (!session) return null

    return {
      id: session.id,
      teamId: session.teamId,
      status: session.status,
      result: (session as any).result,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      team1Members: session.team1Members,
      team2Members: session.team2Members,
      totalPlayers: (session.team1Members?.length || 0) + (session.team2Members?.length || 0)
    }
  }, [session])

  return {
    // 데이터
    session,
    sessionInfo,
    sessionStatus,

    // 상태
    loading: initialLoading || realtimeLoading,
    error: realtimeError,
    connected,

    // 액션
    updateSessionStatus,
    startSession,
    completeSession,
    cancelSession,
    refreshSession
  }
}

/**
 * 팀의 모든 세션들을 실시간으로 추적하는 Hook
 */
export function useTeamSessionsRealtime(teamId: string, enabled: boolean = true) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])

  // 실시간 구독 설정
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    connected,
    updateData
  } = useRealtime<Session>({
    subscriptionId: `team_sessions_${teamId}`,
    table: 'sessions',
    initialData: [],
    filter: { column: 'team_id', value: teamId },
    enabled: !!teamId && enabled,
    onInsert: (newSession) => {
      console.log(`[TeamSessions] 새 세션 생성:`, newSession.id)
      // 새 세션 생성 알림을 여기서 처리 가능
    },
    onUpdate: (oldSession, newSession) => {
      console.log(`[TeamSessions] 세션 업데이트:`, {
        sessionId: newSession.id,
        status: newSession.status
      })
    },
    onDelete: (deletedSession) => {
      console.log(`[TeamSessions] 세션 삭제:`, deletedSession.id)
    }
  })

  /**
   * 초기 데이터 로드는 여기서는 생략 (필요시 구현)
   */
  useEffect(() => {
    if (realtimeData) {
      setSessions(realtimeData)
    }
  }, [realtimeData])

  /**
   * 활성 세션들 (대기 중 또는 진행 중)
   */
  const activeSessions = useMemo(() => 
    sessions.filter(session => 
      session.status === 'waiting' || session.status === 'in_progress'
    ),
    [sessions]
  )

  /**
   * 최근 완료된 세션들
   */
  const recentCompletedSessions = useMemo(() => 
    sessions
      .filter(session => session.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 5),
    [sessions]
  )

  return {
    // 데이터
    sessions,
    activeSessions,
    recentCompletedSessions,
    activeSessionCount: activeSessions.length,

    // 상태
    loading: initialLoading || realtimeLoading,
    error: realtimeError,
    connected
  }
}

export default useSessionRealtime