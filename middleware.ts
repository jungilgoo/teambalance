/**
 * TeamBalance - 보안 미들웨어
 * 작성일: 2025-01-03
 * 목적: CSRF 보호, 인증 검증, 보안 헤더 설정
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 인증이 필요한 경로들
const PROTECTED_ROUTES = [
  '/dashboard',
  '/create-team',
  '/join-team', 
  '/team/',
  '/session/',
  '/api/auth/me',
  '/api/auth/refresh',
  '/api/auth/logout'
]

// 공개 경로들 (인증 없이 접근 가능)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth/login',
  '/reset-password'
]

// CSRF 보호가 필요한 API 경로들
const CSRF_PROTECTED_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout', 
  '/api/auth/refresh'
]

/**
 * 경로가 보호된 경로인지 확인
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  )
}

/**
 * 경로가 공개 경로인지 확인
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  )
}

/**
 * CSRF 보호가 필요한 경로인지 확인
 */
function needsCSRFProtection(pathname: string): boolean {
  return CSRF_PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  )
}

/**
 * 간단한 CSRF 토큰 검증 (Origin 헤더 기반)
 */
function validateCSRFToken(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  
  if (!origin || !host) {
    return false
  }
  
  // Origin이 현재 호스트와 일치하는지 확인
  const originUrl = new URL(origin)
  return originUrl.host === host
}

/**
 * 사용자 인증 상태 확인
 */
function isAuthenticated(request: NextRequest): boolean {
  const sessionToken = request.cookies.get('teambalance_session')?.value
  return !!sessionToken
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // 보안 헤더 설정
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // HTTPS 강제 (프로덕션 환경)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // CSRF 보호
  if (needsCSRFProtection(pathname) && request.method !== 'GET') {
    if (!validateCSRFToken(request)) {
      console.warn(`CSRF 보호: 잘못된 Origin에서의 요청 차단 - ${pathname}`)
      return NextResponse.json(
        { 
          success: false, 
          message: '유효하지 않은 요청입니다.' 
        }, 
        { status: 403 }
      )
    }
  }

  // 인증이 필요한 경로 보호
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated(request)) {
      // API 경로는 401 응답
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false, 
            message: '인증이 필요합니다.' 
          }, 
          { status: 401 }
        )
      }
      
      // 웹 페이지는 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 이미 로그인한 사용자가 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (pathname === '/login' && isAuthenticated(request)) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 다음 경로들을 제외한 모든 요청에 대해 미들웨어 실행:
     * - api (내부 API 제외)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}