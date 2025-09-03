'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hybridLogin, signUp, resetPassword } from '@/lib/auth'
import { validateUsername, suggestUsernames, checkUsernameExists } from '@/lib/supabase-api'
import { Shield, Gamepad2, Mail } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginId, setLoginId] = useState('') // 이메일 또는 닉네임
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  
  // 닉네임 관련 상태
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // 닉네임 실시간 검증
  const handleUsernameChange = async (newUsername: string) => {
    setUsername(newUsername)
    setUsernameError('')
    setUsernameSuggestions([])
    
    if (!newUsername) return
    
    // 유효성 검사
    const validation = validateUsername(newUsername)
    if (!validation.isValid) {
      setUsernameError(validation.error || '유효하지 않은 닉네임입니다.')
      return
    }
    
    // 중복 검사 (디바운싱)
    setIsCheckingUsername(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms 디바운싱
      
      const exists = await checkUsernameExists(newUsername)
      if (exists) {
        setUsernameError('이미 사용 중인 닉네임입니다.')
        
        // 대안 제안
        const suggestions = await suggestUsernames(newUsername)
        setUsernameSuggestions(suggestions)
      }
    } catch (error) {
      console.error('닉네임 검증 오류:', error)
      setUsernameError('닉네임 확인 중 오류가 발생했습니다.')
    } finally {
      setIsCheckingUsername(false)
    }
  }


  const handleForgotPassword = async () => {
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
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error)
      alert(error.message || '비밀번호 재설정 요청에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuth = async () => {
    setIsLoading(true)
    try {
      if (isSignUp) {
        // 회원가입 검증
        if (!email || !password || !name) {
          alert('모든 필수 항목을 입력해주세요.')
          return
        }

        if (username && usernameError) {
          alert('닉네임 오류를 해결해주세요.')
          return
        }

        await signUp(email, password, name, username || undefined)
        alert('회원가입이 완료되었습니다! 로그인해보세요.')
        setIsSignUp(false)
        
        // 폼 초기화
        setEmail('')
        setPassword('')
        setName('')
        setUsername('')
        setLoginId('')
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
    } catch (error: any) {
      console.error('인증 실패:', error)
      alert(error.message || '인증에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
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
                  {isForgotPassword ? '비밀번호 찾기' : isSignUp ? '회원가입' : '로그인'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  {isForgotPassword 
                    ? '가입 시 사용한 이메일을 입력하세요' 
                    : isSignUp 
                    ? '새 계정을 만드세요' 
                    : '이메일 또는 닉네임으로 로그인하세요'
                  }
                </p>
              </div>

              {isForgotPassword ? (
                <>
                  {/* 비밀번호 찾기 폼 */}
                  <Input
                    type="email"
                    placeholder="가입 시 사용한 이메일"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-12"
                    required
                  />

                  <Button
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '발송 중...' : '재설정 이메일 발송'}
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={() => setIsForgotPassword(false)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      로그인으로 돌아가기
                    </button>
                  </div>
                </>
              ) : isSignUp ? (
                <>
                  {/* 회원가입 폼 */}
                  <Input
                    type="text"
                    placeholder="이름 (실명)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                    required
                  />
                  
                  <Input
                    type="email"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    required
                  />

                  {/* 닉네임 입력 (선택사항) */}
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="게이머 닉네임 (선택사항, 2-20자)"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`h-12 ${usernameError ? 'border-red-500' : username && !isCheckingUsername && !usernameError ? 'border-green-500' : ''}`}
                    />
                    
                    {isCheckingUsername && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        닉네임 확인 중...
                      </p>
                    )}
                    
                    {usernameError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {usernameError}
                      </p>
                    )}
                    
                    {username && !isCheckingUsername && !usernameError && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        사용 가능한 닉네임입니다!
                      </p>
                    )}

                    {/* 닉네임 추천 */}
                    {usernameSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">추천 닉네임:</p>
                        <div className="flex flex-wrap gap-1">
                          {usernameSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                setUsername(suggestion)
                                setUsernameError('')
                                setUsernameSuggestions([])
                              }}
                              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      닉네임은 나중에 설정할 수도 있습니다.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* 로그인 폼 */}
                  <Input
                    type="text"
                    placeholder="이메일 또는 닉네임"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="h-12"
                    required
                  />
                </>
              )}
              
              {!isForgotPassword && (
                <>
                  <Input
                    type="password"
                    placeholder="비밀번호 (6자 이상)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    required
                  />

                  <Button
                    onClick={handleAuth}
                    disabled={isLoading || (isSignUp && username && !!usernameError)}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '처리 중...' : (isSignUp ? '회원가입' : '로그인')}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-sm text-blue-600 hover:text-blue-700 block w-full"
                    >
                      {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                    </button>
                    
                    {!isSignUp && (
                      <button
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        비밀번호를 잊으셨나요?
                      </button>
                    )}
                  </div>
                </>
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