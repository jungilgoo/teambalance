'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hybridLogin, signUp, resetPassword, resetPasswordWithBirth } from '@/lib/auth'
import { validateUsername, suggestUsernames, checkUsernameExists } from '@/lib/supabase-api'
import { useCallback, useMemo } from 'react'
import { Shield, Gamepad2, Mail } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import SignUpForm from '@/components/auth/SignUpForm'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ForgotPasswordWithBirthForm from '@/components/auth/ForgotPasswordWithBirthForm'

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginId, setLoginId] = useState('') // 이메일 또는 닉네임
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetBirthDate, setResetBirthDate] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [useBirthMethod, setUseBirthMethod] = useState(true) // 생년월일 방식을 기본값으로
  
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
      if (useBirthMethod) {
        // 생년월일 기반 비밀번호 재설정
        if (!resetEmail || !resetBirthDate || !resetNewPassword || !resetConfirmPassword) {
          setError('모든 필드를 입력해주세요.')
          return
        }

        if (resetNewPassword.length < 6) {
          setError('비밀번호는 6자 이상이어야 합니다.')
          return
        }

        if (resetNewPassword !== resetConfirmPassword) {
          setError('비밀번호가 일치하지 않습니다.')
          return
        }

        await resetPasswordWithBirth(resetEmail, resetBirthDate, resetNewPassword)
        alert('비밀번호가 성공적으로 재설정되었습니다. 로그인해보세요.')
        setIsForgotPassword(false)
        setResetEmail('')
        setResetBirthDate('')
        setResetNewPassword('')
        setResetConfirmPassword('')
        setError('')
      } else {
        // 기존 이메일 방식
        if (!resetEmail) {
          setError('이메일을 입력해주세요.')
          return
        }

        await resetPassword(resetEmail)
        alert('비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.')
        setIsForgotPassword(false)
        setResetEmail('')
      }
    } catch (error: unknown) {
      console.error('비밀번호 재설정 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '비밀번호 재설정 요청에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [useBirthMethod, resetEmail, resetBirthDate, resetNewPassword, resetConfirmPassword])

  const handleAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isSignUp) {
        // 회원가입 검증
        if (!email || !password || !name || !birthDate) {
          setError('모든 필수 항목을 입력해주세요.')
          return
        }

        // 생년월일 유효성 검사
        const today = new Date()
        const birth = new Date(birthDate)
        if (birth >= today) {
          setError('유효한 생년월일을 입력해주세요.')
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

        await signUp(email, password, name, username || undefined, 'email', birthDate)
        alert('회원가입이 완료되었습니다! 로그인해보세요.')
        setIsSignUp(false)
        
        // 폼 초기화
        setEmail('')
        setPassword('')
        setName('')
        setUsername('')
        setBirthDate('')
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
  }, [isSignUp, email, password, name, username, birthDate, loginId, router, searchParams])

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
      ? useBirthMethod 
        ? '이메일과 생년월일로 본인을 확인하고 비밀번호를 재설정하세요'
        : '가입 시 사용한 이메일을 입력하세요'
      : isSignUp 
      ? '새 계정을 만드세요' 
      : '이메일 또는 닉네임으로 로그인하세요'
  }), [isSignUp, isForgotPassword, useBirthMethod])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-yellow-900/20">
      <div className="min-h-screen flex items-center justify-center mobile-container">
        <div className="w-full max-w-lg">
          
          {/* 로고 및 타이틀 */}
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-2xl mb-6">
              <Gamepad2 className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Team Balance
            </h1>
            <p className="mobile-text-body text-gray-600 dark:text-gray-300 font-medium">
              공정한 팀 밸런싱으로<br />더 재미있는 내전을 경험하세요
            </p>
          </div>

          {/* 로그인 폼 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 mobile-card-padding-lg">
            <div className="space-y-4 mb-6">
              <div className="mb-6">
                <h2 className="mobile-text-subtitle font-semibold text-center">
                  {modeContent.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  {modeContent.description}
                </p>
              </div>

              {isForgotPassword ? (
                useBirthMethod ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setUseBirthMethod(false)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        이메일 방식으로 변경
                      </button>
                    </div>
                    <ForgotPasswordWithBirthForm
                      email={resetEmail}
                      birthDate={resetBirthDate}
                      newPassword={resetNewPassword}
                      confirmPassword={resetConfirmPassword}
                      error={error}
                      isLoading={isLoading}
                      onEmailChange={setResetEmail}
                      onBirthDateChange={setResetBirthDate}
                      onNewPasswordChange={setResetNewPassword}
                      onConfirmPasswordChange={setResetConfirmPassword}
                      onSubmit={handleForgotPassword}
                      onBack={() => {
                        setIsForgotPassword(false)
                        setError('')
                        setResetEmail('')
                        setResetBirthDate('')
                        setResetNewPassword('')
                        setResetConfirmPassword('')
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setUseBirthMethod(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        생년월일 방식으로 변경
                      </button>
                    </div>
                    <ForgotPasswordForm
                      resetEmail={resetEmail}
                      isLoading={isLoading}
                      onEmailChange={setResetEmail}
                      onSubmit={handleForgotPassword}
                      onBack={() => {
                        setIsForgotPassword(false)
                        setError('')
                      }}
                    />
                  </>
                )
              ) : isSignUp ? (
                <SignUpForm
                  name={name}
                  email={email}
                  password={password}
                  username={username}
                  birthDate={birthDate}
                  usernameError={usernameError}
                  usernameSuggestions={usernameSuggestions}
                  error={error}
                  isLoading={isLoading}
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onUsernameChange={handleUsernameChange}
                  onBirthDateChange={setBirthDate}
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
                  onForgotPassword={() => {
                        setIsForgotPassword(true)
                        setUseBirthMethod(true) // 기본값으로 생년월일 방식 설정
                        setError('')
                      }}
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