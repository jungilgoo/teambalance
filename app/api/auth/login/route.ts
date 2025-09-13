/**
 * TeamBalance - HTTPOnly 쿠키 기반 로그인 API
 * 작성일: 2025-01-03
 * 목적: XSS 공격으로부터 안전한 인증 시스템 구현
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { validateEmail, validateString, ValidationError } from '@/lib/input-validator'
import { cookies } from 'next/headers'

interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

interface LoginResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    username?: string
  }
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    console.log('[LOGIN API] 로그인 요청 시작')
    const body = await request.json() as LoginRequest
    console.log('[LOGIN API] 요청 데이터:', { email: body.email, hasPassword: !!body.password })
    
    // 입력값 검증
    const validatedEmail = validateEmail(body.email)
    const validatedPassword = validateString(body.password, 128, false)
    
    if (!validatedEmail || !validatedPassword) {
      console.log('[LOGIN API] 입력값 검증 실패')
      return NextResponse.json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      }, { status: 400 })
    }

    console.log('[LOGIN API] Supabase 인증 시도:', validatedEmail)
    
    // Supabase 인증
    const supabase = await createSupabaseServer()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedEmail,
      password: validatedPassword
    })
    
    if (error) {
      console.log('[LOGIN API] Supabase 인증 오류:', error)
    } else {
      console.log('[LOGIN API] Supabase 인증 성공:', data.user?.email)
    }

    if (error || !data.user) {
      return NextResponse.json({
        success: false,
        message: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      }, { status: 401 })
    }

    // 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, username')
      .eq('id', data.user.id)
      .single() as { data: { id: string; email: string; name: string; username?: string } | null; error: any }

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        message: '사용자 정보를 불러오는데 실패했습니다.'
      }, { status: 500 })
    }

    // HTTPOnly 쿠키 설정
    const sessionToken = data.session.access_token
    const refreshToken = data.session.refresh_token
    
    // 쿠키 만료 시간 설정 (Remember Me 여부에 따라)
    const maxAge = body.rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7일 또는 1일
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username || undefined
      }
    })

    // HTTPOnly 쿠키 설정 (XSS 공격 방지)
    response.cookies.set('teambalance_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    })

    // Refresh Token 별도 저장 (더 엄격한 보안)
    response.cookies.set('teambalance_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
      path: '/api/auth'
    })

    return response

  } catch (error) {
    console.error('로그인 API 오류:', error)
    
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }, { status: 500 })
  }
}