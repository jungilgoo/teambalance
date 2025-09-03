'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthState } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('메인 페이지: 인증 상태 확인 시작')
        const authState = await getAuthState()
        console.log('메인 페이지: 인증 상태 결과', authState)
        
        if (authState.isAuthenticated) {
          console.log('메인 페이지: 인증됨, 대시보드로 이동')
          router.push('/dashboard')
        } else {
          console.log('메인 페이지: 인증 안됨, 로그인으로 이동')
          router.push('/login')
        }
      } catch (error) {
        console.error('메인 페이지: 인증 확인 오류:', error)
        router.push('/login')
      }
    }

    // 약간의 지연 후 실행 (페이지 로드 완료 후)
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">롤 내전 매니저</h1>
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  )
}