import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { updateUserProfile, checkUsernameExists } from '@/lib/api/auth'
import { validateUsernameInput } from '@/lib/input-validator'

/**
 * 사용자 프로필 업데이트 API
 * PUT /api/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('[PROFILE API] 프로필 업데이트 요청 시작')
    
    // HTTPOnly 쿠키에서 세션 토큰 확인
    const sessionToken = request.cookies.get('teambalance_session')?.value
    console.log('[PROFILE API] 세션 토큰 존재:', !!sessionToken)
    
    if (!sessionToken) {
      console.log('[PROFILE API] 세션 토큰 없음')
      return NextResponse.json(
        { success: false, message: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Supabase 세션 설정 및 검증
    const supabase = await createSupabaseServer()
    
    // 세션 토큰으로 사용자 정보 조회
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken)
    console.log('[PROFILE API] Supabase 인증 결과:', { hasUser: !!user, error: authError?.message })
    
    if (authError || !user) {
      console.log('[PROFILE API] Supabase 인증 실패')
      return NextResponse.json(
        { success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    // 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, username')
      .eq('id', user.id)
      .single() as { data: { id: string, email: string, name: string, username?: string } | null, error: any }

    if (profileError || !profile) {
      console.log('[PROFILE API] 프로필 조회 실패:', profileError?.message)
      return NextResponse.json(
        { success: false, message: '사용자 정보를 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { username } = body

    // username이 제공되지 않은 경우
    if (!username) {
      return NextResponse.json(
        { success: false, message: '닉네임을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 현재 사용자의 기존 username과 동일한지 확인
    if (username === profile.username) {
      return NextResponse.json(
        { success: true, message: '이미 동일한 닉네임입니다.' }
      )
    }

    // 닉네임 형식 검증
    const validatedUsername = validateUsernameInput(username)
    if (!validatedUsername) {
      return NextResponse.json(
        { success: false, message: '닉네임은 2-20자의 한글, 영문, 숫자, _, - 만 사용할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 닉네임 중복 확인
    const exists = await checkUsernameExists(username)
    if (exists) {
      return NextResponse.json(
        { success: false, message: '이미 사용 중인 닉네임입니다.' },
        { status: 400 }
      )
    }

    // 프로필 업데이트
    const success = await updateUserProfile(profile.id, {
      username: validatedUsername
    })

    if (!success) {
      return NextResponse.json(
        { success: false, message: '닉네임 변경에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 모든 team_members 테이블의 nickname도 동시 업데이트
    try {
      const { error: teamMembersUpdateError } = await (supabase as any)
        .from('team_members')
        .update({ nickname: validatedUsername })
        .eq('user_id', profile.id)

      if (teamMembersUpdateError) {
        console.error('팀 멤버 닉네임 동기화 오류:', teamMembersUpdateError)
        // 팀 멤버 닉네임 업데이트 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
      } else {
        console.log('팀 멤버 닉네임 동기화 완료:', validatedUsername)
      }
    } catch (error) {
      console.error('팀 멤버 닉네임 동기화 중 예외:', error)
      // 예외 발생 시에도 프로필 업데이트는 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      message: '닉네임이 성공적으로 변경되었습니다.',
      username: validatedUsername
    })

  } catch (error) {
    console.error('프로필 업데이트 API 오류:', error)
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 현재 사용자 프로필 조회 API
 * GET /api/user/profile
 */
export async function GET(request: NextRequest) {
  try {
    // HTTPOnly 쿠키에서 세션 토큰 확인
    const sessionToken = request.cookies.get('teambalance_session')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Supabase 세션 설정 및 검증
    const supabase = await createSupabaseServer()
    
    // 세션 토큰으로 사용자 정보 조회
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    // 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, username, created_at')
      .eq('id', user.id)
      .single() as { data: { id: string, email: string, name: string, username?: string, created_at: string } | null, error: any }

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: '사용자 정보를 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        username: profile.username,
        createdAt: profile.created_at
      }
    })

  } catch (error) {
    console.error('프로필 조회 API 오류:', error)
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}