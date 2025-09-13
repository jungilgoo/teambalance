import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { realtimeManager, RealtimeFilter } from '../supabase-realtime'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ID를 가진 객체 타입 정의
interface WithId {
  id: string
}

/**
 * 범용 실시간 데이터 구독 Hook
 * Supabase Realtime을 React Hook으로 래핑하여 컴포넌트에서 사용하기 쉽게 만듦
 */
export function useRealtime<T = any>({
  subscriptionId,
  table,
  initialData = [],
  filter,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete
}: {
  subscriptionId: string
  table: string
  initialData?: any[]
  filter?: RealtimeFilter
  enabled?: boolean
  onInsert?: (record: any) => void
  onUpdate?: (oldRecord: any, newRecord: any) => void
  onDelete?: (record: any) => void
}) {
  const [data, setData] = useState<any[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  
  // 컴포넌트가 언마운트되어도 구독 ID가 유지되도록 ref 사용
  const subscriptionIdRef = useRef(subscriptionId)
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })

  // 콜백 함수들을 최신 상태로 유지
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete }
  })

  /**
   * Realtime 이벤트 처리 함수
   */
  const handleRealtimeEvent = useMemo(() => 
    (payload: RealtimePostgresChangesPayload<any>) => {
      console.log(`[useRealtime] ${subscriptionIdRef.current} 이벤트 처리:`, payload.eventType)

      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            const newRecord = payload.new as T
            setData(prev => {
              // 중복 방지: ID가 같은 레코드가 이미 있으면 추가하지 않음
              const recordId = (newRecord as any).id
              if (recordId && prev.some((item: any) => (item as any).id === recordId)) {
                return prev
              }
              return [...prev, newRecord]
            })
            callbacksRef.current.onInsert?.(newRecord)
          }
          break

        case 'UPDATE':
          if (payload.new && payload.old) {
            const newRecord = payload.new as T
            const oldRecord = payload.old as T
            const recordId = (newRecord as any).id

            setData(prev => prev.map((item: T) => 
              (item as any).id === recordId ? newRecord : item
            ))
            callbacksRef.current.onUpdate?.(oldRecord, newRecord)
          }
          break

        case 'DELETE':
          if (payload.old) {
            const deletedRecord = payload.old as T
            const recordId = (deletedRecord as any).id

            setData(prev => prev.filter((item: any) => (item as any).id !== recordId))
            callbacksRef.current.onDelete?.(deletedRecord)
          }
          break

        default:
          console.warn(`[useRealtime] 알 수 없는 이벤트 타입:`, (payload as any).eventType)
      }
    }, [] // 빈 의존성 배열 - ref로 최신 값들 참조
  )

  /**
   * 수동 데이터 새로고침
   */
  const refresh = useCallback((newData: T[]) => {
    setData(newData)
    setError(null)
  }, [])

  /**
   * 데이터 직접 업데이트 (API 호출 후 사용)
   */
  const updateData = useCallback((updater: (prev: any[]) => any[]) => {
    setData(updater)
  }, [])

  /**
   * 특정 아이템 추가
   */
  const addItem = useCallback((item: any) => {
    setData(prev => {
      const itemId = (item as any).id
      if (itemId && prev.some((existing: any) => (existing as any).id === itemId)) {
        return prev // 이미 존재하면 추가하지 않음
      }
      return [...prev, item]
    })
  }, [])

  /**
   * 특정 아이템 업데이트
   */
  const updateItem = useCallback((id: string, updater: (item: any) => any) => {
    setData(prev => prev.map((item: T) => 
      (item as any).id === id ? updater(item) : item
    ))
  }, [])

  /**
   * 특정 아이템 제거
   */
  const removeItem = useCallback((id: string) => {
    setData(prev => prev.filter((item: any) => (item as any).id !== id))
  }, [])

  /**
   * 구독 설정 및 정리
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    let isActive = true
    setLoading(true)
    setError(null)

    const setupSubscription = async () => {
      try {
        const success = await realtimeManager.subscribe(
          subscriptionIdRef.current,
          table,
          handleRealtimeEvent as any,
          filter
        )

        if (isActive) {
          setConnected(success)
          setLoading(false)
          
          if (!success) {
            setError('실시간 구독 설정에 실패했습니다.')
          }
        }
      } catch (err) {
        if (isActive) {
          console.error(`[useRealtime] 구독 설정 오류:`, err)
          setError('실시간 구독 중 오류가 발생했습니다.')
          setConnected(false)
          setLoading(false)
        }
      }
    }

    setupSubscription()

    // 정리 함수
    return () => {
      isActive = false
      realtimeManager.unsubscribe(subscriptionIdRef.current)
      setConnected(false)
    }
  }, [enabled, table, filter?.column, filter?.value, handleRealtimeEvent])

  /**
   * subscriptionId 변경 시 업데이트
   */
  useEffect(() => {
    subscriptionIdRef.current = subscriptionId
  }, [subscriptionId])

  // enabled 상태가 변경될 때 기존 구독 정리
  useEffect(() => {
    return () => {
      if (!enabled) {
        realtimeManager.unsubscribe(subscriptionIdRef.current)
        setConnected(false)
      }
    }
  }, [enabled])

  return {
    data,
    loading,
    error,
    connected,
    refresh,
    updateData,
    addItem,
    updateItem,
    removeItem
  }
}

/**
 * 단순한 실시간 연결 상태만 확인하는 Hook
 */
export function useRealtimeConnection(subscriptionId: string, table: string, filter?: RealtimeFilter) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const checkConnection = async () => {
      try {
        const success = await realtimeManager.subscribe(
          `${subscriptionId}_connection`,
          table,
          () => {}, // 빈 콜백
          filter
        )

        if (isActive) {
          setConnected(success)
          setError(success ? null : '연결에 실패했습니다.')
        }
      } catch (err) {
        if (isActive) {
          setError('연결 확인 중 오류가 발생했습니다.')
          setConnected(false)
        }
      }
    }

    checkConnection()

    return () => {
      isActive = false
      realtimeManager.unsubscribe(`${subscriptionId}_connection`)
    }
  }, [subscriptionId, table, filter])

  return { connected, error }
}

export default useRealtime