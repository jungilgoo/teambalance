/**
 * TeamBalance - 사용자 세션 확인 API
 * 작성일: 2025-01-03
 * 목적: HTTPOnly 쿠키 기반 인증 상태 확인 및 자동 갱신
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

interface UserSessionResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    username?: string
  }
  message?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<UserSessionResponse>> {
  try {
    // HTTPOnly 쿠키에서 세션 토큰 확인
    const sessionToken = request.cookies.get('teambalance_session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      }, { status: 401 })
    }

    // Supabase 세션 설정 및 검증
    const supabase = await createSupabaseServer()
    
    // 세션 토큰으로 사용자 정보 조회
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken)
    
    if (authError || !user) {
      // 세션이 만료되었거나 유효하지 않음
      const response = NextResponse.json({
        success: false,
        message: '세션이 만료되었습니다. 다시 로그인해주세요.'
      }, { status: 401 })
      
      // 만료된 쿠키 삭제
      response.cookies.set('teambalance_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      })
      
      return response
    }

    // 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, username')
      .eq('id', user.id)
      .single() as { data: { id: string; email: string; name: string; username?: string } | null; error: any }

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        message: '사용자 정보를 불러오는데 실패했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username || undefined
      }
    })

  } catch (error) {
    console.error('세션 확인 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: '세션 확인 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}