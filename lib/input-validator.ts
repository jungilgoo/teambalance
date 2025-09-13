/**
 * TeamBalance 입력값 검증 및 SQL Injection 방지 유틸리티
 * 작성일: 2025-01-03
 * 목적: 모든 사용자 입력값에 대한 안전한 검증 및 정규화
 */

// =================================================================
// 1. 기본 입력값 검증 함수들
// =================================================================

/**
 * 문자열 입력값 검증 및 정규화
 * @param input 검증할 문자열
 * @param maxLength 최대 길이 (기본값: 255)
 * @param allowEmpty 빈 문자열 허용 여부 (기본값: false)
 * @returns 검증된 안전한 문자열 또는 null
 */
export const validateString = (
  input: unknown, 
  maxLength: number = 255,
  allowEmpty: boolean = false
): string | null => {
  // 타입 검증
  if (typeof input !== 'string') {
    return null
  }

  // 문자열 정규화
  const trimmed = input.trim()
  
  // 빈 문자열 체크
  if (!allowEmpty && trimmed.length === 0) {
    return null
  }

  // 길이 제한
  const truncated = trimmed.slice(0, maxLength)
  
  return truncated
}

/**
 * 검색어 입력값 검증 (SQL LIKE 쿼리용)
 * @param searchQuery 검색어
 * @param maxLength 최대 길이 (기본값: 50)
 * @returns 검증 및 이스케이핑된 검색어 또는 null
 */
export const validateSearchQuery = (
  searchQuery: unknown, 
  maxLength: number = 50
): string | null => {
  const validated = validateString(searchQuery, maxLength, false)
  
  if (!validated) {
    return null
  }

  // LIKE 와일드카드 이스케이핑
  const escaped = validated
    .replace(/\\/g, '\\\\')  // 백슬래시 이스케이핑
    .replace(/%/g, '\\%')    // % 이스케이핑  
    .replace(/_/g, '\\_')    // _ 이스케이핑
    .replace(/'/g, "''")     // 단일 따옴표 이스케이핑

  return escaped
}

/**
 * 이메일 주소 검증
 * @param email 이메일 주소
 * @returns 검증된 이메일 또는 null
 */
export const validateEmail = (email: unknown): string | null => {
  const validated = validateString(email, 254, false)
  
  if (!validated) {
    return null
  }

  // 기본적인 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(validated)) {
    return null
  }

  return validated.toLowerCase()
}

/**
 * 사용자명(닉네임) 검증 - 입력 데이터 검증용
 * @param username 사용자명
 * @returns 검증된 사용자명 또는 null
 */
export const validateUsernameInput = (username: unknown): string | null => {
  const validated = validateString(username, 20, false)
  
  if (!validated) {
    return null
  }

  // 사용자명 형식 검증 (한글, 영문, 숫자, _, - 허용)
  const usernameRegex = /^[a-zA-Z0-9가-힣_-]+$/
  
  if (!usernameRegex.test(validated)) {
    return null
  }

  // 최소 길이 체크 (2자 이상)
  if (validated.length < 2) {
    return null
  }

  return validated
}

// =================================================================
// 2. 숫자 검증 함수들
// =================================================================

/**
 * 정수 검증
 * @param input 검증할 값
 * @param min 최솟값 (기본값: 0)
 * @param max 최댓값 (기본값: Number.MAX_SAFE_INTEGER)
 * @returns 검증된 정수 또는 null
 */
export const validateInteger = (
  input: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null => {
  let num: number

  // 타입별 변환
  if (typeof input === 'number') {
    num = input
  } else if (typeof input === 'string') {
    const parsed = parseInt(input.trim(), 10)
    if (isNaN(parsed)) {
      return null
    }
    num = parsed
  } else {
    return null
  }

  // 정수 체크
  if (!Number.isInteger(num)) {
    return null
  }

  // 범위 체크
  if (num < min || num > max) {
    return null
  }

  return num
}

/**
 * UUID 형식 검증
 * @param uuid UUID 문자열
 * @returns 검증된 UUID 또는 null
 */
export const validateUUID = (uuid: unknown): string | null => {
  const validated = validateString(uuid, 36, false)
  
  if (!validated) {
    return null
  }

  // UUID v4 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(validated)) {
    return null
  }

  return validated.toLowerCase()
}

// =================================================================
// 3. 특수 도메인 검증 함수들
// =================================================================

/**
 * 팀 이름 검증
 * @param teamName 팀 이름
 * @returns 검증된 팀 이름 또는 null
 */
export const validateTeamName = (teamName: unknown): string | null => {
  const validated = validateString(teamName, 30, false)
  
  if (!validated) {
    return null
  }

  // 최소 길이 체크 (2자 이상)
  if (validated.length < 2) {
    return null
  }

  return validated
}

/**
 * 포지션 검증
 * @param position 포지션
 * @returns 검증된 포지션 또는 null
 */
export const validatePosition = (position: unknown): 'top' | 'jungle' | 'mid' | 'adc' | 'support' | null => {
  if (typeof position !== 'string') {
    return null
  }

  const validPositions: ('top' | 'jungle' | 'mid' | 'adc' | 'support')[] = ['top', 'jungle', 'mid', 'adc', 'support']
  
  if (validPositions.includes(position as any)) {
    return position as 'top' | 'jungle' | 'mid' | 'adc' | 'support'
  }

  return null
}

