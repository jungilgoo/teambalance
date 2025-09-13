import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from './useRealtime'
import { getPendingJoinRequests } from '../supabase-api'

// 실시간 데이터에서 받는 멤버 타입
interface RealtimeMember {
  id: string
  user_id?: string
  userId?: string
  nickname: string
  status: string
  joined_at?: string
  joinedAt?: string
}

/**
 * 팀 가입 승인 대기 요청 실시간 관리 Hook
 * team_members 테이블에서 status='pending'인 레코드들을 실시간으로 추적
 */
export function usePendingRequestsRealtime(teamId: string, enabled: boolean = true) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string
    userId: string
    nickname: string
    requestedAt: Date
  }>>([])

  // team_members 테이블의 pending 상태 레코드들을 실시간으로 구독
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    connected,
    updateData
  } = useRealtime({
    subscriptionId: `pending_requests_${teamId}`,
    table: 'team_members',
    initialData: [],
    filter: { column: 'team_id', value: teamId },
    enabled,
    onInsert: (newMember) => {
      if ((newMember as any).status === 'pending') {
        // 여기서 알림을 표시할 수 있음
      }
    },
    onUpdate: (oldMember, newMember) => {
      // pending → active/kicked 상태 변경 감지
      if ((oldMember as any).status === 'pending' && (newMember as any).status !== 'pending') {
        // 요청 처리 완료 알림 처리
      }
    },
    onDelete: (deletedMember) => {
      if ((deletedMember as any).status === 'pending') {
        // 가입 요청 취소 처리
      }
    }
  })

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = useCallback(async () => {
    if (!teamId || !enabled) return

    try {
      setInitialLoading(true)
      const requests = await getPendingJoinRequests(teamId)
      
      // team_members 테이블의 데이터를 UI에 맞는 형태로 변환
      const formattedRequests = requests.map(request => ({
        id: request.id,
        userId: request.userId,
        nickname: request.nickname,
        requestedAt: request.joinedAt
      }))
      
      setPendingRequests(formattedRequests)
      ;(updateData as any)(() => requests) // 실시간 구독에도 데이터 설정
    } catch (error) {
      console.error('[PendingRequests] 초기 데이터 로드 실패:', error)
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
   * 실시간 데이터에서 pending 상태 레코드만 필터링하여 로컬 상태 업데이트
   */
  useEffect(() => {
    if (realtimeData) {
      const pendingOnly = realtimeData
        .filter((member: RealtimeMember) => member.status === 'pending')
        .map((member: RealtimeMember) => ({
          id: member.id,
          userId: member.user_id || member.userId || '',
          nickname: member.nickname,
          requestedAt: new Date(member.joined_at || member.joinedAt || new Date())
        }))
      
      setPendingRequests(pendingOnly)
    }
  }, [realtimeData])

  /**
   * 수동 새로고침
   */
  const refreshRequests = useCallback(async () => {
    await loadInitialData()
  }, [loadInitialData])

  /**
   * 요청 수 계산
   */
  const requestCount = pendingRequests.length

  /**
   * 최근 요청 (가장 최근에 요청한 순서대로)
   */
  const recentRequests = [...pendingRequests].sort((a, b) => 
    b.requestedAt.getTime() - a.requestedAt.getTime()
  )

  return {
    // 데이터
    pendingRequests: recentRequests,
    requestCount,

    // 상태
    loading: initialLoading || realtimeLoading,
    error: realtimeError,
    connected,

    // 액션
    refreshRequests
  }
}

/**
 * 간단한 승인 대기 카운트만 추적하는 Hook
 */
export function usePendingRequestsCount(teamId: string, enabled: boolean = true) {
  const { requestCount, loading, error, connected } = usePendingRequestsRealtime(teamId, enabled)

  return {
    count: requestCount,
    loading,
    error,
    connected
  }
}

export default usePendingRequestsRealtime