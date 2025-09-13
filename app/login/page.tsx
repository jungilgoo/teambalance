'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hybridLogin, signUp, resetPassword } from '@/lib/auth'
import { validateUsername, suggestUsernames, checkUsernameExists } from '@/lib/supabase-api'
import { useCallback, useMemo } from 'react'
import { Shield, Gamepad2, Mail } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import SignUpForm from '@/components/auth/SignUpForm'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginId, setLoginId] = useState('') // 이메일 또는 닉네임
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  
  // 닉네임 관련 상태 (회원가입 시에만 검증)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // 닉네임 입력 변경 (실시간 검증 제거)
  const handleUsernameChange = useCallback((newUsername: string) => {
    setUsername(newUsername)
    setUsernameError('')
    setUsernameSuggestions([])
    setError('')
  }, [])


  const handleForgotPassword = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!resetEmail) {
        alert('이메일을 입력해주세요.')
        return
      }

      await resetPassword(resetEmail)
      alert('비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.')
      setIsForgotPassword(false)
      setResetEmail('')
    } catch (error: unknown) {
      console.error('비밀번호 재설정 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '비밀번호 재설정 요청에 실패했습니다.'
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [resetEmail])

  const handleAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isSignUp) {
        // 회원가입 검증
        if (!email || !password || !name) {
          setError('모든 필수 항목을 입력해주세요.')
          return
        }

        // 닉네임이 입력된 경우 유효성 및 중복 검사
        if (username.trim()) {
          // 유효성 검사
          const validation = validateUsername(username.trim())
          if (!validation.isValid) {
            setUsernameError(validation.error || '유효하지 않은 닉네임입니다.')
            setError('닉네임을 확인해주세요.')
            return
          }

          // 중복 검사
          try {
            const exists = await checkUsernameExists(username.trim())
            if (exists) {
              setUsernameError('이미 사용 중인 닉네임입니다.')
              
              // 대안 제안
              const suggestions = await suggestUsernames(username.trim())
              setUsernameSuggestions(suggestions)
              setError('다른 닉네임을 사용해주세요.')
              return
            }
          } catch (error) {
            console.error('닉네임 검증 오류:', error)
            setError('닉네임 확인 중 오류가 발생했습니다. 다시 시도해주세요.')
            return
          }
        }

        await signUp(email, password, name, username || undefined, 'email')
        alert('회원가입이 완료되었습니다! 로그인해보세요.')
        setIsSignUp(false)
        
        // 폼 초기화
        setEmail('')
        setPassword('')
        setName('')
        setUsername('')
        setLoginId('')
        setError('')
        setUsernameError('')
        setUsernameSuggestions([])
      } else {
        // 로그인 검증
        if (!loginId || !password) {
          alert('로그인 정보를 입력해주세요.')
          return
        }

        // 하이브리드 로그인 시도
        await hybridLogin(loginId, password, false)
        const redirectTo = searchParams.get('redirect') || '/dashboard'
        router.push(redirectTo)
      }
    } catch (error: unknown) {
      console.error('인증 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '인증에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isSignUp, email, password, name, username, loginId, router, searchParams])

  // 모드 전환 함수 메모이제이션
  const toggleMode = useCallback(() => {
    setIsSignUp(!isSignUp)
    // 모드 전환 시 상태 초기화
    setUsername('')
    setUsernameError('')
    setUsernameSuggestions([])
    setError('')
  }, [isSignUp])

  // 닉네임 제안 선택 함수 메모이제이션
  const selectSuggestion = useCallback((suggestion: string) => {
    setUsername(suggestion)
    setUsernameError('')
    setUsernameSuggestions([])
  }, [])

  // 현재 모드에 따른 제목과 설명 메모이제이션
  const modeContent = useMemo(() => ({
    title: isForgotPassword ? '비밀번호 찾기' : isSignUp ? '회원가입' : '로그인',
    description: isForgotPassword 
      ? '가입 시 사용한 이메일을 입력하세요' 
      : isSignUp 
      ? '새 계정을 만드세요' 
      : '이메일 또는 닉네임으로 로그인하세요'
  }), [isSignUp, isForgotPassword])

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
              롤 내전 매니저
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
              공정한 팀 밸런싱으로<br />더 재미있는 내전을 경험하세요
            </p>
          </div>

          {/* 로그인 폼 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="space-y-4 mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-center">
                  {modeContent.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  {modeContent.description}
                </p>
              </div>

              {isForgotPassword ? (
                <ForgotPasswordForm
                  resetEmail={resetEmail}
                  isLoading={isLoading}
                  onEmailChange={setResetEmail}
                  onSubmit={handleForgotPassword}
                  onBack={() => setIsForgotPassword(false)}
                />
              ) : isSignUp ? (
                <SignUpForm
                  name={name}
                  email={email}
                  password={password}
                  username={username}
                  usernameError={usernameError}
                  usernameSuggestions={usernameSuggestions}
                  error={error}
                  isLoading={isLoading}
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onUsernameChange={handleUsernameChange}
                  onSubmit={handleAuth}
                  onToggleMode={toggleMode}
                  onSelectSuggestion={selectSuggestion}
                />
              ) : (
                <LoginForm
                  loginId={loginId}
                  password={password}
                  isLoading={isLoading}
                  onLoginIdChange={setLoginId}
                  onPasswordChange={setPassword}
                  onSubmit={handleAuth}
                  onToggleMode={toggleMode}
                  onForgotPassword={() => setIsForgotPassword(true)}
                />
              )}

            </div>

            {isLoading && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">로그인 중...</span>
                </div>
              </div>
            )}

            {!isLoading && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>안전하고 간편한 로그인</span>
              </div>
            )}
          </div>

          {/* 하단 설명 */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              로그인하면 <strong>이용약관</strong> 및 <strong>개인정보처리방침</strong>에 동의한 것으로 간주됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}