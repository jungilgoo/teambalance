'use client'

/**
 * TeamBalance - 인증 상태 제공자
 * 작성일: 2025-01-03
 * 목적: 앱 전체의 인증 상태를 관리하고 HTTPOnly 쿠키 시스템 초기화
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthState } from '@/lib/types'
import { 
  initializeAuth, 
  onAuthStateChange, 
  getAuthStateSync,
  type AuthState as LibAuthState
} from '@/lib/auth'
import { 
  initializeCookieAuth,
  subscribeCookieAuthState,
  type SecureAuthState 
} from '@/lib/auth-cookie'

// 인증 컨텍스트 타입
interface AuthContextType {
  authState: AuthState
  refreshAuth: () => Promise<void>
  isLoading: boolean
}

// 인증 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// AuthProvider 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  })
  const [isLoading, setIsLoading] = useState(true)

  // 인증 상태 새로고침
  const refreshAuth = async () => {
    try {
      setIsLoading(true)
      const newState = await initializeAuth()
      setAuthState(newState)
    } catch (error) {
      console.error('인증 상태 새로고침 오류:', error)
      setAuthState({ isAuthenticated: false, user: null, loading: false })
    } finally {
      setIsLoading(false)
    }
  }

  // 초기화
  useEffect(() => {
    const initAuth = async () => {
      try {
        // HTTPOnly 쿠키 시스템 초기화
        await initializeCookieAuth()
        
        // 인증 상태 초기화
        const initialState = await initializeAuth()
        setAuthState(initialState)
        
        // 쿠키 기반 인증 상태 변경 리스너 등록
        const unsubscribeCookie = subscribeCookieAuthState((cookieState: SecureAuthState) => {
          const newAuthState: AuthState = {
            isAuthenticated: cookieState.isAuthenticated,
            user: cookieState.user,
            loading: cookieState.loading
          }
          setAuthState(newAuthState)
        })
        
        // Supabase 인증 상태 변경 리스너 등록 (백업)
        const { data: { subscription } } = onAuthStateChange((supabaseState: LibAuthState) => {
          // 쿠키 상태와 동기화
          setAuthState(supabaseState)
        })

        return () => {
          unsubscribeCookie()
          subscription?.unsubscribe()
        }
      } catch (error) {
        console.error('인증 초기화 오류:', error)
        setAuthState({ isAuthenticated: false, user: null, loading: false })
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider value={{
      authState,
      refreshAuth,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// 인증 컨텍스트 사용 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 편의 훅들
export function useUser(): User | null {
  const { authState } = useAuth()
  return authState.user
}

export function useIsAuthenticated(): boolean {
  const { authState } = useAuth()
  return authState.isAuthenticated
}

export function useAuthLoading(): boolean {
  const { authState, isLoading } = useAuth()
  return authState.loading || isLoading
}