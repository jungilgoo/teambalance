import { User, AuthState } from './types'
import { createSupabaseBrowser } from './supabase'
import { 
  cookieLogin,
  hybridCookieLogin, 
  cookieLogout, 
  getCookieAuthState, 
  checkCookieAuth,
  subscribeCookieAuthState,
  isCookieAuthenticated,
  getCookieCurrentUser,
  type SecureAuthState
} from './auth-cookie'

// Supabase 클라이언트
const supabase = createSupabaseBrowser()

// 인증 에러 메시지 처리 함수
const getAuthErrorMessage = (error: any): string => {
  if (error.message.includes('Invalid login credentials')) {
    return '로그인 정보가 일치하지 않습니다.'
  } else if (error.message.includes('Email not confirmed')) {
    return '계정 활성화가 필요합니다. 잠시 후 다시 시도해주세요.'
  } else if (error.message.includes('Email rate limit exceeded')) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
  } else if (error.message.includes('존재하지 않는')) {
    return error.message
  } else {
    return '로그인에 실패했습니다.'
  }
}

// 인증 상태 캐시
let authStateCache: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true
}

// 로컬 스토리지에서 인증 상태 복원
const restoreAuthFromStorage = (): AuthState | null => {
  try {
    if (typeof window === 'undefined') return null
    
    const stored = localStorage.getItem('teambalance_auth_state')
    if (stored) {
      const parsed = JSON.parse(stored)
      // 만료 시간 체크 (1시간)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
        return {
          isAuthenticated: parsed.isAuthenticated,
          user: parsed.user ? {
            ...parsed.user,
            createdAt: new Date(parsed.user.createdAt)
          } : null,
          loading: false
        }
      }
    }
  } catch (error) {
    console.error('로컬 스토리지 복원 오류:', error)
  }
  return null
}

// 로컬 스토리지에 인증 상태 저장
const saveAuthToStorage = (authState: AuthState) => {
  try {
    if (typeof window === 'undefined') return
    
    localStorage.setItem('teambalance_auth_state', JSON.stringify({
      isAuthenticated: authState.isAuthenticated,
      user: authState.user,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('로컬 스토리지 저장 오류:', error)
  }
}

// Profile 데이터를 User 타입으로 변환하는 헬퍼 함수
const mapProfileToUser = (profile: any): User => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  username: profile.username || undefined,
  avatar: profile.avatar_url || undefined,
  provider: profile.provider as 'kakao' | 'naver' | 'google',
  createdAt: new Date(profile.created_at)
})

// 현재 사용자 프로필 가져오기
const fetchUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('프로필 조회 오류:', error)
      return null
    }

    return profile ? mapProfileToUser(profile) : null
  } catch (error) {
    console.error('프로필 조회 중 예외 발생:', error)
    return null
  }
}

// 인증 상태 초기화 (앱 시작 시 호출) - HTTPOnly 쿠키 기반
export const initializeAuth = async (): Promise<AuthState> => {
  try {
    // HTTPOnly 쿠키 세션 확인
    const cookieAuthState = await checkCookieAuth()
    
    // 기존 캐시와 동기화
    authStateCache = {
      isAuthenticated: cookieAuthState.isAuthenticated,
      user: cookieAuthState.user,
      loading: cookieAuthState.loading
    }
    
    // localStorage 백업 (호환성)
    if (authStateCache.isAuthenticated) {
      saveAuthToStorage(authStateCache)
    } else {
      // 로그인되지 않았으면 localStorage도 정리
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teambalance_auth_state')
      }
    }

    return authStateCache
  } catch (error) {
    console.error('인증 초기화 오류:', error)
    authStateCache = { isAuthenticated: false, user: null, loading: false }
    return authStateCache
  }
}


// 이메일 로그인 (HTTPOnly 쿠키 기반)
export const emailLogin = async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
  try {
    const result = await cookieLogin(email, password, rememberMe)
    
    if (!result.success || !result.user) {
      throw new Error(result.message || '로그인에 실패했습니다.')
    }

    // 기존 캐시와 동기화
    authStateCache = {
      isAuthenticated: true,
      user: result.user,
      loading: false
    }
    
    // localStorage 백업 (호환성)
    saveAuthToStorage(authStateCache)

    return result.user
  } catch (error: any) {
    console.error('이메일 로그인 오류:', error)
    authStateCache = { isAuthenticated: false, user: null, loading: false }
    throw error
  }
}

// 하이브리드 로그인 (이메일 또는 닉네임) - HTTPOnly 쿠키 기반
export const hybridLogin = async (loginId: string, password: string, rememberMe: boolean = false): Promise<User> => {
  try {
    const result = await hybridCookieLogin(loginId, password, rememberMe)
    
    if (!result.success || !result.user) {
      throw new Error(result.message || '로그인에 실패했습니다.')
    }

    // 기존 캐시와 동기화
    authStateCache = {
      isAuthenticated: true,
      user: result.user,
      loading: false
    }
    
    // localStorage 백업 (호환성)
    saveAuthToStorage(authStateCache)

    return result.user
  } catch (error: any) {
    console.error('하이브리드 로그인 오류:', error)
    authStateCache = { isAuthenticated: false, user: null, loading: false }
    throw error
  }
}

