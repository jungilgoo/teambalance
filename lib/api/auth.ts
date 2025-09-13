import { createSupabaseBrowser } from '../supabase'
import { User, TierType, Position } from '../types'
import { validateEmail, validateUsernameInput, validateString, validateUUID } from '../input-validator'

const supabase = createSupabaseBrowser()

// ============================================================================
// 사용자 인증 관련 API 함수들
// ============================================================================

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const validatedEmail = validateEmail(email)
    if (!validatedEmail) {
      return true // 유효하지 않은 이메일은 존재하는 것으로 처리 (보안)
    }

    // 실제 중복 검사는 Supabase Auth에서 처리됨
    return false
  } catch (error) {
    console.error('이메일 중복 확인 중 예외:', error)
    return false // 예외 시 가입 진행 허용 (사용자 경험 우선)
  }
}

export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    console.log('[DEBUG] checkUsernameExists 호출 - username:', username)
    const validatedUsername = validateUsernameInput(username)
    console.log('[DEBUG] 검증된 username:', validatedUsername)
    
    if (!validatedUsername) {
      console.log('[DEBUG] 유효하지 않은 username - false 반환')
      return false
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', validatedUsername)
      .maybeSingle()

    console.log('[DEBUG] Supabase 쿼리 결과 - data:', data, 'error:', error)

    if (error) {
      console.error('[DEBUG] 닉네임 중복 확인 오류:', error)
      return false // 예외 시 가입/변경 진행 허용 (사용자 경험 우선)
    }

    const result = !!data
    console.log('[DEBUG] 최종 결과:', result)
    return result
  } catch (error) {
    console.error('[DEBUG] 닉네임 중복 확인 중 예외:', error)
    return false // 예외 시 가입/변경 진행 허용 (사용자 경험 우선)
  }
}

export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  // 빈 문자열은 허용 (선택사항)
  if (!username || username.trim() === '') {
    return { isValid: true }
  }

  // 길이 체크 (2-20자)
  if (username.length < 2) {
    return { isValid: false, error: '닉네임은 2자 이상이어야 합니다.' }
  }
  
  if (username.length > 20) {
    return { isValid: false, error: '닉네임은 20자 이하이어야 합니다.' }
  }

  // 허용 문자: 한글, 영문, 숫자, 언더스코어, 하이픈
  const validPattern = /^[가-힣a-zA-Z0-9_-]+$/
  if (!validPattern.test(username)) {
    return { isValid: false, error: '닉네임에는 한글, 영문, 숫자, _, - 만 사용할 수 있습니다.' }
  }

  return { isValid: true }
}

export const findUserByLoginId = async (loginId: string): Promise<User | null> => {
  try {
    const trimmedLoginId = loginId.trim()
    if (!trimmedLoginId) {
      return null
    }

    // 이메일 형식인지 확인
    const isEmail = trimmedLoginId.includes('@')
    
    let query
    if (isEmail) {
      // 이메일로 검색
      const validatedEmail = validateEmail(trimmedLoginId)
      if (!validatedEmail) {
        return null
      }
      query = supabase
        .from('profiles')
        .select('*')
        .eq('email', validatedEmail)
        .single()
    } else {
      // 닉네임으로 검색
      const validatedUsername = validateUsernameInput(trimmedLoginId)
      if (!validatedUsername) {
        return null
      }
      query = supabase
        .from('profiles')
        .select('*')
        .eq('name', validatedUsername)
        .single()
    }

    const { data: profile, error } = await query

    if (error || !profile) {
      console.error('사용자 조회 오류:', error)
      return null
    }

    const profileData = profile as any
    return {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      username: profileData.username,
      avatar: profileData.avatar_url,
      provider: profileData.provider || 'email',
      createdAt: new Date(profileData.created_at)
    }
  } catch (error) {
    console.error('로그인 ID로 사용자 조회 중 예외:', error)
    return null
  }
}

