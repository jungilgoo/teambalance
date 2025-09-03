/**
 * TeamBalance - 토큰 자동 갱신 API
 * 작성일: 2025-01-03
 * 목적: HTTPOnly 쿠키 기반 토큰 자동 갱신으로 사용자 경험 개선
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowser } from '@/lib/supabase'

interface RefreshResponse {
  success: boolean
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<RefreshResponse>> {
  try {
    // HTTPOnly 쿠키에서 Refresh Token 확인
    const refreshToken = request.cookies.get('teambalance_refresh')?.value
    
    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        message: '리프레시 토큰이 없습니다. 다시 로그인해주세요.'
      }, { status: 401 })
    }

    // Supabase 토큰 갱신
    const supabase = createSupabaseBrowser()
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (error || !data.session) {
      // Refresh Token도 만료됨 - 재로그인 필요
      const response = NextResponse.json({
        success: false,
        message: '세션이 완전히 만료되었습니다. 다시 로그인해주세요.'
      }, { status: 401 })
      
      // 모든 쿠키 삭제
      response.cookies.set('teambalance_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      })
      
      response.cookies.set('teambalance_refresh', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/api/auth'
      })
      
      return response
    }

    const response = NextResponse.json({
      success: true,
      message: '토큰이 성공적으로 갱신되었습니다.'
    })

    // 새로운 토큰으로 쿠키 업데이트
    response.cookies.set('teambalance_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      path: '/'
    })

    // Refresh Token도 업데이트 (Supabase에서 rotation하는 경우)
    if (data.session.refresh_token) {
      response.cookies.set('teambalance_refresh', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/api/auth'
      })
    }

    return response

  } catch (error) {
    console.error('토큰 갱신 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}