// 회원가입 (이메일, 닉네임 지원)
export const signUp = async (
  email: string, 
  password: string, 
  name: string, 
  username?: string, 
  provider: 'email' | 'kakao' | 'naver' | 'google' = 'email'
): Promise<User> => {
  try {
    // 닉네임 유효성 및 중복 검사
    if (username) {
      const { validateUsername, checkUsernameExists } = await import('./supabase-api')
      
      const validation = validateUsername(username)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const usernameExists = await checkUsernameExists(username)
      if (usernameExists) {
        throw new Error('이미 사용 중인 닉네임입니다.')
      }
    }

    // 이메일 중복 검사
    const { checkEmailExists } = await import('./supabase-api')
    const emailExists = await checkEmailExists(email)
    if (emailExists) {
      throw new Error('이미 사용 중인 이메일입니다.')
    }

    // Supabase Auth로 회원가입
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          provider
        }
      }
    })

    if (error) {
      throw new Error(`회원가입 실패: ${error.message}`)
    }

    if (!data.user) {
      throw new Error('회원가입은 성공했지만 사용자 정보를 가져올 수 없습니다.')
    }

    // 프로필 수동 생성 (닉네임 포함)
    const profileData: any = {
      id: data.user.id,
      email,
      name,
      provider
    }

    // 닉네임이 제공된 경우에만 추가
    if (username) {
      profileData.username = username
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      console.error('프로필 생성 오류:', profileError)
      throw new Error(`프로필 생성에 실패했습니다: ${profileError.message}`)
    }

    // 생성된 프로필 조회
    const newProfile = await fetchUserProfile(data.user.id)
    if (!newProfile) {
      throw new Error('프로필을 생성했지만 조회할 수 없습니다.')
    }

    authStateCache = {
      isAuthenticated: true,
      user: newProfile,
      loading: false
    }

    return newProfile
  } catch (error: any) {
    console.error('회원가입 오류:', error)
    authStateCache = { isAuthenticated: false, user: null, loading: false }
    throw error
  }
}

// 비밀번호 재설정 요청 (이메일로 재설정 링크 발송)
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      console.error('비밀번호 재설정 요청 오류:', error)
      throw new Error('비밀번호 재설정 요청에 실패했습니다.')
    }
    
  } catch (error: any) {
    console.error('비밀번호 재설정 오류:', error)
    throw error
  }
}

// 새 비밀번호로 업데이트
export const updatePassword = async (newPassword: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      console.error('비밀번호 업데이트 오류:', error)
      throw new Error('비밀번호 변경에 실패했습니다.')
    }
    
  } catch (error: any) {
    console.error('비밀번호 변경 오류:', error)
    throw error
  }
}

// 로그아웃 함수 (HTTPOnly 쿠키 기반)
export const logout = async (): Promise<void> => {
  try {
    // HTTPOnly 쿠키 로그아웃
    const result = await cookieLogout()
    
    if (!result.success) {
      console.error('쿠키 로그아웃 오류:', result.message)
    }
    
    // 캐시 초기화
    authStateCache = {
      isAuthenticated: false,
      user: null,
      loading: false
    }
    
    // 로컬 스토리지도 정리 (백업 데이터)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('teambalance_auth_state')
    }
    
  } catch (error) {
    console.error('로그아웃 중 예외 발생:', error)
    // 오류가 발생해도 로컬 상태는 초기화
    authStateCache = {
      isAuthenticated: false,
      user: null,
      loading: false
    }
    
    // 로컬 스토리지도 정리
    if (typeof window !== 'undefined') {
      localStorage.removeItem('teambalance_auth_state')
    }
  }
}

// 현재 인증 상태 가져오기 (HTTPOnly 쿠키 기반)
export const getAuthState = async (): Promise<AuthState> => {
  try {
    // HTTPOnly 쿠키 기반 세션 확인
    const cookieAuthState = await checkCookieAuth()
    
    // 기존 캐시와 동기화
    authStateCache = {
      isAuthenticated: cookieAuthState.isAuthenticated,
      user: cookieAuthState.user,
      loading: cookieAuthState.loading
    }
    
    // localStorage 백업 (호환성)
    saveAuthToStorage(authStateCache)

    return { ...authStateCache }
  } catch (error) {
    console.error('인증 상태 확인 중 오류:', error)
    authStateCache = { isAuthenticated: false, user: null, loading: false }
    saveAuthToStorage(authStateCache)
    return authStateCache
  }
}

// 캐시된 인증 상태만 가져오기 (동기적)
export const getAuthStateSync = (): AuthState => {
  return { ...authStateCache }
}

// 인증된 사용자인지 확인 (쿠키 + 캐시)
export const isAuthenticated = (): boolean => {
  // HTTPOnly 쿠키 상태와 캐시 상태 모두 확인
  return authStateCache.isAuthenticated && authStateCache.user !== null && isCookieAuthenticated()
}

// 현재 사용자 정보 가져오기 (쿠키 + 캐시)
export const getCurrentUser = (): User | null => {
  // 캐시와 쿠키 상태가 일치하는지 확인
  if (authStateCache.user && isCookieAuthenticated()) {
    return authStateCache.user
  }
  return null
}

// 인증 상태 변경 감지 (실시간)
export const onAuthStateChange = (callback: (authState: AuthState) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    
    if (event === 'SIGNED_IN' && session?.user) {
      // 로그인됨
      const userProfile = await fetchUserProfile(session.user.id)
      authStateCache = {
        isAuthenticated: !!userProfile,
        user: userProfile,
        loading: false
      }
      saveAuthToStorage(authStateCache)
      callback(authStateCache)
    } else if (event === 'SIGNED_OUT') {
      // 로그아웃됨
      authStateCache = {
        isAuthenticated: false,
        user: null,
        loading: false
      }
      saveAuthToStorage(authStateCache)
      callback(authStateCache)
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      // 토큰 갱신됨 (기존 상태 유지, 필요시 프로필 재조회)
      if (!authStateCache.user) {
        const userProfile = await fetchUserProfile(session.user.id)
        authStateCache = {
          isAuthenticated: !!userProfile,
          user: userProfile,
          loading: false
        }
        saveAuthToStorage(authStateCache)
        callback(authStateCache)
      }
    }
  })
}