export const updateUserProfile = async (
  userId: string,
  updates: {
    name?: string
    username?: string
    avatar?: string
  }
): Promise<boolean> => {
  try {
    const validatedUserId = validateUUID(userId)
    if (!validatedUserId) {
      console.error('유효하지 않은 사용자 ID:', userId)
      return false
    }

    const updateData: Record<string, string> = {}

    if (updates.name) {
      const validatedName = validateString(updates.name, 50)
      if (validatedName) {
        updateData.name = validatedName
      }
    }

    if (updates.username) {
      const validatedUsername = validateUsernameInput(updates.username)
      if (validatedUsername) {
        updateData.username = validatedUsername
      } else {
        console.error('유효하지 않은 닉네임:', updates.username)
        return false
      }
    }

    if (updates.avatar) {
      updateData.avatar_url = updates.avatar
    }

    if (Object.keys(updateData).length === 0) {
      return true // 업데이트할 내용이 없음
    }

    const { error } = await (supabase as any)
      .from('profiles')
      .update(updateData)
      .eq('id', validatedUserId)

    if (error) {
      console.error('사용자 프로필 업데이트 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('사용자 프로필 업데이트 중 예외:', error)
    return false
  }
}

export const suggestUsernames = async (baseName: string): Promise<string[]> => {
  try {
    const suggestions: string[] = []
    const cleanBase = baseName.replace(/[^가-힣a-zA-Z0-9]/g, '').substring(0, 15)
    
    if (!cleanBase) {
      return []
    }

    // 숫자 추가 형태
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${cleanBase}${i}`
      const exists = await checkUsernameExists(suggestion)
      if (!exists) {
        suggestions.push(suggestion)
      }
    }

    // 랜덤 숫자 추가
    for (let i = 0; i < 3 && suggestions.length < 5; i++) {
      const randomNum = Math.floor(Math.random() * 1000) + 100
      const suggestion = `${cleanBase}${randomNum}`
      const exists = await checkUsernameExists(suggestion)
      if (!exists && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    }

    // 언더스코어 추가 형태
    if (suggestions.length < 5) {
      for (let i = 1; i <= 3; i++) {
        const suggestion = `${cleanBase}_${i}`
        const exists = await checkUsernameExists(suggestion)
        if (!exists && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion)
        }
      }
    }

    return suggestions.slice(0, 5)
  } catch (error) {
    console.error('닉네임 추천 중 예외:', error)
    return []
  }
}

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const validatedUserId = validateUUID(userId)
    if (!validatedUserId) {
      console.error('유효하지 않은 사용자 ID:', userId)
      return null
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', validatedUserId)
      .single()

    if (error) {
      console.error('사용자 조회 오류:', error)
      return null
    }

    const profileData = profile as any
    return {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      username: profileData.username,
      avatar: profileData.avatar_url,
      provider: profileData.provider || 'email',
      createdAt: new Date(profileData.created_at)
    }
  } catch (error) {
    console.error('사용자 조회 중 예외:', error)
    return null
  }
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const tierNames: Record<TierType, string> = {
  'iron_iv': '아이언 IV',
  'iron_iii': '아이언 III',
  'iron_ii': '아이언 II',
  'iron_i': '아이언 I',
  'bronze_iv': '브론즈 IV',
  'bronze_iii': '브론즈 III',
  'bronze_ii': '브론즈 II',
  'bronze_i': '브론즈 I',
  'silver_iv': '실버 IV',
  'silver_iii': '실버 III',
  'silver_ii': '실버 II',
  'silver_i': '실버 I',
  'gold_iv': '골드 IV',
  'gold_iii': '골드 III',
  'gold_ii': '골드 II',
  'gold_i': '골드 I',
  'platinum_iv': '플래티넘 IV',
  'platinum_iii': '플래티넘 III',
  'platinum_ii': '플래티넘 II',
  'platinum_i': '플래티넘 I',
  'emerald_iv': '에메랄드 IV',
  'emerald_iii': '에메랄드 III',
  'emerald_ii': '에메랄드 II',
  'emerald_i': '에메랄드 I',
  'diamond_iv': '다이아몬드 IV',
  'diamond_iii': '다이아몬드 III',
  'diamond_ii': '다이아몬드 II',
  'diamond_i': '다이아몬드 I',
  'master': '마스터',
  'grandmaster': '그랜드마스터',
  'challenger': '챌린저'
}

export const positionNames: Record<Position, string> = {
  'top': '탑',
  'jungle': '정글',
  'mid': '미드',
  'adc': '원딜',
  'support': '서포터'
}