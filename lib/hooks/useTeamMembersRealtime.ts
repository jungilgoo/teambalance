import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from './useRealtime'
import { getTeamMembers, updateMemberTier } from '../supabase-api'
import { updateMemberPositions } from '../api/members'
import { TeamMember, TierType, Position } from '../types'
import { calculateMemberTierScore } from '../stats'

/**
 * 팀 멤버 실시간 관리 Hook
 * 팀 멤버 목록의 실시간 업데이트를 처리하고 관련 액션들을 제공
 */
export function useTeamMembersRealtime(teamId: string, enabled: boolean = true) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])

  // 실시간 구독 설정
  const {
    data: realtimeData,
    loading: realtimeLoading,
    error: realtimeError,
    connected,
    updateData,
    addItem,
    updateItem,
    removeItem
  } = useRealtime<TeamMember>({
    subscriptionId: `team_members_${teamId}`,
    table: 'team_members',
    initialData: [], // 빈 배열로 시작
    filter: { column: 'team_id', value: teamId },
    enabled,
    onInsert: (newMember) => {
      // 토스트 알림 등을 여기서 처리 가능
    },
    onUpdate: (oldMember, newMember) => {
      // 디버깅이 필요할 때 여기서 로깅 추가
    },
    onDelete: (deletedMember) => {
      // 멤버 추방/탈퇴 알림 처리 가능
    }
  })

  /**
   * 초기 데이터 로드
   */
  const loadInitialData = useCallback(async () => {
    if (!teamId || !enabled) return

    try {
      setInitialLoading(true)
      const teamMembers = await getTeamMembers(teamId)
      
      setMembers(teamMembers)
      updateData(() => teamMembers)
    } catch (error) {
      console.error('[TeamMembers] 초기 데이터 로드 실패:', error)
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
    if (realtimeData && realtimeData.length > 0) {
      setMembers(realtimeData)
    }
  }, [realtimeData])

  /**
   * 활성 멤버만 필터링
   */
  const activeMembers = useMemo(() => 
    members.filter(member => member.status === 'active'),
    [members]
  )

  /**
   * 대기 중인 멤버 (승인 대기)
   */
  const pendingMembers = useMemo(() => 
    members.filter(member => member.status === 'pending'),
    [members]
  )

  /**
   * 팀 리더 찾기
   */
  const teamLeader = useMemo(() => 
    members.find(member => member.role === 'leader' && member.status === 'active'),
    [members]
  )

  /**
   * 티어 업데이트 (로컬 상태 즉시 반영 + API 호출)
   */
  const handleTierUpdate = useCallback(async (memberId: string, newTier: TierType) => {
    // 1. 로컬 상태 즉시 업데이트 (UX 향상)
    updateItem(memberId, (member) => ({
      ...member,
      tier: newTier,
      stats: {
        ...member.stats,
        tierScore: (calculateMemberTierScore as any)((member as any).stats.totalWins, (member as any).stats.totalLosses, newTier)
      }
    }))

    // 2. API 호출로 서버 데이터 업데이트
    try {
      await updateMemberTier(memberId, newTier)
    } catch (error) {
      console.error('[TeamMembers] 티어 업데이트 실패:', error)
      
      // 실패 시 이전 상태로 롤백 (서버에서 실시간 업데이트로 되돌아옴)
      await loadInitialData() // 또는 revert 로직
      throw error
    }
  }, [updateItem, loadInitialData])

  /**
   * 포지션 업데이트 (로컬 상태 즉시 반영 + API 호출)
   */
  const handlePositionUpdate = useCallback(async (
    memberId: string, 
    mainPosition: Position, 
    subPositions: Position[]
  ) => {
    // 1. 로컬 상태 즉시 업데이트
    updateItem(memberId, (member) => ({
      ...member,
      mainPosition,
      subPositions
    }))

    // 2. API 호출
    try {
      await updateMemberPositions(memberId, mainPosition, subPositions)
    } catch (error) {
      console.error('[TeamMembers] 포지션 업데이트 실패:', error)
      
      // 실패 시 롤백
      await loadInitialData()
      throw error
    }
  }, [updateItem, loadInitialData])

  /**
   * 멤버 새로고침
   */
  const refreshMembers = useCallback(async () => {
    await loadInitialData()
  }, [loadInitialData])

  /**
   * 멤버 통계 계산
   */
  const memberStats = useMemo(() => {
    const total = members.length
    const active = activeMembers.length
    const pending = pendingMembers.length
    const kicked = members.filter(m => m.status === 'kicked').length

    return {
      total,
      active,
      pending,
      kicked,
      hasLeader: !!teamLeader
    }
  }, [members, activeMembers, pendingMembers, teamLeader])

  return {
    // 데이터
    members: activeMembers, // 기본적으로 활성 멤버만 반환
    allMembers: members, // 전체 멤버 (상태 무관)
    pendingMembers,
    teamLeader,
    memberStats,

    // 상태
    loading: initialLoading || realtimeLoading,
    error: realtimeError,
    connected,

    // 액션
    handleTierUpdate,
    handlePositionUpdate,
    refreshMembers,

    // 유틸리티
    addItem,
    updateItem,
    removeItem
  }
}

/**
 * 특정 멤버 한 명에 대한 실시간 구독 Hook
 */
export function useTeamMemberRealtime(teamId: string, memberId: string) {
  const { allMembers, loading, error, connected, refreshMembers } = useTeamMembersRealtime(teamId)
  
  const member = useMemo(() => 
    allMembers.find(m => m.id === memberId),
    [allMembers, memberId]
  )

  return {
    member,
    loading,
    error,
    connected,
    refreshMember: refreshMembers
  }
}

export default useTeamMembersRealtime