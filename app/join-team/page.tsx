'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TierSelect } from '@/components/ui/tier-select'
import { PositionSelect } from '@/components/ui/position-select'
import { MultiPositionSelect } from '@/components/ui/multi-position-select'
import { getAuthState } from '@/lib/auth'
import { TierType, Position, Team } from '@/lib/types'
import { getPublicTeams, searchPublicTeams, joinPublicTeam } from '@/lib/supabase-api'
import { Users, UserPlus, AlertCircle, CheckCircle, ArrowLeft, Search, X } from 'lucide-react'

function JoinTeamContent() {
  // 공통 상태
  const [isLoading, setIsLoading] = useState(false)
  const [nickname, setNickname] = useState('')
  const [tier, setTier] = useState<TierType>('silver_iv')
  const [mainPosition, setMainPosition] = useState<Position>('mid')
  const [subPositions, setSubPositions] = useState<Position[]>(['support'])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 공개 팀 관련 상태
  const [publicTeams, setPublicTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const initPage = async () => {
      try {
        const authState = await getAuthState()
        console.log('join-team 페이지 인증 상태:', authState)
        
        if (!authState.isAuthenticated || !authState.user) {
          console.log('인증되지 않음, 로그인 페이지로 이동')
          const redirectUrl = '/login'
          router.push(redirectUrl)
          return
        }

        console.log('인증됨:', authState.user.name)
        
        // 사용자의 글로벌 닉네임을 자동으로 설정
        const userNickname = authState.user.username || authState.user.name
        setNickname(userNickname)
        
        // 공개 팀 목록 로드
        loadPublicTeams()
      } catch (error) {
        console.error('페이지 초기화 오류:', error)
        router.push('/login')
      }
    }

    initPage()
  }, [router])

  // 공개 팀 관련 함수들
  const loadPublicTeams = async () => {
    try {
      setIsLoading(true)
      setError('')
      const teams = await getPublicTeams()
      setPublicTeams(teams)
    } catch (error) {
      console.error('공개 팀 목록 로드 오류:', error)
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
      setError('')
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

      await joinPublicTeam(
        selectedTeam.id,
        authState.user.id,
        nickname,
        tier,
        mainPosition,
        subPositions
      )

      setSuccess('팀 참가 요청이 성공적으로 전송되었습니다!')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: unknown) {
      console.error('팀 참가 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '팀 참가에 실패했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
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

          {/* 공개 팀 검색 */}
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
                <Label htmlFor="searchTeam">팀 이름 검색</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="searchTeam"
                    placeholder="팀 이름을 입력하세요..."
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
                    <Button variant="outline" onClick={handleClearSearch}>
                      <X className="w-4 h-4" />
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

          {/* 참가 정보 입력 */}
          {selectedTeam && !success && (
            <Card>
              <CardHeader>
                <CardTitle>참가 정보 입력</CardTitle>
                <CardDescription>
                  선택한 팀: <span className="font-semibold text-blue-600">{selectedTeam.name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nickname">닉네임 *</Label>
                  <Input
                    id="nickname"
                    placeholder="글로벌 닉네임이 자동 적용됩니다"
                    value={nickname}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    글로벌 닉네임을 변경하려면 <a href="/profile" className="text-blue-600 hover:underline">프로필 설정</a>에서 수정하세요
                  </p>
                </div>

                <div>
                  <Label htmlFor="tier">티어 *</Label>
                  <TierSelect value={tier} onValueChange={(value) => setTier(value)} />
                </div>

                <div>
                  <Label htmlFor="mainPosition">주 포지션 *</Label>
                  <PositionSelect value={mainPosition} onValueChange={(value) => setMainPosition(value)} />
                </div>

                <div>
                  <Label htmlFor="subPositions">부 포지션 * (복수 선택 가능)</Label>
                  <MultiPositionSelect 
                    mainPosition={mainPosition}
                    selectedPositions={subPositions} 
                    onPositionsChange={(values) => setSubPositions(values)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    주 포지션과 다른 포지션을 최소 1개 이상 선택하세요
                  </p>
                </div>

                <Button
                  onClick={handleJoinPublicTeam}
                  disabled={isLoading || !selectedTeam || !nickname.trim() || subPositions.length === 0}
                  className="w-full"
                >
                  {isLoading ? '참가 요청 중...' : '팀 참가 요청'}
                </Button>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <JoinTeamContent />
    </Suspense>
  )
}

export default JoinTeamPage