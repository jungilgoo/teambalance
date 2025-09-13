// ============================================================================
// TeamBalance - 중앙화된 에러 처리 시스템
// ============================================================================

import { logger } from './logger'

// ============================================================================
// 에러 타입 정의
// ============================================================================

export enum ErrorCode {
  // 인증 관련
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  
  // 검증 관련
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // 데이터베이스 관련
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  
  // 비즈니스 로직 관련
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // 네트워크 관련
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // 시스템 관련
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string
  teamId?: string
  sessionId?: string
  action?: string
  component?: string
  timestamp?: Date
  [key: string]: unknown
}

// ============================================================================
// 커스텀 에러 클래스들
// ============================================================================

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly context: ErrorContext
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.severity = severity
    this.context = { ...context, timestamp: new Date() }
    this.isOperational = isOperational

    // 스택 트레이스에서 이 생성자 제외
    Error.captureStackTrace(this, AppError)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.VALIDATION_FAILED, ErrorSeverity.LOW, context)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.AUTH_FAILED, ErrorSeverity.HIGH, context)
    this.name = 'AuthenticationError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.DB_QUERY_FAILED, ErrorSeverity.HIGH, context)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`${resource}을(를) 찾을 수 없습니다.`, ErrorCode.RESOURCE_NOT_FOUND, ErrorSeverity.LOW, context)
    this.name = 'NotFoundError'
  }
}

export class PermissionError extends AppError {
  constructor(action: string, context: ErrorContext = {}) {
    super(`${action}에 대한 권한이 없습니다.`, ErrorCode.PERMISSION_DENIED, ErrorSeverity.MEDIUM, context)
    this.name = 'PermissionError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.RESOURCE_ALREADY_EXISTS, ErrorSeverity.MEDIUM, context)
    this.name = 'ConflictError'
  }
}

// ============================================================================
// 에러 처리 유틸리티 함수들
// ============================================================================

/**
 * 알 수 없는 에러를 AppError로 변환
 */
export function normalizeError(error: unknown, context: ErrorContext = {}): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.INTERNAL_ERROR,
      ErrorSeverity.HIGH,
      { ...context, originalError: error.name },
      false
    )
  }

  if (typeof error === 'string') {
    return new AppError(
      error,
      ErrorCode.INTERNAL_ERROR,
      ErrorSeverity.MEDIUM,
      context
    )
  }

  return new AppError(
    '알 수 없는 에러가 발생했습니다.',
    ErrorCode.INTERNAL_ERROR,
    ErrorSeverity.HIGH,
    { ...context, originalError: String(error) },
    false
  )
}

/**
 * Supabase 에러를 AppError로 변환
 */
export function normalizeSupabaseError(error: { code?: string; message: string }, context: ErrorContext = {}): AppError {
  const code = error.code
  let errorCode = ErrorCode.DB_QUERY_FAILED
  let severity = ErrorSeverity.HIGH

  // Supabase 에러 코드별 매핑
  switch (code) {
    case 'PGRST116': // 행을 찾을 수 없음
      return new NotFoundError('데이터', context)
    
    case '23505': // unique_violation
      errorCode = ErrorCode.RESOURCE_ALREADY_EXISTS
      severity = ErrorSeverity.MEDIUM
      break
    
    case '23503': // foreign_key_violation
      errorCode = ErrorCode.DB_CONSTRAINT_VIOLATION
      severity = ErrorSeverity.HIGH
      break
    
    case '23514': // check_violation
      errorCode = ErrorCode.VALIDATION_FAILED
      severity = ErrorSeverity.LOW
      break
    
    case 'PGRST301': // 권한 없음
      errorCode = ErrorCode.PERMISSION_DENIED
      severity = ErrorSeverity.MEDIUM
      break
  }

  return new AppError(error.message, errorCode, severity, context)
}


/**
 * 사용자 친화적 에러 메시지 생성
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case ErrorCode.AUTH_FAILED:
    case ErrorCode.AUTH_EXPIRED:
      return '로그인이 필요합니다. 다시 로그인해 주세요.'
    
    case ErrorCode.AUTH_INVALID:
      return '인증 정보가 올바르지 않습니다.'
    
    case ErrorCode.VALIDATION_FAILED:
    case ErrorCode.INVALID_INPUT:
      return error.message // 검증 에러는 원본 메시지 사용
    
    case ErrorCode.RESOURCE_NOT_FOUND:
      return error.message // NotFoundError의 메시지 사용
    
    case ErrorCode.PERMISSION_DENIED:
      return '해당 작업을 수행할 권한이 없습니다.'
    
    case ErrorCode.RESOURCE_ALREADY_EXISTS:
      return '이미 존재하는 데이터입니다.'
    
    case ErrorCode.NETWORK_ERROR:
      return '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
    
    case ErrorCode.SERVICE_UNAVAILABLE:
      return '서비스가 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    
    default:
      return '일시적인 오류가 발생했습니다. 문제가 계속되면 관리자에게 문의해 주세요.'
  }
}

/**
 * 에러를 안전하게 처리하는 래퍼 함수
 */
export function safeExecute<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  fallbackValue?: T
): Promise<T | null> {
  return operation()
    .catch((error) => {
      handleError(error, context)
      return fallbackValue ?? null
    })
}

/**
 * 동기 함수용 안전 실행 래퍼
 */
export function safeExecuteSync<T>(
  operation: () => T,
  context: ErrorContext = {},
  fallbackValue?: T
): T | null {
  try {
    return operation()
  } catch (error) {
    handleError(error, context)
    return fallbackValue ?? null
  }
}

// ============================================================================
// 에러 통계 및 모니터링
// ============================================================================

interface ErrorStats {
  count: number
  lastOccurrence: Date
  severity: ErrorSeverity
}

class ErrorTracker {
  private errorStats = new Map<string, ErrorStats>()
  
  track(error: AppError) {
    const key = `${error.code}:${error.message}`
    const existing = this.errorStats.get(key)
    
    if (existing) {
      existing.count++
      existing.lastOccurrence = new Date()
    } else {
      this.errorStats.set(key, {
        count: 1,
        lastOccurrence: new Date(),
        severity: error.severity
      })
    }
  }
  
  getStats(): Array<{ key: string; stats: ErrorStats }> {
    return Array.from(this.errorStats.entries()).map(([key, stats]) => ({
      key,
      stats
    }))
  }
  
  getMostFrequent(limit: number = 10) {
    return this.getStats()
      .sort((a, b) => b.stats.count - a.stats.count)
      .slice(0, limit)
  }
  
  getCriticalErrors() {
    return this.getStats().filter(({ stats }) => stats.severity === ErrorSeverity.CRITICAL)
  }
}

export const errorTracker = new ErrorTracker()

/**
 * 에러 로깅, 보고 및 추적을 포함한 통합 에러 처리
 */
export function handleError(error: unknown, context: ErrorContext = {}): AppError {
  const normalizedError = normalizeError(error, context)
  
  // 에러 로깅
  logger.error('애플리케이션 에러 발생', {
    error: normalizedError as any,
    context: (normalizedError as any).context
  })

  // Critical 에러의 경우 추가 처리 (모니터링 시스템 연동 등)
  if (normalizedError.severity === ErrorSeverity.CRITICAL) {
    logger.critical('중대한 에러 발생', {
      error: normalizedError.message,
      context: normalizedError.context
    })
  }

  // 에러 추적
  errorTracker.track(normalizedError)

  return normalizedError
}