/**
 * TeamBalance - HTTPOnly 쿠키 기반 인증 클라이언트
 * 작성일: 2025-01-03
 * 목적: 안전한 쿠키 기반 인증 시스템으로 XSS 공격 방지
 */

import { User } from './types'

// =================================================================
// 인증 상태 관리
// =================================================================

export interface SecureAuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

// 전역 인증 상태 (메모리에만 저장)
let currentAuthState: SecureAuthState = {
  isAuthenticated: false,
  user: null,
  loading: true
}

// 인증 상태 변경 리스너들
const authStateListeners: Set<(state: SecureAuthState) => void> = new Set()

// =================================================================
// API 통신 함수들
// =================================================================

/**
 * HTTPOnly 쿠키 기반 로그인
 * @param email 이메일
 * @param password 비밀번호
 * @param rememberMe 로그인 유지 여부
 * @returns 로그인 결과
 */
export const cookieLogin = async (
  email: string, 
  password: string, 
  rememberMe: boolean = false
): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({ email, password, rememberMe })
    })

    const result = await response.json()

    if (result.success && result.user) {
      // 인증 상태 업데이트
      const newState: SecureAuthState = {
        isAuthenticated: true,
        user: {
          ...result.user,
          createdAt: new Date() // 기본값 설정
        },
        loading: false
      }
      
      updateAuthState(newState)
      return { success: true, user: newState.user }
    }

    return { success: false, message: result.message }

  } catch (error) {
    console.error('쿠키 로그인 오류:', error)
    return { success: false, message: '네트워크 오류가 발생했습니다.' }
  }
}

/**
 * 하이브리드 로그인 (이메일 또는 닉네임)
 * 기존 함수와 호환성을 위해 제공
 */
export const hybridCookieLogin = async (
  identifier: string,
  password: string,
  rememberMe: boolean = false
): Promise<{ success: boolean; user?: User; message?: string }> => {
  // 이메일 형식인지 확인
  const isEmail = identifier.includes('@')
  
  if (isEmail) {
    return cookieLogin(identifier, password, rememberMe)
  } else {
    // 닉네임으로 로그인 시도 (이메일로 변환 필요)
    // 현재는 이메일 로그인만 지원하므로 에러 반환
    return { 
      success: false, 
      message: '현재는 이메일 로그인만 지원합니다. 닉네임 로그인은 곧 지원예정입니다.' 
    }
  }
}

/**
 * HTTPOnly 쿠키 기반 로그아웃
 */
export const cookieLogout = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include' // 쿠키 포함
    })

    const result = await response.json()

    // 로그아웃 성공 여부와 관계없이 클라이언트 상태 초기화
    const newState: SecureAuthState = {
      isAuthenticated: false,
      user: null,
      loading: false
    }
    
    updateAuthState(newState)
    
    return { success: true, message: result.message }

  } catch (error) {
    console.error('쿠키 로그아웃 오류:', error)
    
    // 에러가 발생해도 클라이언트 상태는 초기화
    const newState: SecureAuthState = {
      isAuthenticated: false,
      user: null,
      loading: false
    }
    
    updateAuthState(newState)
    
    return { success: true, message: '로그아웃되었습니다.' }
  }
}

/**
 * 현재 사용자 세션 확인
 */
export const checkCookieAuth = async (): Promise<SecureAuthState> => {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include' // 쿠키 포함
    })

    const result = await response.json()

    if (result.success && result.user) {
      const newState: SecureAuthState = {
        isAuthenticated: true,
        user: {
          ...result.user,
          createdAt: new Date() // 기본값 설정
        },
        loading: false
      }
      
      updateAuthState(newState)
      return newState
    } else {
      const newState: SecureAuthState = {
        isAuthenticated: false,
        user: null,
        loading: false
      }
      
      updateAuthState(newState)
      return newState
    }

  } catch (error) {
    console.error('세션 확인 오류:', error)
    
    const newState: SecureAuthState = {
      isAuthenticated: false,
      user: null,
      loading: false
    }
    
    updateAuthState(newState)
    return newState
  }
}

/**
 * 토큰 자동 갱신
 */
export const refreshCookieAuth = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include' // 쿠키 포함
    })

    const result = await response.json()

    if (result.success) {
      // 갱신 성공 시 사용자 정보 다시 확인
      await checkCookieAuth()
      return { success: true, message: result.message }
    } else {
      // 갱신 실패 시 로그아웃 처리
      const newState: SecureAuthState = {
        isAuthenticated: false,
        user: null,
        loading: false
      }
      
      updateAuthState(newState)
      return { success: false, message: result.message }
    }

  } catch (error) {
    console.error('토큰 갱신 오류:', error)
    return { success: false, message: '토큰 갱신에 실패했습니다.' }
  }
}

// =================================================================
// 상태 관리 함수들
// =================================================================

/**
 * 인증 상태 업데이트 및 리스너 알림
 */
const updateAuthState = (newState: SecureAuthState) => {
  currentAuthState = newState
  
  // 모든 리스너에게 상태 변경 알림
  authStateListeners.forEach(listener => {
    try {
      listener(newState)
    } catch (error) {
      console.error('인증 상태 리스너 오류:', error)
    }
  })
}

/**
 * 현재 인증 상태 반환
 */
export const getCookieAuthState = (): SecureAuthState => {
  return { ...currentAuthState }
}

/**
 * 인증 상태 변경 리스너 등록
 */
export const subscribeCookieAuthState = (listener: (state: SecureAuthState) => void): () => void => {
  authStateListeners.add(listener)
  
  // 즉시 현재 상태 알림
  listener(currentAuthState)
  
  // 구독 해제 함수 반환
  return () => {
    authStateListeners.delete(listener)
  }
}

/**
 * 인증 여부 확인 (편의 함수)
 */
export const isCookieAuthenticated = (): boolean => {
  return currentAuthState.isAuthenticated
}

/**
 * 현재 사용자 정보 반환 (편의 함수)
 */
export const getCookieCurrentUser = (): User | null => {
  return currentAuthState.user
}

// =================================================================
// 자동 토큰 갱신 시스템 
// =================================================================

let refreshTimer: NodeJS.Timeout | null = null

/**
 * 자동 토큰 갱신 시작 (23시간마다)
 */
export const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  // 23시간마다 토큰 갱신 시도
  refreshTimer = setInterval(async () => {
    if (currentAuthState.isAuthenticated) {
      const result = await refreshCookieAuth()
      if (!result.success) {
        console.warn('자동 토큰 갱신 실패:', result.message)
      }
    }
  }, 23 * 60 * 60 * 1000) // 23시간
}

/**
 * 자동 토큰 갱신 중지
 */
export const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// =================================================================
// 애플리케이션 초기화
// =================================================================

/**
 * 쿠키 인증 시스템 초기화
 * 앱 시작 시 한 번 호출
 */
export const initializeCookieAuth = async () => {
  // 현재 세션 확인
  await checkCookieAuth()
  
  // 자동 갱신 시작
  if (currentAuthState.isAuthenticated) {
    startAutoRefresh()
  }
}

// 브라우저 환경에서 자동 초기화
if (typeof window !== 'undefined') {
  initializeCookieAuth()
}