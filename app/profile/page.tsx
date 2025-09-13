'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/components/providers/AuthProvider'
import { User, Settings, ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface ProfileUpdateResponse {
  success: boolean
  message: string
  username?: string
}

export default function ProfilePage() {
  const { authState, isLoading: authLoading, refreshAuth } = useAuth()
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return

    if (!authState.isAuthenticated) {
      router.replace('/login')
      return
    }

    // 현재 사용자의 username 설정
    if (authState.user?.username) {
      setUsername(authState.user.username)
      setOriginalUsername(authState.user.username)
    }
  }, [authState, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const trimmedUsername = username.trim()
      
      // 변경사항이 없으면 그냥 성공 처리
      if (trimmedUsername === originalUsername) {
        setMessage({ type: 'success', text: '이미 동일한 닉네임입니다.' })
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUsername
        })
      })

      const data: ProfileUpdateResponse = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setOriginalUsername(trimmedUsername)
        // 인증 상태 새로고침하여 최신 사용자 정보 반영
        await refreshAuth()
      } else {
        setMessage({ type: 'error', text: data.message })
      }

    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/dashboard')
  }

  // 로딩 중이거나 인증되지 않은 경우
  if (authLoading || !authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const hasChanges = username.trim() !== originalUsername
  const isValidUsername = username.trim().length >= 2 && username.trim().length <= 20

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 헤더 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">프로필 설정</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* 사용자 정보 섹션 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <User className="w-5 h-5" />
                <span>기본 정보</span>
              </CardTitle>
              <CardDescription>
                로그인한 계정의 기본 정보입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">이메일</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <span className="text-gray-900 dark:text-gray-100">{authState.user?.email}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">이름</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <span className="text-gray-900 dark:text-gray-100">{authState.user?.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 닉네임 변경 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle>닉네임 변경</CardTitle>
              <CardDescription>
                모든 팀에서 표시되는 글로벌 닉네임을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">
                    닉네임 (2-20자, 한글/영문/숫자/_/- 사용 가능)
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="새로운 닉네임을 입력하세요"
                    className="mt-1"
                    maxLength={20}
                    disabled={isLoading}
                  />
                  {username.trim() && !isValidUsername && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      닉네임은 2-20자 사이여야 합니다
                    </p>
                  )}
                  {originalUsername && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      현재 닉네임: {originalUsername}
                    </p>
                  )}
                </div>

                {/* 메시지 표시 */}
                {message && (
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border ${
                    message.type === 'error' 
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' 
                      : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                  }`}>
                    {message.type === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                    <p className={`text-sm ${
                      message.type === 'error' 
                        ? 'text-red-800 dark:text-red-200' 
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={isLoading || !hasChanges || !isValidUsername}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        닉네임 변경
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBack}>
                    취소
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}