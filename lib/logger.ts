// ============================================================================
// TeamBalance - 중앙화된 로깅 시스템
// ============================================================================

// ============================================================================
// 로그 레벨 및 타입 정의
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogContext {
  userId?: string
  teamId?: string
  action?: string
  component?: string
  duration?: number
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

// ============================================================================
// 로거 클래스
// ============================================================================

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO
  private logs: LogEntry[] = []
  private maxLogSize = 1000 // 메모리에 저장할 최대 로그 수

  constructor() {
    // 개발 환경에서는 DEBUG 레벨까지 모두 출력
    if (process.env.NODE_ENV === 'development') {
      this.currentLevel = LogLevel.DEBUG
    }
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const levelStr = LogLevel[level].padEnd(5)
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${levelStr} | ${message}${contextStr}`
  }

  private addToMemory(entry: LogEntry) {
    this.logs.push(entry)
    
    // 메모리 제한 초과시 오래된 로그 제거
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift()
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    }

    this.addToMemory(entry)

    const formattedMessage = this.formatMessage(level, message, context)

    // 콘솔 출력
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage)
        break
      case LogLevel.INFO:
        console.info(formattedMessage)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${formattedMessage}`)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: LogContext & { error?: Error | { name: string; message: string; stack?: string; code?: string } }) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      message,
      context
    }

    if (context?.error) {
      const error = context.error
      entry.error = {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: 'stack' in error ? error.stack : undefined,
        code: 'code' in error ? error.code : undefined
      }
    }

    this.addToMemory(entry)

    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context)
    console.error(formattedMessage)

    if (entry.error?.stack) {
      console.error('Stack trace:', entry.error.stack)
    }
  }

  critical(message: string, context?: LogContext) {
    this.log(LogLevel.CRITICAL, message, context)
    
    // Critical 로그는 즉시 모니터링 시스템에 전송
    this.sendCriticalAlert(message, context)
  }

  private sendCriticalAlert(message: string, context?: LogContext) {
    // 여기에 모니터링 시스템 (Sentry, DataDog 등) 연동 코드 추가
    // 현재는 콘솔에만 출력
    console.error('🚨 CRITICAL ALERT 🚨', { message, context })
  }

  // ============================================================================
  // 성능 측정 유틸리티
  // ============================================================================

  time(label: string, context?: LogContext) {
    const startTime = Date.now()
    
    return {
      end: () => {
        const duration = Date.now() - startTime
        this.info(`⏱️ ${label} completed`, { ...context, duration })
        return duration
      }
    }
  }

  async measure<T>(
    operation: () => Promise<T>,
    label: string,
    context?: LogContext
  ): Promise<T> {
    const timer = this.time(label, context)
    try {
      const result = await operation()
      timer.end()
      return result
    } catch (error) {
      timer.end()
      const errorObj = error instanceof Error ? error : { name: 'UnknownError', message: String(error) }
      this.error(`❌ ${label} failed`, { ...context, error: errorObj })
      throw error
    }
  }

  // ============================================================================
  // 로그 조회 및 분석
  // ============================================================================

  getLogs(filter?: {
    level?: LogLevel
    since?: Date
    component?: string
    userId?: string
  }): LogEntry[] {
    let filtered = this.logs

    if (filter?.level !== undefined) {
      filtered = filtered.filter(log => log.level >= filter.level!)
    }

    if (filter?.since) {
      filtered = filtered.filter(log => log.timestamp >= filter.since!)
    }

    if (filter?.component) {
      filtered = filtered.filter(log => log.context?.component === filter.component)
    }

    if (filter?.userId) {
      filtered = filtered.filter(log => log.context?.userId === filter.userId)
    }

    return filtered
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  getErrorLogs(since?: Date): LogEntry[] {
    return this.getLogs({ level: LogLevel.ERROR, since })
  }

  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        critical: 0
      },
      byComponent: {} as Record<string, number>,
      recentErrors: this.getErrorLogs(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24시간
    }

    for (const log of this.logs) {
      const levelName = LogLevel[log.level].toLowerCase() as keyof typeof stats.byLevel
      stats.byLevel[levelName]++

      if (log.context?.component) {
        stats.byComponent[log.context.component] = (stats.byComponent[log.context.component] || 0) + 1
      }
    }

    return stats
  }

  // ============================================================================
  // 구조화된 로깅 메서드들
  // ============================================================================

  apiCall(method: string, path: string, context?: LogContext) {
    this.info(`🌐 API ${method} ${path}`, { ...context, component: 'api' })
  }

  apiResponse(method: string, path: string, status: number, duration: number, context?: LogContext) {
    const message = `🌐 API ${method} ${path} → ${status}`
    if (status >= 400) {
      this.error(message, { ...context, component: 'api', status, duration })
    } else {
      this.info(message, { ...context, component: 'api', status, duration })
    }
  }

  dbQuery(query: string, duration?: number, context?: LogContext) {
    this.debug(`🗄️ DB Query: ${query}`, { ...context, component: 'database', duration })
  }

  dbError(query: string, error: Error, context?: LogContext) {
    this.error(`🗄️ DB Error: ${query}`, { ...context, component: 'database', error })
  }

  userAction(action: string, userId: string, context?: LogContext) {
    this.info(`👤 User Action: ${action}`, { ...context, userId, component: 'user' })
  }

  security(event: string, severity: 'low' | 'medium' | 'high', context?: LogContext) {
    const message = `🛡️ Security Event: ${event}`
    if (severity === 'high') {
      this.critical(message, { ...context, component: 'security', severity })
    } else {
      this.warn(message, { ...context, component: 'security', severity })
    }
  }

  performance(metric: string, value: number, unit: string, context?: LogContext) {
    this.info(`⚡ Performance: ${metric} = ${value}${unit}`, { 
      ...context, 
      component: 'performance', 
      metric, 
      value,
      unit 
    })
  }

  // ============================================================================
  // 개발 도구
  // ============================================================================

  trace(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.debug(`🔍 TRACE: ${message}`, context)
    }
  }

  clearLogs() {
    this.logs = []
    this.info('📝 Logs cleared')
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// ============================================================================
// 싱글톤 로거 인스턴스
// ============================================================================

export const logger = new Logger()

// ============================================================================
// 유틸리티 함수들
// ============================================================================

/**
 * 함수 실행을 로깅과 함께 래핑
 */
export function withLogging<T extends unknown[], R>(
  fn: (...args: T) => R,
  functionName: string,
  component?: string
) {
  return (...args: T): R => {
    logger.debug(`🔧 Calling ${functionName}`, { component, args: args.length })
    
    try {
      const result = fn(...args)
      logger.debug(`✅ ${functionName} completed`, { component })
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : { name: 'UnknownError', message: String(error) }
      logger.error(`❌ ${functionName} failed`, { component, error: errorObj })
      throw error
    }
  }
}

/**
 * 비동기 함수 실행을 로깅과 함께 래핑
 */
export function withAsyncLogging<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  functionName: string,
  component?: string
) {
  return async (...args: T): Promise<R> => {
    const timer = logger.time(functionName, { component })
    
    try {
      const result = await fn(...args)
      timer.end()
      return result
    } catch (error) {
      timer.end()
      const errorObj = error instanceof Error ? error : { name: 'UnknownError', message: String(error) }
      logger.error(`❌ ${functionName} failed`, { component, error: errorObj })
      throw error
    }
  }
}

/**
 * 클래스 메서드를 로깅과 함께 래핑하는 데코레이터
 */
export function logged(component?: string) {
  return function(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const className = (target as { constructor: { name: string } }).constructor.name
    const fullName = `${className}.${propertyName}`

    if (method && typeof method === 'function') {
      descriptor.value = withLogging(method, fullName, component || className)
    }

    return descriptor
  }
}

// ============================================================================
// 브라우저 환경에서의 추가 기능
// ============================================================================

if (typeof window !== 'undefined') {
  // 전역 에러 핸들러 등록
  window.addEventListener('error', (event) => {
    logger.error('전역 JavaScript 에러', {
      component: 'global',
      error: {
        name: 'Error',
        message: event.message,
        stack: `${event.filename}:${event.lineno}:${event.colno}`
      }
    })
  })

  // Unhandled Promise Rejection 핸들러
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('처리되지 않은 Promise 거부', {
      component: 'global',
      error: {
        name: 'UnhandledPromiseRejection',
        message: String(event.reason)
      }
    })
  })

  // 개발 모드에서 디버깅을 위한 전역 로거 노출
  if (process.env.NODE_ENV === 'development') {
    (window as unknown as { logger: Logger }).logger = logger
  }
}