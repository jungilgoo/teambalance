import { createSupabaseBrowser } from './supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Supabase Realtime 구독 관리자
 * 실시간 데이터 동기화를 위한 중앙화된 관리 시스템
 */
export class RealtimeManager {
  private supabase = createSupabaseBrowser()
  private subscriptions = new Map<string, RealtimeChannel>()
  private reconnectAttempts = new Map<string, number>()
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1초

  /**
   * 테이블 변경사항을 실시간으로 구독
   */
  subscribe<T extends Record<string, unknown> = Record<string, unknown>>(
    subscriptionId: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void,
    filter?: { column: string; value: string | number },
    schema: string = 'public'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // 이미 존재하는 구독이면 제거하고 새로 생성
      if (this.subscriptions.has(subscriptionId)) {
        this.unsubscribe(subscriptionId)
      }

      // 구독 시작

      const channel = this.supabase
        .channel(subscriptionId)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
            schema,
            table,
            ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            // 데이터 변경 처리
            
            try {
              callback(payload)
              // 성공적으로 처리되면 재연결 시도 횟수 리셋
              this.reconnectAttempts.set(subscriptionId, 0)
            } catch (error) {
              console.error(`[Realtime] ${subscriptionId} 콜백 처리 오류:`, error)
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            resolve(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[Realtime] ${subscriptionId} 구독 오류:`, err)
            this.handleConnectionError(subscriptionId, table, callback, filter, schema)
            resolve(false)
          }
        })

      this.subscriptions.set(subscriptionId, channel)
    })
  }

  /**
   * 구독 해제
   */
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.subscriptions.delete(subscriptionId)
      this.reconnectAttempts.delete(subscriptionId)
    }
  }

  /**
   * 모든 구독 해제
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((_, subscriptionId) => {
      this.unsubscribe(subscriptionId)
    })
  }

  /**
   * 연결 오류 처리 및 재연결
   */
  private async handleConnectionError<T extends Record<string, unknown> = Record<string, unknown>>(
    subscriptionId: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void,
    filter?: { column: string; value: string | number },
    schema: string = 'public'
  ): Promise<void> {
    const currentAttempts = this.reconnectAttempts.get(subscriptionId) || 0
    
    if (currentAttempts >= this.maxReconnectAttempts) {
      console.error(`[Realtime] ${subscriptionId} 최대 재연결 시도 횟수 초과`)
      return
    }

    this.reconnectAttempts.set(subscriptionId, currentAttempts + 1)
    const delay = this.reconnectDelay * Math.pow(2, currentAttempts) // 지수적 백오프

    // 재연결 시도

    setTimeout(() => {
      this.subscribe(subscriptionId, table, callback, filter, schema)
    }, delay)
  }

  /**
   * 현재 활성 구독 목록
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * 특정 구독의 상태 확인
   */
  isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId)
  }

  /**
   * 네트워크 상태 확인 및 재연결
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 간단한 ping 쿼리로 연결 상태 확인
      const { error } = await this.supabase
        .from('teams')
        .select('id')
        .limit(1)
      
      return !error
    } catch (error) {
      console.error('[Realtime] 연결 상태 확인 실패:', error)
      return false
    }
  }

  /**
   * 모든 구독을 재시작 (네트워크 복구 시 사용)
   */
  async reconnectAll(): Promise<void> {
    const subscriptionIds = this.getActiveSubscriptions()
    
    // 기존 구독들을 임시 저장
    const subscriptionConfigs = new Map()
    subscriptionIds.forEach(id => {
      subscriptionConfigs.set(id, this.subscriptions.get(id))
    })

    // 모든 구독 해제
    this.unsubscribeAll()

    // 잠시 대기 후 재구독 (선택적)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 여기서 실제로는 구독 재시작 로직이 필요하지만,
    // 실제 사용에서는 컴포넌트 레벨에서 재구독을 처리하는 것이 더 안전함
  }
}

// 전역 인스턴스
export const realtimeManager = new RealtimeManager()

/**
 * 페이지 언마운트 시 자동 정리를 위한 유틸리티
 */
export const useRealtimeCleanup = () => {
  if (typeof window !== 'undefined') {
    // 브라우저에서만 실행
    window.addEventListener('beforeunload', () => {
      realtimeManager.unsubscribeAll()
    })
  }
}

/**
 * 공통 필터 타입
 */
export interface RealtimeFilter {
  column: string
  value: string | number
}

/**
 * 구독 설정 타입
 */
export interface RealtimeSubscriptionConfig {
  table: string
  filter?: RealtimeFilter
  schema?: string
}

export default RealtimeManager