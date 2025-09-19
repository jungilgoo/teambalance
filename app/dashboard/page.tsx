'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { logout } from '@/lib/auth'
import { User } from '@/lib/types'
import { getUserTeams } from '@/lib/supabase-api'
import { useAuth } from '@/components/providers/AuthProvider'
import { Crown, Users, Plus, UserPlus, Gamepad2, ArrowRight, Settings } from 'lucide-react'

export default function DashboardPage() {
  const { authState, isLoading: authLoading } = useAuth()
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const loadUserTeams = async (userId: string) => {
    try {
      const teams = await getUserTeams(userId)
      setUserTeams(teams.map(team => ({ team, member: null })))
    } catch (error) {
      console.error('팀 목록 로드 오류:', error)
      setUserTeams([])
    }
  }

  useEffect(() => {
    // 인증 상태가 로딩 중이면 대기
    if (authLoading) {
      return
    }

    // 인증되지 않았으면 로그인으로 리다이렉션
    if (!authState.isAuthenticated) {
      router.replace('/login')
      return
    }

    // 인증되었으면 팀 목록 로드 (한 번만)
    if (authState.user && userTeams.length === 0 && !isLoading) {
      setIsLoading(true)
      loadUserTeams(authState.user.id).finally(() => {
        setIsLoading(false)
      })
    }
  }, [authState, authLoading, router, userTeams.length]) // isLoading 제거

  const handleLogout = async () => {
    try {
      await logout()
      // 완전한 페이지 새로고침으로 리다이렉트
      window.location.href = '/login'
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류가 발생해도 로그인 페이지로 리다이렉트
      window.location.href = '/login'
    }
  }

  const handleCreateTeam = () => {
    router.push('/create-team')
  }

  const handleJoinTeam = () => {
    router.push('/join-team')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  // 로딩 중이거나 인증되지 않은 경우 로딩 화면
  if (authLoading || !authState.isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-yellow-900/20">
      {/* 헤더 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto py-3 sm:py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h1 className="mobile-text-title font-bold text-gray-900 dark:text-white">Team Balance</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">안녕하세요</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {authState.user?.username || authState.user?.name}님
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleProfile} className="rounded-xl">
                <Settings className="w-4 h-4 mr-2" />
                프로필
              </Button>
              <Button variant="outline" onClick={handleLogout} className="rounded-xl px-6">
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto py-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* 웰컴 섹션 */}
          <div className="text-center mb-6 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
              내전 관리 대시보드
            </h2>
            <p className="mobile-text-body text-gray-600 dark:text-gray-300">
              팀을 관리하고 공정한 내전을 시작해보세요
            </p>
          </div>
          
          {/* 내 팀 섹션 */}
          {userTeams.length > 0 && (
            <div className="mb-6 sm:mb-12">
              <div className="flex items-center justify-between mb-4 sm:mb-8">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="mobile-text-title font-bold text-gray-900 dark:text-white">
                    내 팀 ({userTeams.length}개)
                  </h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mobile-grid-gap">
                {userTeams.map(({ team, member }) => (
                  <div 
                    key={team.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 mobile-card-padding hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
                    onClick={() => router.push(`/team/${team.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h4 className="font-bold mobile-text-subtitle text-gray-900 dark:text-white flex items-center gap-2 mobile-truncate-2">
                            {team.name}
                            {team.leaderId === authState.user?.id && (
                              <Crown className="w-5 h-5 text-yellow-500" />
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {team.leaderId === authState.user?.id ? '리더' : '멤버'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" />
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed mobile-truncate-3">
                      {team.description || '팀 설명이 없습니다'}
                    </p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        멤버 {team.memberCount}명
                      </span>
                      <Button size="sm" variant="outline" className="rounded-lg">
                        팀 입장
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 팀 관리 섹션 */}
          <div>
            <div className="text-center mb-4 sm:mb-8">
              <h3 className="mobile-text-title font-bold text-gray-900 dark:text-white mb-2">
                새로운 시작
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                새로운 팀을 생성하거나 기존 팀에 참가하세요
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* 팀 생성 카드 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 mobile-card-padding-lg">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-2xl mb-4">
                    <Plus className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h4 className="mobile-text-subtitle font-bold text-gray-900 dark:text-white mb-2">팀 생성</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    새로운 내전 팀을 생성하고 리더가 되어<br />멤버들을 초대해보세요
                  </p>
                </div>
                <Button onClick={handleCreateTeam} className="w-full h-12 rounded-xl text-base font-semibold">
                  새 팀 생성하기
                </Button>
              </div>

              {/* 팀 참가 카드 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-600 mobile-card-padding-lg">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-2xl mb-4">
                    <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="mobile-text-subtitle font-bold text-gray-900 dark:text-white mb-2">팀 참가</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    기존 팀을 검색하거나 목록에서<br />선택하여 참가하세요
                  </p>
                </div>
                <Button onClick={handleJoinTeam} variant="outline" className="w-full h-12 rounded-xl text-base font-semibold border-2">
                  팀 참가하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}