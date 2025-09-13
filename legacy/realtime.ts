import { createSupabaseBrowser } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

const supabase = createSupabaseBrowser()

// ============================================================================
// 실시간 구독 타입 정의
// ============================================================================

type TeamMemberRow = Database['public']['Tables']['team_members']['Row']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type MatchRow = Database['public']['Tables']['matches']['Row']
type TeamInviteRow = Database['public']['Tables']['team_invites']['Row']

// ============================================================================
// 팀 멤버 실시간 구독
// ============================================================================

export const subscribeToTeamMembers = (
  teamId: string,
  onMemberChange: (payload: RealtimePostgresChangesPayload<TeamMemberRow>) => void
) => {
  const channel = supabase
    .channel(`team_members_${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`
      },
      onMemberChange
    )
    .subscribe()

  return channel
}

// ============================================================================
// 세션 실시간 구독
// ============================================================================

export const subscribeToSession = (
  sessionId: string,
  onSessionChange: (payload: RealtimePostgresChangesPayload<SessionRow>) => void
) => {
  const channel = supabase
    .channel(`session_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      },
      onSessionChange
    )
    .subscribe()

  return channel
}

// ============================================================================
// 팀 세션 목록 실시간 구독
// ============================================================================

export const subscribeToTeamSessions = (
  teamId: string,
  onSessionChange: (payload: RealtimePostgresChangesPayload<SessionRow>) => void
) => {
  const channel = supabase
    .channel(`team_sessions_${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `team_id=eq.${teamId}`
      },
      onSessionChange
    )
    .subscribe()

  return channel
}

// ============================================================================
// 경기 결과 실시간 구독
// ============================================================================

export const subscribeToMatches = (
  teamId: string,
  onMatchChange: (payload: RealtimePostgresChangesPayload<MatchRow>) => void
) => {
  const channel = supabase
    .channel(`matches_${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `team_id=eq.${teamId}`
      },
      onMatchChange
    )
    .subscribe()

  return channel
}

// ============================================================================
// 팀 초대 실시간 구독
// ============================================================================

export const subscribeToTeamInvites = (
  teamId: string,
  onInviteChange: (payload: RealtimePostgresChangesPayload<TeamInviteRow>) => void
) => {
  const channel = supabase
    .channel(`team_invites_${teamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'team_invites',
        filter: `team_id=eq.${teamId}`
      },
      onInviteChange
    )
    .subscribe()

  return channel
}

// ============================================================================
// 브로드캐스트를 통한 실시간 통신
// ============================================================================

// 세션 상태 브로드캐스트
export const broadcastSessionStatus = (
  channel: RealtimeChannel,
  sessionId: string,
  status: 'preparing' | 'in_progress' | 'completed',
  data?: Record<string, unknown>
) => {
  return channel.send({
    type: 'broadcast',
    event: 'session_status',
    payload: {
      sessionId,
      status,
      data,
      timestamp: new Date().toISOString()
    }
  })
}

interface TeamMember {
  id: string
  nickname: string
  position?: string
  [key: string]: unknown
}

// 팀 밸런싱 진행 상태 브로드캐스트
export const broadcastBalancingProgress = (
  channel: RealtimeChannel,
  sessionId: string,
  progress: {
    step: 'selecting' | 'balancing' | 'completed'
    selectedCount?: number
    totalCount?: number
    team1?: TeamMember[]
    team2?: TeamMember[]
  }
) => {
  return channel.send({
    type: 'broadcast',
    event: 'balancing_progress',
    payload: {
      sessionId,
      progress,
      timestamp: new Date().toISOString()
    }
  })
}

// 경기 결과 입력 진행 상태 브로드캐스트
export const broadcastMatchProgress = (
  channel: RealtimeChannel,
  sessionId: string,
  progress: {
    team1Completed: boolean
    team2Completed: boolean
    winner?: 'team1' | 'team2'
  }
) => {
  return channel.send({
    type: 'broadcast',
    event: 'match_progress',
    payload: {
      sessionId,
      progress,
      timestamp: new Date().toISOString()
    }
  })
}

// ============================================================================
// 실시간 채널 관리 유틸리티
// ============================================================================

// 채널 생성 및 브로드캐스트 리스너 설정
export const createSessionChannel = (
  sessionId: string,
  onBroadcast?: (event: string, payload: Record<string, unknown>) => void
) => {
  const channel = supabase.channel(`session_broadcast_${sessionId}`)

  if (onBroadcast) {
    channel
      .on('broadcast', { event: 'session_status' }, ({ payload }: { payload: Record<string, unknown> }) => {
        onBroadcast('session_status', payload)
      })
      .on('broadcast', { event: 'balancing_progress' }, ({ payload }: { payload: Record<string, unknown> }) => {
        onBroadcast('balancing_progress', payload)
      })
      .on('broadcast', { event: 'match_progress' }, ({ payload }: { payload: Record<string, unknown> }) => {
        onBroadcast('match_progress', payload)
      })
  }

  channel.subscribe()
  return channel
}

