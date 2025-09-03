'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getAuthState, getCurrentUser } from '@/lib/auth'
import { Team, TeamMember, User } from '@/lib/types'
import { getTeamById, getTeamMembers, getUserById, updateMemberTier, updateMemberPositions, getTopRankings, getTeamMVPRanking, getCurrentStreaks, getPendingJoinRequests } from '@/lib/supabase-api'
import { calculateWinRate } from '@/lib/stats'
import { positionNames } from '@/lib/utils'
import { Users, Crown, Plus, Play, BarChart3, Settings, History, Trophy } from 'lucide-react'
import CreateSessionModal from '@/components/session/CreateSessionModal'
import InviteMemberModal from '@/components/team/InviteMemberModal'
import { TierBadge } from '@/components/ui/tier-badge'
import { TierEditDialog } from '@/components/ui/tier-edit-dialog'
import { TierType, Position } from '@/lib/types'
import { PositionEditDialog } from '@/components/ui/position-edit-dialog'
import TeamManagementModal from '@/components/team/TeamManagementModal'

export default function TeamDashboard() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [topRankings, setTopRankings] = useState<Array<{nickname: string, winRate: number}>>([])
  const [mvpLeader, setMvpLeader] = useState<{memberId: string, nickname: string, mvpCount: number} | null>(null)
  const [currentStreak, setCurrentStreak] = useState<{nickname: string, streak: number} | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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


  useEffect(() => {
    const checkAuthAndLoadTeam = async () => {
      try {
        console.log('팀 페이지: 인증 상태 확인 시작')
        const authState = await getAuthState()
        console.log('팀 페이지: 인증 상태 결과', authState)
        
        if (!authState.isAuthenticated) {
          console.log('팀 페이지: 인증 안됨, 로그인으로 이동')
          router.push('/login')
          return
        }

        console.log('팀 페이지: 인증됨, 사용자:', authState.user?.name)
        setCurrentUser(authState.user)

        // 팀 데이터 로드
        console.log('팀 페이지: 팀 데이터 로드 시작, teamId:', teamId)
        const teamData = await getTeamById(teamId)
        if (!teamData) {
          alert('팀을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }

        console.log('팀 페이지: 팀 데이터 로드 완료:', teamData.name)
        const teamMembers = await getTeamMembers(teamId)
        console.log('팀 페이지: 팀 멤버 로드 완료:', teamMembers.length, '명')
        
        // 현재 사용자가 팀의 활성 멤버인지 확인
        const currentMember = teamMembers.find(member => 
          member.userId === authState.user?.id && member.status === 'active'
        )
        
        if (!currentMember && teamData.leaderId !== authState.user?.id) {
          console.log('팀 페이지: 멤버가 아니거나 추방됨, 대시보드로 이동')
          alert('이 팀에 접근할 수 있는 권한이 없습니다.')
          router.push('/dashboard')
          return
        }
        
        console.log('팀 페이지: 멤버 권한 확인 완료')
        
        // 팀 정보 데이터 로드
        const rankings = await getTopRankings(teamId)
        console.log('팀 페이지: 상위 랭킹 로드 완료:', rankings.length, '명')
        
        const mvpRanking = await getTeamMVPRanking(teamId)
        const mvp = mvpRanking.length > 0 && mvpRanking[0].mvpCount > 0 ? mvpRanking[0] : null
        console.log('팀 페이지: MVP 리더 로드 완료:', mvp?.nickname, mvp?.mvpCount)
        
        const streak = await getCurrentStreaks(teamId)
        console.log('팀 페이지: 현재 연승/연패 로드 완료:', streak?.nickname, streak?.streak)
        
        // 리더인 경우 승인 대기 요청 수 로드
        if (authState.user && teamData.leaderId === authState.user.id) {
          await loadPendingRequestsCount()
        }
        
        setTeam(teamData)
        setMembers(teamMembers)
        setTopRankings(rankings)
        setMvpLeader(mvp)
        setCurrentStreak(streak)
        setIsLoading(false)
      } catch (error) {
        console.error('팀 페이지: 데이터 로드 오류:', error)
        router.push('/dashboard')
      }
    }

    checkAuthAndLoadTeam()
  }, [teamId, router])

  const isTeamLeader = currentUser && team && team.leaderId === currentUser.id

  // 승인 대기 요청 수 로드
  const loadPendingRequestsCount = async () => {
    try {
      const pendingRequests = await getPendingJoinRequests(teamId)
      setPendingRequestsCount(pendingRequests.length)
    } catch (error) {
      console.error('승인 대기 요청 수 로드 오류:', error)
      setPendingRequestsCount(0)
    }
  }

  // 팀 멤버 업데이트 후 호출할 함수
  const handleMemberUpdate = async () => {
    try {
      const teamMembers = await getTeamMembers(teamId)
      setMembers(teamMembers)
      
      // 승인 대기 카운트도 새로고침
      if (isTeamLeader) {
        await loadPendingRequestsCount()
      }
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

  const handleTierUpdate = async (memberId: string, newTier: TierType) => {
    try {
      // Supabase API 업데이트
      await updateMemberTier(memberId, newTier)
      
      // UI 상태 업데이트
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, tier: newTier }
            : member
        )
      )
      console.log('티어 업데이트 성공:', newTier)
    } catch (error) {
      console.error('티어 업데이트 실패:', error)
      alert('티어 업데이트에 실패했습니다.')
    }
  }

  const handlePositionBadgeClick = (member: TeamMember) => {
    setPositionEditDialog({
      isOpen: true,
      memberId: member.id,
      memberName: member.nickname,
      currentMainPosition: member.mainPosition,
      currentSubPositions: member.subPositions || []
    })
  }

  const handlePositionUpdate = async (memberId: string, mainPosition: Position, subPositions: Position[]) => {
    try {
      // Supabase API 업데이트 (다중 부포지션 지원)
      await updateMemberPositions(memberId, mainPosition, subPositions)
      
      // UI 상태 업데이트
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, mainPosition, subPositions }
            : member
        )
      )
      console.log('포지션 업데이트 성공:', mainPosition, subPositions)
    } catch (error) {
      console.error('포지션 업데이트 실패:', error)
      alert('포지션 업데이트에 실패했습니다.')
    }
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>로딩 중...</div>
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
        <div className="container mx-auto px-4 py-4">
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
      <main className="container mx-auto px-4 py-8">
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
                <CreateSessionModal 
                  teamId={teamId} 
                  currentUserId={currentUser?.id || ''} 
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
                  onClick={handleViewMatches}
                  variant="outline" 
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  경기 결과 조회
                </Button>
                
                <InviteMemberModal 
                  teamId={teamId} 
                  currentUserId={currentUser?.id || ''} 
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
                <div className="space-y-4">
                  {members.map((member) => {
                    const winRate = calculateWinRate(member.stats.totalWins, member.stats.totalLosses)
                    
                    return (
                      <div key={member.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{member.nickname}</h3>
                              <button
                                onClick={() => handleTierBadgeClick(member)}
                                className="transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md"
                              >
                                <TierBadge tier={member.tier} size="sm" />
                              </button>
                              {member.role === 'leader' && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">포지션</div>
                                <button
                                  onClick={() => handlePositionBadgeClick(member)}
                                  className="font-medium hover:text-blue-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md"
                                >
                                  주: {positionNames[member.mainPosition]} / 부: {
                                    member.subPositions && member.subPositions.length > 0 
                                      ? member.subPositions.map(pos => positionNames[pos]).join(', ')
                                      : '없음'
                                  }
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-muted-foreground">
                                  티어점수: <span className="font-medium text-foreground">{member.stats.tierScore}</span>
                                </div>
                                <div className="text-muted-foreground">•</div>
                                <div className="text-muted-foreground">
                                  승률: <span className="font-medium text-green-600">{winRate}%</span>
                                </div>
                                <div className="text-muted-foreground">•</div>
                                <div className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{member.stats.totalWins}승 {member.stats.totalLosses}패</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
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
          canEdit={currentUser?.id === members.find(m => m.id === tierEditDialog.memberId)?.userId}
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
          canEdit={currentUser?.id === members.find(m => m.id === positionEditDialog.memberId)?.userId}
        />
      )}

      {/* 팀 관리 모달 */}
      {currentUser && (
        <TeamManagementModal
          isOpen={isTeamManagementModalOpen}
          onClose={() => setIsTeamManagementModalOpen(false)}
          teamId={teamId}
          currentUserId={currentUser.id}
          onMemberUpdate={handleMemberUpdate}
        />
      )}

    </div>
  )
}