/**
 * 티어 검증
 * @param tier 티어 문자열
 * @returns 검증된 티어 또는 null
 */
export const validateTier = (tier: unknown): string | null => {
  if (typeof tier !== 'string') {
    return null
  }

  const validTiers = [
    'iron_iv', 'iron_iii', 'iron_ii', 'iron_i',
    'bronze_iv', 'bronze_iii', 'bronze_ii', 'bronze_i',
    'silver_iv', 'silver_iii', 'silver_ii', 'silver_i',
    'gold_iv', 'gold_iii', 'gold_ii', 'gold_i',
    'platinum_iv', 'platinum_iii', 'platinum_ii', 'platinum_i',
    'emerald_iv', 'emerald_iii', 'emerald_ii', 'emerald_i',
    'diamond_iv', 'diamond_iii', 'diamond_ii', 'diamond_i',
    'master', 'grandmaster', 'challenger'
  ]

  if (validTiers.includes(tier)) {
    return tier
  }

  return null
}

// =================================================================
// 4. 배치 검증 함수
// =================================================================

/**
 * 여러 입력값을 동시에 검증
 * @param inputs 검증할 입력값들과 검증 함수 매핑
 * @returns 모든 검증이 성공하면 결과 객체, 실패하면 null
 */
export const validateBatch = <T extends Record<string, unknown>>(
  inputs: T,
  validators: { [K in keyof T]: (input: T[K]) => unknown }
): { [K in keyof T]: NonNullable<ReturnType<typeof validators[K]>> } | null => {
  const result = {} as any

  for (const [key, input] of Object.entries(inputs)) {
    const validator = validators[key as keyof T]
    const validated = validator(input as any)
    
    if (validated === null || validated === undefined) {
      return null
    }
    
    result[key] = validated
  }

  return result
}

// =================================================================
// 5. 에러 타입 정의
// =================================================================

export class ValidationError extends Error {
  constructor(
    public field: string,
    public reason: string,
    public input?: unknown
  ) {
    super(`Validation failed for field '${field}': ${reason}`)
    this.name = 'ValidationError'
  }
}

/**
 * 검증 실패 시 상세 에러 정보를 포함한 검증 함수
 * @param input 검증할 입력값
 * @param fieldName 필드명 (에러 메시지용)
 * @param validator 검증 함수
 * @returns 검증 성공 시 결과값, 실패 시 ValidationError 발생
 */
export const validateOrThrow = <T>(
  input: unknown,
  fieldName: string,
  validator: (input: unknown) => T | null
): T => {
  const result = validator(input)
  
  if (result === null || result === undefined) {
    throw new ValidationError(fieldName, 'Invalid input format or value', input)
  }
  
  return result
}

// =================================================================
// 6. 추가 보안 검증 함수들
// =================================================================

/**
 * 비밀번호 검증 (보안 요구사항 충족)
 * @param password 비밀번호
 * @returns 검증된 비밀번호 또는 null
 */
export const validatePassword = (password: unknown): string | null => {
  const validated = validateString(password, 128, false)
  if (!validated) return null
  
  // 최소 6자 이상
  if (validated.length < 6) return null
  
  return validated
}

/**
 * URL 검증 (리다이렉트 공격 방지)
 * @param url URL 문자열
 * @returns 검증된 URL 또는 null
 */
export const validateURL = (url: unknown): string | null => {
  const validated = validateString(url, 2048, false)
  if (!validated) return null
  
  try {
    const urlObj = new URL(validated)
    // 허용된 프로토콜만 허용
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null
    }
    return validated
  } catch {
    return null
  }
}

/**
 * 날짜 검증 (ISO 8601 형식)
 * @param date 날짜 문자열
 * @returns 검증된 Date 객체 또는 null
 */
export const validateDate = (date: unknown): Date | null => {
  if (typeof date === 'string') {
    const dateObj = new Date(date)
    if (!isNaN(dateObj.getTime())) {
      return dateObj
    }
  } else if (date instanceof Date && !isNaN(date.getTime())) {
    return date
  }
  return null
}

/**
 * 부울린 값 검증
 * @param value 부울린 값
 * @returns 검증된 boolean 또는 null
 */
export const validateBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
  }
  
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  
  return null
}

/**
 * JSON 문자열 검증 및 파싱
 * @param json JSON 문자열
 * @returns 파싱된 객체 또는 null
 */
export const validateJSON = (json: unknown): object | null => {
  const validated = validateString(json, 10000, false)
  if (!validated) return null
  
  try {
    const parsed = JSON.parse(validated)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

/**
 * 파일 확장자 검증
 * @param filename 파일명
 * @param allowedExtensions 허용된 확장자 배열
 * @returns 검증된 파일명 또는 null
 */
export const validateFileExtension = (
  filename: unknown, 
  allowedExtensions: string[] = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt']
): string | null => {
  const validated = validateString(filename, 255, false)
  if (!validated) return null
  
  const extension = validated.split('.').pop()?.toLowerCase()
  if (!extension || !allowedExtensions.includes(extension)) {
    return null
  }
  
  return validated
}