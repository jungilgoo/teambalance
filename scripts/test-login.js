/**
 * TeamBalance - 로그인 API 테스트 스크립트
 * 작성일: 2025-01-03
 * 목적: HTTPOnly 쿠키 로그인 API가 올바르게 작동하는지 테스트
 */

const testLogin = async (email, password) => {
  const apiUrl = 'http://localhost:3002/api/auth/login'
  
  console.log(`테스트 로그인: ${email}`)
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({
        email,
        password,
        rememberMe: false
      })
    })

    const result = await response.json()
    
    console.log('응답 상태:', response.status)
    console.log('응답 데이터:', result)
    
    if (result.success) {
      console.log('✅ 로그인 성공!')
      console.log('사용자:', result.user?.name)
    } else {
      console.log('❌ 로그인 실패:', result.message)
    }

  } catch (error) {
    console.error('❌ 네트워크 오류:', error)
  }
}

// 테스트 계정으로 로그인 시도 (실제 Supabase에 있는 계정 사용)
console.log('=== TeamBalance 로그인 API 테스트 ===')
testLogin('test@example.com', 'testpassword123')