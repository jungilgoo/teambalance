import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowser } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, birthDate, newPassword } = await request.json()

    // 입력값 검증
    if (!email || !birthDate || !newPassword) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseBrowser()

    // 이메일과 생년월일로 사용자 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, birth_date')
      .eq('email', email)
      .single() as { 
        data: { id: string; birth_date: string | null } | null, 
        error: any 
      }

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '등록된 이메일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 생년월일 검증
    if (!profile.birth_date) {
      return NextResponse.json(
        { error: '생년월일 정보가 없는 계정입니다. 관리자에게 문의하세요.' },
        { status: 400 }
      )
    }

    const profileBirthDate = new Date(profile.birth_date).toISOString().split('T')[0]
    if (profileBirthDate !== birthDate) {
      return NextResponse.json(
        { error: '생년월일이 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    // Supabase Admin API를 사용하여 비밀번호 재설정
    const { createSupabaseAdmin } = await import('@/lib/supabase')
    const supabaseAdmin = createSupabaseAdmin()

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '비밀번호 재설정에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '비밀번호가 성공적으로 재설정되었습니다.'
    })

  } catch (error) {
    console.error('비밀번호 재설정 처리 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}