/**
 * TeamBalance - 안전한 로그아웃 API
 * 작성일: 2025-01-03
 * 목적: HTTPOnly 쿠키 기반 로그아웃 및 세션 무효화
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowser } from '@/lib/supabase'
import { cookies } from 'next/headers'

interface LogoutResponse {
  success: boolean
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse>> {
  try {
    // 현재 세션 토큰 확인
    const sessionToken = request.cookies.get('teambalance_session')?.value
    
    if (sessionToken) {
      // Supabase에서 세션 무효화
      const supabase = createSupabaseBrowser()
      await supabase.auth.signOut()
    }

    const response = NextResponse.json({
      success: true,
      message: '성공적으로 로그아웃되었습니다.'
    })

    // 모든 인증 쿠키 삭제
    response.cookies.set('teambalance_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 즉시 만료
      path: '/'
    })

    response.cookies.set('teambalance_refresh', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 0, // 즉시 만료
      path: '/api/auth'
    })

    return response

  } catch (error) {
    console.error('로그아웃 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}