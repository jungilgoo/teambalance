'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/lib/auth'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Shield, Gamepad2, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    // URL에서 토큰 확인
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('세션 확인 오류:', error)
        setError('유효하지 않은 재설정 링크입니다.')
        return
      }
      
      if (!data.session) {
        setError('재설정 링크가 만료되었거나 유효하지 않습니다.')
        return
      }
    }

    handleAuthCallback()
  }, [supabase.auth])

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await updatePassword(newPassword)
      setIsSuccess(true)
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error)
      setError(error.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-2xl mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              비밀번호 변경 완료
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              새로운 비밀번호로 성공적으로 변경되었습니다.<br />
              3초 후 로그인 페이지로 이동합니다.
            </p>
            <Button
              onClick={() => router.push('/login')}
              className="bg-green-600 hover:bg-green-700"
            >
              바로 로그인하기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          
          {/* 로고 및 타이틀 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-2xl mb-6">
              <Gamepad2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              비밀번호 재설정
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              새로운 비밀번호를 설정해주세요
            </p>
          </div>

          {/* 비밀번호 재설정 폼 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <Input
                type="password"
                placeholder="새 비밀번호 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12"
                required
              />
              
              <Input
                type="password"
                placeholder="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                required
              />

              <Button
                onClick={handlePasswordReset}
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  로그인으로 돌아가기
                </button>
              </div>
            </div>

            {!isLoading && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>안전한 비밀번호 변경</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}