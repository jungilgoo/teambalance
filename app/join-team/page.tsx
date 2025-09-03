'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { TierSelect } from '@/components/ui/tier-select'
import { PositionSelect } from '@/components/ui/position-select'
import { MultiPositionSelect } from '@/components/ui/multi-position-select'
import { getAuthState } from '@/lib/auth'
import { InviteLink, TierType, Position, Team } from '@/lib/types'
import { getTeamByInviteCode, joinTeamByInviteCode, getPublicTeams, searchPublicTeams, joinPublicTeam } from '@/lib/supabase-api'
import { Users, Link, UserPlus, AlertCircle, CheckCircle, Clock, ArrowLeft, Search } from 'lucide-react'

export default function JoinTeamPage() {
  // 탭 관리
  const [activeTab, setActiveTab] = useState<'public' | 'invite'>('public')
  
  // 공통 상태
  const [isLoading, setIsLoading] = useState(false)
  const [nickname, setNickname] = useState('')
  const [tier, setTier] = useState<TierType>('silver_iv')
  const [mainPosition, setMainPosition] = useState<Position>('mid')
  const [subPositions, setSubPositions] = useState<Position[]>(['adc'])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 초대 코드 관련 상태
  const [inviteCode, setInviteCode] = useState('')
  const [inviteInfo, setInviteInfo] = useState<InviteLink | null>(null)
  
  // 공개 팀 관련 상태
  const [publicTeams, setPublicTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const initPage = async () => {
      try {
        const authState = await getAuthState()
        console.log('join-team 페이지 인증 상태:', authState) // 디버깅
        
        if (!authState.isAuthenticated || !authState.user) {
          console.log('인증되지 않음, 로그인 페이지로 이동')
          // 초대 코드를 URL 파라미터로 유지하면서 로그인 페이지로 이동
          const codeFromUrl = searchParams.get('code')
          const redirectUrl = codeFromUrl 
            ? `/login?redirect=${encodeURIComponent(`/join-team?code=${codeFromUrl}`)}`
            : '/login'
          router.push(redirectUrl)
          return
        }

        console.log('인증됨:', authState.user.name)
        
        // URL에서 초대 코드 확인
        const codeFromUrl = searchParams.get('code')
        if (codeFromUrl) {
          setActiveTab('invite') // 초대 코드가 있으면 초대 탭으로 전환
          setInviteCode(codeFromUrl)
          handleVerifyInvite(codeFromUrl)
        } else {
          // 공개 팀 목록 로드
          loadPublicTeams()
        }
      } catch (error) {
        console.error('페이지 초기화 오류:', error)
        router.push('/login')
      }
    }

    initPage()
  }, [router, searchParams])

  // 공개 팀 관련 함수들
  const loadPublicTeams = async () => {
    try {
      setIsLoading(true)
      setError('') // 에러 상태 초기화
      const teams = await getPublicTeams()
      setPublicTeams(teams)
    } catch (error) {
      console.error('공개 팀 목록 로드 오료:', error)
      setError('공개 팀 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchPublicTeams = async () => {
    if (!searchQuery.trim()) {
      loadPublicTeams()
      return
    }

    try {
      setIsSearching(true)
      setError('') // 에러 상태 초기화
      const teams = await searchPublicTeams(searchQuery)
      setPublicTeams(teams)
    } catch (error) {
      console.error('팀 검색 오류:', error)
      setError('팀 검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setError('')
    loadPublicTeams()
  }

  const handleTabChange = (tab: 'public' | 'invite') => {
    setActiveTab(tab)
    setError('') // 탭 전환 시 에러 상태 초기화
    setSuccess('') // 성공 상태도 초기화
    
    if (tab === 'public' && publicTeams.length === 0) {
      loadPublicTeams()
    }
  }

  const handleJoinPublicTeam = async () => {
    if (!selectedTeam || !nickname.trim()) {
      setError('팀을 선택하고 닉네임을 입력해주세요.')
      return
    }

    if (subPositions.length === 0 || subPositions.includes(mainPosition)) {
      setError('부포지션을 최소 1개 이상 선택해주세요. 주 포지션과 부 포지션이 같을 수 없습니다.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const authState = await getAuthState()
      if (!authState.isAuthenticated || !authState.user) {
        throw new Error('로그인이 필요합니다.')
      }

      const success = await joinPublicTeam(
        selectedTeam.id,
        authState.user.id,
        nickname,
        tier,
        mainPosition,
        subPositions
      )

      if (success) {
        setSuccess(`"${selectedTeam.name}" 팀에 성공적으로 참가했습니다!`)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error: any) {
      console.error('공개 팀 참가 실패:', error)
      setError(error.message || '팀 참가에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyInvite = async (code?: string) => {
    const verifyCode = code || inviteCode
    if (!verifyCode.trim()) {
      setError('초대 코드를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setInviteInfo(null)

    try {
      const invite = await getTeamByInviteCode(verifyCode)
      if (invite) {
        setInviteInfo(invite)
        setError('')
      } else {
        setError('유효하지 않거나 만료된 초대 코드입니다.')
      }
    } catch (error) {
      console.error('초대 코드 확인 실패:', error)
      setError('초대 코드 확인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!inviteInfo || !nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }

    if (subPositions.length === 0 || subPositions.includes(mainPosition)) {
      setError('부포지션을 최소 1개 이상 선택해주세요. 주 포지션과 부 포지션이 같을 수 없습니다.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const authState = await getAuthState()
      if (!authState.isAuthenticated || !authState.user) {
        throw new Error('로그인이 필요합니다.')
      }

      const success = await joinTeamByInviteCode(
        inviteInfo.inviteCode,
        authState.user.id,
        nickname,
        tier,
        mainPosition,
        subPositions
      )

      if (success) {
        setSuccess(`"${inviteInfo.teamName}" 팀에 성공적으로 참가했습니다!`)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error: any) {
      console.error('팀 참가 실패:', error)
      setError(error.message || '팀 참가에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatExpiresAt = (date: Date) => {
    const now = new Date()
    const expires = new Date(date)
    const diffHours = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours <= 0) return '만료됨'
    if (diffHours < 24) return `${diffHours}시간 후 만료`
    const diffDays = Math.ceil(diffHours / 24)
    return `${diffDays}일 후 만료`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              팀 참가
            </h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* 성공 메시지 */}
          {success && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{success}</span>
                </div>
                <p className="text-sm text-green-600 mt-1">잠시 후 대시보드로 이동합니다...</p>
              </CardContent>
            </Card>
          )}

          {/* 탭 네비게이션 */}
          <Card>
            <CardContent className="p-0">
              <div className="flex border-b">
                <button
                  onClick={() => handleTabChange('public')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'public'
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Search className="w-4 h-4" />
                    공개 팀 검색
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('invite')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'invite'
                      ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Link className="w-4 h-4" />
                    초대 코드 입력
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 공개 팀 검색 탭 */}
          {activeTab === 'public' && (
            <>
              {/* 팀 검색 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    공개 팀 검색
                  </CardTitle>
                  <CardDescription>
                    팀 이름으로 검색하거나 전체 공개 팀 목록에서 선택하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="searchQuery">팀 검색</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="searchQuery"
                        placeholder="팀 이름 입력..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchPublicTeams()}
                      />
                      <Button 
                        onClick={handleSearchPublicTeams}
                        disabled={isSearching}
                      >
                        {isSearching ? '검색 중...' : '검색'}
                      </Button>
                      {searchQuery && (
                        <Button 
                          variant="outline" 
                          onClick={handleClearSearch}
                          disabled={isLoading}
                        >
                          초기화
                        </Button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 공개 팀 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    공개 팀 목록 ({publicTeams.length}개)
                  </CardTitle>
                  <CardDescription>
                    참가하고 싶은 팀을 선택하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      팀 목록 로딩 중...
                    </div>
                  ) : publicTeams.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? '검색 결과가 없습니다.' : '공개 팀이 없습니다.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {publicTeams.map((team) => (
                        <div
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedTeam?.id === team.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{team.name}</h4>
                              <p className="text-sm text-gray-500">
                                {team.description || '팀 설명이 없습니다'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{team.memberCount}명</p>
                              <p className="text-xs text-gray-400">
                                {team.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 참가 정보 입력 (공개 팀용) */}
              {selectedTeam && !success && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-blue-700">
                      "{selectedTeam.name}" 팀 참가
                    </CardTitle>
                    <CardDescription>
                      팀에서 사용할 정보를 입력하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="nickname">닉네임 *</Label>
                      <Input
                        id="nickname"
                        placeholder="팀에서 사용할 닉네임"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        maxLength={20}
                      />
                    </div>

                    <div>
                      <Label htmlFor="tier">현재 티어 *</Label>
                      <TierSelect value={tier} onValueChange={setTier} />
                    </div>

                    <div>
                      <Label htmlFor="mainPosition">주 포지션 *</Label>
                      <PositionSelect 
                        value={mainPosition} 
                        onValueChange={(newMain) => {
                          setMainPosition(newMain)
                          setSubPositions(prev => {
                            const filtered = prev.filter(pos => pos !== newMain)
                            return filtered.length > 0 ? filtered : ['adc']
                          })
                        }}
                        placeholder="주 포지션"
                      />
                    </div>

                    <div>
                      <MultiPositionSelect
                        mainPosition={mainPosition}
                        selectedPositions={subPositions}
                        onPositionsChange={setSubPositions}
                        maxSelections={4}
                      />
                    </div>

                    <Button 
                      onClick={handleJoinPublicTeam}
                      disabled={isLoading || !nickname.trim() || subPositions.length === 0 || subPositions.includes(mainPosition)}
                      className="w-full"
                      size="lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isLoading ? '참가 중...' : `"${selectedTeam.name}" 팀 참가하기`}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* 초대 코드 입력 탭 */}
          {activeTab === 'invite' && (
            <>
              {/* 초대 코드 입력 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="w-5 h-5" />
                    초대 코드 입력
                  </CardTitle>
                  <CardDescription>
                    팀에서 받은 초대 코드를 입력하세요
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="inviteCode">초대 코드</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="inviteCode"
                    placeholder="예: ABC12345"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button 
                    onClick={() => handleVerifyInvite()}
                    disabled={isLoading || !inviteCode.trim()}
                  >
                    {isLoading ? '확인 중...' : '확인'}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 팀 정보 표시 */}
          {inviteInfo && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Users className="w-5 h-5" />
                  {inviteInfo.teamName}
                </CardTitle>
                {inviteInfo.teamDescription && (
                  <CardDescription className="text-blue-600">
                    {inviteInfo.teamDescription}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <UserPlus className="w-4 h-4" />
                    <span>{inviteInfo.inviterName}님의 초대</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatExpiresAt(inviteInfo.expiresAt)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-sm text-blue-600 text-center font-medium">
                  아래 정보를 입력하여 팀에 참가하세요
                </div>
              </CardContent>
            </Card>
          )}

          {/* 참가 정보 입력 */}
          {inviteInfo && !success && (
            <Card>
              <CardHeader>
                <CardTitle>참가 정보 입력</CardTitle>
                <CardDescription>
                  팀에서 사용할 닉네임과 포지션 정보를 입력하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nickname">닉네임 *</Label>
                  <Input
                    id="nickname"
                    placeholder="팀에서 사용할 닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div>
                  <Label htmlFor="tier">현재 티어 *</Label>
                  <TierSelect value={tier} onValueChange={setTier} />
                </div>

                <div>
                  <Label htmlFor="mainPosition">주 포지션 *</Label>
                  <PositionSelect 
                    value={mainPosition} 
                    onValueChange={(newMain) => {
                      setMainPosition(newMain)
                      // 새로운 주포지션이 기존 부포지션에 포함되어 있으면 제거
                      setSubPositions(prev => {
                        const filtered = prev.filter(pos => pos !== newMain)
                        // 필터링 후 빈 배열이면 기본값 추가
                        return filtered.length > 0 ? filtered : ['adc']
                      })
                    }}
                    placeholder="주 포지션"
                  />
                </div>

                <div>
                  <MultiPositionSelect
                    mainPosition={mainPosition}
                    selectedPositions={subPositions}
                    onPositionsChange={setSubPositions}
                    maxSelections={4}
                  />
                </div>

                <Button 
                  onClick={handleJoinTeam}
                  disabled={isLoading || !nickname.trim() || subPositions.length === 0 || subPositions.includes(mainPosition)}
                  className="w-full"
                  size="lg"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isLoading ? '참가 중...' : `"${inviteInfo.teamName}" 팀 참가하기`}
                </Button>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}