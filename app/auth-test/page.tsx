'use client'

/**
 * TeamBalance - HTTPOnly 쿠키 인증 시스템 테스트 페이지
 * 작성일: 2025-01-03
 * 목적: 새로운 인증 시스템의 동작을 확인하기 위한 테스트 페이지
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth, useUser, useIsAuthenticated } from '@/components/providers/AuthProvider'
import { 
  cookieLogin, 
  cookieLogout, 
  checkCookieAuth, 
  getCookieAuthState,
  refreshCookieAuth 
} from '@/lib/auth-cookie'
import { 
  getAuthState,
  getCurrentUser,
  isAuthenticated as libIsAuthenticated
} from '@/lib/auth'

export default function AuthTestPage() {
  const { authState, refreshAuth, isLoading } = useAuth()
  const user = useUser()
  const isAuth = useIsAuthenticated()
  const [testResults, setTestResults] = useState<string[]>([])
  const [isTestRunning, setIsTestRunning] = useState(false)

  // 테스트 로그 추가
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  // 전체 인증 시스템 테스트
  const runAuthTest = async () => {
    setIsTestRunning(true)
    setTestResults([])
    
    try {
      addTestResult('=== HTTPOnly 쿠키 인증 시스템 테스트 시작 ===')
      
      // 1. 현재 상태 확인
      addTestResult('1. 현재 인증 상태 확인')
      const cookieState = getCookieAuthState()
      const libState = await getAuthState()
      
      addTestResult(`   쿠키 상태: ${cookieState.isAuthenticated ? '인증됨' : '미인증'}`)
      addTestResult(`   라이브러리 상태: ${libState.isAuthenticated ? '인증됨' : '미인증'}`)
      addTestResult(`   컨텍스트 상태: ${isAuth ? '인증됨' : '미인증'}`)
      
      // 2. 세션 확인 API 테스트
      addTestResult('2. /api/auth/me 테스트')
      const sessionCheckResult = await checkCookieAuth()
      addTestResult(`   API 응답: ${sessionCheckResult.isAuthenticated ? '성공' : '실패'}`)
      
      // 3. 토큰 갱신 테스트
      if (sessionCheckResult.isAuthenticated) {
        addTestResult('3. 토큰 갱신 테스트')
        const refreshResult = await refreshCookieAuth()
        addTestResult(`   갱신 결과: ${refreshResult.success ? '성공' : '실패'}`)
      }
      
      // 4. 일관성 확인
      addTestResult('4. 상태 일관성 확인')
      const finalCookieState = getCookieAuthState()
      const finalLibState = await getAuthState()
      const finalUser = getCurrentUser()
      
      const isConsistent = 
        finalCookieState.isAuthenticated === finalLibState.isAuthenticated &&
        finalLibState.isAuthenticated === isAuth &&
        (finalUser?.id === user?.id || (!finalUser && !user))
      
      addTestResult(`   일관성 검사: ${isConsistent ? '통과' : '실패'}`)
      
      addTestResult('=== 테스트 완료 ===')
      
    } catch (error) {
      addTestResult(`❌ 테스트 오류: ${error}`)
    } finally {
      setIsTestRunning(false)
    }
  }

  // 로그아웃 테스트
  const testLogout = async () => {
    try {
      addTestResult('로그아웃 테스트 시작...')
      const result = await cookieLogout()
      addTestResult(`로그아웃 결과: ${result.success ? '성공' : '실패'}`)
      await refreshAuth() // AuthProvider 상태 새로고침
    } catch (error) {
      addTestResult(`로그아웃 오류: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle>HTTPOnly 쿠키 인증 시스템 테스트</CardTitle>
            <CardDescription>
              새로운 보안 인증 시스템의 동작을 테스트합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* 현재 상태 표시 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">AuthProvider 상태</h3>
                <p className="text-sm">
                  인증: <span className={isAuth ? 'text-green-600' : 'text-red-600'}>
                    {isAuth ? '✓' : '✗'}
                  </span>
                </p>
                <p className="text-sm">
                  사용자: {user?.name || '없음'}
                </p>
                <p className="text-sm">
                  로딩: {isLoading ? '예' : '아니오'}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">쿠키 상태</h3>
                <p className="text-sm">
                  인증: <span className={getCookieAuthState().isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                    {getCookieAuthState().isAuthenticated ? '✓' : '✗'}
                  </span>
                </p>
                <p className="text-sm">
                  사용자: {getCookieAuthState().user?.name || '없음'}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">라이브러리 상태</h3>
                <p className="text-sm">
                  인증: <span className={libIsAuthenticated() ? 'text-green-600' : 'text-red-600'}>
                    {libIsAuthenticated() ? '✓' : '✗'}
                  </span>
                </p>
                <p className="text-sm">
                  사용자: {getCurrentUser()?.name || '없음'}
                </p>
              </div>
            </div>

            {/* 테스트 버튼들 */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={runAuthTest}
                disabled={isTestRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isTestRunning ? '테스트 중...' : '전체 테스트 실행'}
              </Button>
              
              <Button 
                onClick={refreshAuth}
                variant="outline"
                disabled={isLoading}
              >
                상태 새로고침
              </Button>
              
              {isAuth && (
                <Button 
                  onClick={testLogout}
                  variant="destructive"
                >
                  로그아웃 테스트
                </Button>
              )}
            </div>
            
            {/* 테스트 결과 로그 */}
            {testResults.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">테스트 결과</h3>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="mb-1">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>
        
        {/* 보안 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>보안 기능 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-600 mb-2">✓ 구현된 보안 기능</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• HTTPOnly 쿠키 인증</li>
                  <li>• XSS 방지 (메모리 기반 상태)</li>
                  <li>• CSRF 보호 (Origin 검증)</li>
                  <li>• 자동 토큰 갱신</li>
                  <li>• 안전한 로그아웃</li>
                  <li>• 보안 헤더 설정</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-2">ℹ️ 보안 설정</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Secure: {process.env.NODE_ENV === 'production' ? '활성화' : '개발모드'}</li>
                  <li>• SameSite: Strict</li>
                  <li>• HttpOnly: 활성화</li>
                  <li>• 세션 만료: 24시간</li>
                  <li>• 갱신 토큰: 30일</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}