// 채널 정리 함수
export const cleanupChannel = (channel: RealtimeChannel) => {
  return supabase.removeChannel(channel)
}

// 모든 채널 정리
export const cleanupAllChannels = () => {
  return supabase.removeAllChannels()
}

// ============================================================================
// React Hook 스타일 구독 관리 (향후 사용)
// ============================================================================

// 팀 멤버 변경 사항을 추적하는 훅 스타일 함수
export const useTeamMembersSubscription = (
  teamId: string,
  callback: (members: TeamMemberRow[], changeType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) => {
  let channel: RealtimeChannel | null = null

  const subscribe = () => {
    if (channel) return channel

    channel = subscribeToTeamMembers(teamId, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload
      
      if (eventType === 'INSERT' && newRecord) {
        callback([newRecord], 'INSERT')
      } else if (eventType === 'UPDATE' && newRecord) {
        callback([newRecord], 'UPDATE')
      } else if (eventType === 'DELETE' && oldRecord) {
        callback([oldRecord as TeamMemberRow], 'DELETE')
      }
    })

    return channel
  }

  const unsubscribe = () => {
    if (channel) {
      cleanupChannel(channel)
      channel = null
    }
  }

  return { subscribe, unsubscribe }
}

// 세션 변경 사항을 추적하는 훅 스타일 함수
export const useSessionSubscription = (
  sessionId: string,
  callback: (session: SessionRow, changeType: 'UPDATE') => void
) => {
  let channel: RealtimeChannel | null = null

  const subscribe = () => {
    if (channel) return channel

    channel = subscribeToSession(sessionId, (payload) => {
      const { eventType, new: newRecord } = payload
      
      if (eventType === 'UPDATE' && newRecord) {
        callback(newRecord, 'UPDATE')
      }
    })

    return channel
  }

  const unsubscribe = () => {
    if (channel) {
      cleanupChannel(channel)
      channel = null
    }
  }

  return { subscribe, unsubscribe }
}

// ============================================================================
// 실시간 연결 상태 모니터링
// ============================================================================

export const monitorRealtimeStatus = (
  onStatusChange: (status: 'CONNECTING' | 'OPEN' | 'CLOSED') => void
) => {
  const statusChannel = supabase.channel('realtime-status')
  
  statusChannel
    .on('system', {}, (payload: Record<string, unknown>) => {
      console.log('Realtime system event:', payload)
      // 연결 상태 변화 감지 로직
    })
    .subscribe((status: string) => {
      console.log('Realtime connection status:', status)
      onStatusChange(status as any)
    })

  return statusChannel
}

// ============================================================================
// 실시간 기능 헬퍼 함수들
// ============================================================================

// 실시간 알림 전송 (팀원들에게)
export const notifyTeamMembers = (
  teamId: string,
  notification: {
    type: 'session_created' | 'match_completed' | 'member_joined' | 'member_left'
    title: string
    message: string
    data?: Record<string, unknown>
  }
) => {
  const channel = supabase.channel(`team_notifications_${teamId}`)
  
  return channel.send({
    type: 'broadcast',
    event: 'notification',
    payload: {
      ...notification,
      timestamp: new Date().toISOString()
    }
  })
}

// 실시간 팀 활동 로깅
export const logTeamActivity = (
  teamId: string,
  activity: {
    type: 'session' | 'match' | 'member' | 'invite'
    action: string
    userId: string
    data?: Record<string, unknown>
  }
) => {
  const channel = supabase.channel(`team_activity_${teamId}`)
  
  return channel.send({
    type: 'broadcast',
    event: 'activity_log',
    payload: {
      ...activity,
      timestamp: new Date().toISOString()
    }
  })
}

// 실시간 온라인 사용자 추적
export const trackOnlineUsers = (
  teamId: string,
  userId: string,
  userInfo: { name: string, avatar?: string }
) => {
  const channel: any = (supabase as any).channel(`team_presence_${teamId}`)
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      console.log('Online users:', presenceState)
    })
    .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: Record<string, unknown> }) => {
      console.log('User joined:', newPresences)
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Record<string, unknown> }) => {
      console.log('User left:', leftPresences)
    })
    .subscribe()

  // 구독 후 track
  channel.track({
    userId,
    ...userInfo,
    online_at: new Date().toISOString()
  })

  return channel
}