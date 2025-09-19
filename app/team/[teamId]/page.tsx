'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/components/providers/AuthProvider'
import { Team, TeamMember } from '@/lib/types'
import { getTeamById, getTeamMembers, getUserById, updateMemberTier, updateMemberPositions, getTopRankings, getTeamMVPRanking, getCurrentStreaks, getPendingJoinRequests } from '@/lib/supabase-api'
import { calculateWinRate } from '@/lib/stats'
import { positionNames } from '@/lib/utils'
import { getChampionSplashArt, getChampionFallbackGradient } from '@/lib/champion-images'
import { getTeamMembersStats, MemberStatsForTeam } from '@/lib/api/personal-stats'
import { Users, Crown, Plus, Play, BarChart3, Settings, History, Trophy, Wifi, WifiOff, User } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTeamMembersRealtime } from '@/lib/hooks/useTeamMembersRealtime'
import { usePendingRequestsCount } from '@/lib/hooks/usePendingRequestsRealtime'
import TeamBalanceModal from '@/components/session/TeamBalanceModal'
import MatchResultInputModal from '@/components/session/MatchResultInputModal'
import InviteMemberModal from '@/components/team/InviteMemberModal'
import { TierBadge } from '@/components/ui/tier-badge'
import { MemberCard } from '@/components/ui/member-card'
import { TierEditDialog } from '@/components/ui/tier-edit-dialog'
import { TierType, Position } from '@/lib/types'
import { PositionEditDialog } from '@/components/ui/position-edit-dialog'
import TeamManagementModal from '@/components/team/TeamManagementModal'

