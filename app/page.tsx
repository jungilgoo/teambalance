'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

export default function Home() {
  const router = useRouter()
  const { authState, isLoading } = useAuth()

  useEffect(() => {
    // 초기 로딩이 완료되면 즉시 리다이렉션
    if (!isLoading) {
      if (authState.isAuthenticated) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [authState.isAuthenticated, isLoading, router])

  // 최소한의 로딩 UI만 표시
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}