export default function TeamDashboard() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string
  const { authState, isLoading: authLoading } = useAuth()
  
  const [team, setTeam] = useState<Team | null>(null)
  const [topRankings, setTopRankings] = useState<Array<{nickname: string, winRate: number}>>([])
  const [mvpLeader, setMvpLeader] = useState<{memberId: string, nickname: string, mvpCount: number} | null>(null)
  const [currentStreak, setCurrentStreak] = useState<{nickname: string, streak: number} | null>(null)
  const [memberChampionStats, setMemberChampionStats] = useState<MemberStatsForTeam[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 실시간 팀 멤버 관리 (항상 호출하여 Hook 순서 일관성 유지)
  const {
    members,
    memberStats,
    loading: membersLoading,
    connected: realtimeConnected,
    error: realtimeError,
    handleTierUpdate: realtimeTierUpdate,
    handlePositionUpdate: realtimePositionUpdate,
    refreshMembers
  } = useTeamMembersRealtime(teamId, !!teamId) // currentUser 조건 제거
  const [tierEditDialog, setTierEditDialog] = useState<{
    isOpen: boolean
    memberId: string | null
    memberName: string
    currentTier: TierType | null
  }>({
    isOpen: false,
    memberId: null,
    memberName: '',
    currentTier: null
  })

  const [positionEditDialog, setPositionEditDialog] = useState<{
    isOpen: boolean
    memberId: string | null
    memberName: string
    currentMainPosition: Position | null
    currentSubPositions: Position[] | null
  }>({
    isOpen: false,
    memberId: null,
    memberName: '',
    currentMainPosition: null,
    currentSubPositions: null
  })

  // 팀 관리 모달 상태
  const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // 이 부분은 제거되고 아래에서 동적으로 처리됨

  useEffect(() => {
    // 인증 상태가 로딩 중이거나 teamId가 없으면 대기
    if (authLoading || !teamId) {
      return
    }

    // 인증되지 않았으면 로그인으로 리다이렉션
    if (!authState.isAuthenticated) {
      router.replace('/login')
      return
    }

    // 팀 데이터 로드
    const loadTeamData = async () => {
      if (team || isLoading) return // 이미 로드했거나 로딩 중이면 중복 실행 방지
      
      setIsLoading(true)
      try {
        // 팀 데이터 로드
        const [teamData, rankings, mvpRanking, streak, championStatsData] = await Promise.all([
          getTeamById(teamId),
          getTopRankings(teamId),
          getTeamMVPRanking(teamId),
          getCurrentStreaks(teamId),
          getTeamMembersStats(teamId)
        ])

        if (!teamData) {
          alert('팀을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }

        const mvp = mvpRanking.length > 0 && mvpRanking[0].mvpCount > 0 ? mvpRanking[0] : null
        
        setTeam(teamData)
        setTopRankings(rankings)
        setMvpLeader(mvp)
        setCurrentStreak(streak)
        setMemberChampionStats(championStatsData)
      } catch (error) {
        console.error('팀 페이지: 데이터 로드 오류:', error)
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadTeamData()
  }, [authState, authLoading, teamId, router, team, isLoading])

  const isTeamLeader = authState.user && team && team.leaderId === authState.user.id

  // 실시간 승인 대기 요청 추적 (항상 호출, 팀 리더 여부와 관계없이)
  const {
    count: dynamicPendingCount,
    loading: dynamicPendingLoading,
    error: dynamicPendingError
  } = usePendingRequestsCount(teamId, !!teamId) // teamId가 있으면 항상 활성화

  // 실시간 승인 대기 카운트를 로컬 상태와 동기화
  useEffect(() => {
    if (isTeamLeader) {
      setPendingRequestsCount(dynamicPendingCount)
    } else {
      setPendingRequestsCount(0)
    }
  }, [dynamicPendingCount, isTeamLeader])

  // 승인 대기 요청 수 로드 (실시간 Hook에서 처리됨)
  const loadPendingRequestsCount = async () => {
    // 실시간 Hook에서 자동으로 처리됨
  }

  // 팀 멤버 업데이트 후 호출할 함수 (실시간 Hook으로 대체됨)
  const handleMemberUpdate = async () => {
    try {
      // 실시간 Hook에서 자동으로 처리되지만, 수동 새로고침이 필요한 경우
      await refreshMembers()
      
      // 승인 대기 카운트는 실시간으로 자동 업데이트됨
    } catch (error) {
      console.error('팀 멤버 업데이트 오류:', error)
    }
  }

  // handleStartSession 함수는 모달 컴포넌트로 대체됨

  // handleInviteMember 함수는 InviteMemberModal 컴포넌트에서 처리됨

  const handleViewStats = () => {
    // TODO: 통계 페이지로 이동
    router.push(`/team/${teamId}/stats`)
  }

  const handleViewPersonalStats = () => {
    router.push(`/team/${teamId}/personal-stats`)
  }

  const handleViewMatches = () => {
    router.push(`/team/${teamId}/matches`)
  }


  const handleTierBadgeClick = (member: TeamMember) => {
    setTierEditDialog({
      isOpen: true,
      memberId: member.id,
      memberName: member.nickname,
      currentTier: member.tier
    })
  }

  const handleTierUpdate = useCallback(async (memberId: string, newTier: TierType) => {
    try {
      // 실시간 Hook을 사용하여 티어 업데이트 (로컬 상태 즉시 반영 + API 호출)
      await realtimeTierUpdate(memberId, newTier)
    } catch (error) {
      console.error('티어 업데이트 실패:', error)
      alert('티어 업데이트에 실패했습니다.')
    }
  }, [realtimeTierUpdate])

  const handlePositionBadgeClick = (member: TeamMember) => {
    setPositionEditDialog({
      isOpen: true,
      memberId: member.id,
      memberName: member.nickname,
      currentMainPosition: member.mainPosition,
      currentSubPositions: member.subPositions || []
    })
  }

  const handlePositionUpdate = useCallback(async (memberId: string, mainPosition: Position, subPositions: Position[]) => {
    try {
      // 실시간 Hook을 사용하여 포지션 업데이트 (로컬 상태 즉시 반영 + API 호출)
      await realtimePositionUpdate(memberId, mainPosition, subPositions)
    } catch (error) {
      console.error('포지션 업데이트 실패:', error)
      alert('포지션 업데이트에 실패했습니다.')
    }
  }, [realtimePositionUpdate])

  const closeTierEditDialog = () => {
    setTierEditDialog({
      isOpen: false,
      memberId: null,
      memberName: '',
      currentTier: null
    })
  }

  const closePositionEditDialog = () => {
    setPositionEditDialog({
      isOpen: false,
      memberId: null,
      memberName: '',
      currentMainPosition: null,
      currentSubPositions: null
    })
  }

  // 모든 Hook은 조건부 return 이전에 선언되어야 함
  const memberStatsWithWinRate = useMemo(() => {
    // 멤버별 승률을 미리 계산하여 렌더링 성능 향상
    return members.map(member => ({
      ...member,
      winRate: calculateWinRate(member.stats.totalWins, member.stats.totalLosses)
    }))
  }, [members])

  if (authLoading || isLoading || membersLoading || !authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div>로딩 중...</div>
          {realtimeError && (
            <div className="text-sm text-red-500 mt-2">
              실시간 연결 오류: {realtimeError}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>팀을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-card">
        <div className="container mx-auto py-2 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                ← 대시보드
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  {team.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {team.description || '팀 설명이 없습니다'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 테마 토글 */}
              <ThemeToggle />
              
              {/* 실시간 연결 상태 표시 */}
              <div className="flex items-center space-x-1">
                {realtimeConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <div className="text-right text-sm text-muted-foreground">
                <div>멤버 {members.length}명</div>
                <div>{new Date(team.createdAt).toLocaleDateString('ko-KR')} 생성</div>
              </div>
              {isTeamLeader && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsTeamManagementModalOpen(true)}
                  className="relative"
                >
                  <Settings className="w-4 h-4" />
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 왼쪽: 빠른 액션 */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  빠른 액션
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TeamBalanceModal
                  teamId={teamId}
                  currentUserId={authState.user?.id || ''}
                />

                <MatchResultInputModal
                  teamId={teamId}
                  currentUserId={authState.user?.id || ''}
                />
                
                <Button
                  onClick={handleViewStats}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  팀 통계 보기
                </Button>

                <Button
                  onClick={handleViewPersonalStats}
                  variant="outline"
                  className="w-full"
                >
                  <User className="w-4 h-4 mr-2" />
                  개인 통계 보기
                </Button>

                <Button
                  onClick={handleViewMatches}
                  variant="outline"
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  경기 결과 조회
                </Button>
                
                <InviteMemberModal 
                  teamId={teamId} 
                  currentUserId={authState.user?.id || ''} 
                  teamName={team?.name || ''}
                  isTeamLeader={!!isTeamLeader}
                />
              </CardContent>
            </Card>

            {/* 팀 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>팀 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 상위 랭킹 1,2,3위 */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">상위 랭킹</h4>
                  {topRankings.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      아직 랭킹 정보가 없습니다
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {topRankings.slice(0, 3).map((player, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span>🥇</span>}
                            {index === 1 && <span>🥈</span>}
                            {index === 2 && <span>🥉</span>}
                            <span className="font-medium">{player.nickname}</span>
                          </div>
                          <span className="text-green-600 font-semibold">{player.winRate}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 최다 MVP */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">최다 MVP</h4>
                  {mvpLeader ? (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">{mvpLeader.nickname}</span>
                      </div>
                      <span className="text-yellow-600 font-semibold">{mvpLeader.mvpCount}회</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      아직 MVP 정보가 없습니다
                    </div>
                  )}
                </div>

                {/* 현재 연승/연패 */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">최근 기록</h4>
                  {currentStreak ? (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {currentStreak.streak > 0 ? (
                          <span>🔥</span>
                        ) : (
                          <span>❄️</span>
                        )}
                        <span className="font-medium">{currentStreak.nickname}</span>
                      </div>
                      <span className={currentStreak.streak > 0 ? 'text-red-600 font-semibold' : 'text-blue-600 font-semibold'}>
                        {Math.abs(currentStreak.streak)}{currentStreak.streak > 0 ? '연승' : '연패'} 중
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      아직 기록 정보가 없습니다
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 멤버 목록 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  팀 멤버 ({members.length}명)
                </CardTitle>
                <CardDescription>
                  팀원들의 티어와 포지션, 최근 성과를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {memberStatsWithWinRate.map((member) => {
                    // 해당 멤버의 주력 챔피언 및 실제 통계 찾기
                    const memberChampionStat = memberChampionStats.find(stat => stat.memberId === member.id);
                    const topChampion = memberChampionStat?.topChampion;
                    
                    return (
                      <MemberCard
                        key={member.id}
                        member={member}
                        currentUserId={authState.user?.id}
                        isLeader={authState.user?.id === team?.leaderId}
                        topChampion={topChampion}
                        actualKDA={memberChampionStat?.averageKDA}
                        actualMvpCount={memberChampionStat?.mvpCount}
                        actualCurrentStreak={memberChampionStat?.currentStreak}
                        onClick={() => {
                          // 티어나 포지션 편집 모달을 열기 위한 클릭 핸들러 유지
                          console.log('Member card clicked:', member.nickname)
                        }}
                        showActions={authState.user?.id === member.userId || !!isTeamLeader}
                      >
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTierBadgeClick(member)
                            }}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 px-2 rounded transition-colors whitespace-nowrap"
                          >
                            티어 편집
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePositionBadgeClick(member)
                            }}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 py-1 px-2 rounded transition-colors whitespace-nowrap"
                          >
                            포지션 편집
                          </button>
                        </>
                      </MemberCard>
                    );
                  })}
                </div>

                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    아직 팀 멤버가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 티어 수정 대화상자 */}
      {tierEditDialog.currentTier && (
        <TierEditDialog
          isOpen={tierEditDialog.isOpen}
          onOpenChange={closeTierEditDialog}
          currentTier={tierEditDialog.currentTier}
          memberName={tierEditDialog.memberName}
          onTierUpdate={(newTier) => {
            if (tierEditDialog.memberId) {
              handleTierUpdate(tierEditDialog.memberId, newTier)
            }
          }}
          canEdit={authState.user?.id === members.find(m => m.id === tierEditDialog.memberId)?.userId}
        />
      )}

      {/* 포지션 수정 대화상자 */}
      {positionEditDialog.currentMainPosition && positionEditDialog.currentSubPositions !== null && (
        <PositionEditDialog
          isOpen={positionEditDialog.isOpen}
          onOpenChange={closePositionEditDialog}
          currentMainPosition={positionEditDialog.currentMainPosition}
          currentSubPositions={positionEditDialog.currentSubPositions}
          memberName={positionEditDialog.memberName}
          onPositionUpdate={(mainPosition, subPositions) => {
            if (positionEditDialog.memberId) {
              handlePositionUpdate(positionEditDialog.memberId, mainPosition, subPositions)
            }
          }}
          canEdit={authState.user?.id === members.find(m => m.id === positionEditDialog.memberId)?.userId}
        />
      )}

      {/* 팀 관리 모달 */}
      {authState.user && team && (
        <TeamManagementModal
          isOpen={isTeamManagementModalOpen}
          onClose={() => setIsTeamManagementModalOpen(false)}
          teamId={teamId}
          currentUserId={authState.user.id}
          isLeader={!!isTeamLeader}
          teamName={team.name}
          onMemberUpdate={handleMemberUpdate}
          onTeamDeleted={() => {
            // 팀이 삭제되면 대시보드로 리다이렉트
            router.push('/dashboard')
          }}
        />
      )}

    </div>
  )
}