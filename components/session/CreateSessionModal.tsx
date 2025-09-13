'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TeamMember } from '@/lib/types'
import { getTeamMembers, getUserById, createSession } from '@/lib/supabase-api'
import { useTeamMembersRealtime } from '@/lib/hooks/useTeamMembersRealtime'
import { useTeamSessionsRealtime } from '@/lib/hooks/useSessionRealtime'
import { calculateWinRate, calculateMemberTierScore } from '@/lib/stats'
import { tierNames, positionNames } from '@/lib/utils'
import { analyzeTeamFormation, simulateTeamComposition, recommendOptimalPositions, optimizedTeamBalancing, convertToLegacyFormat } from '@/lib/position-analysis'
import { Users, Crown, Play, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

interface CreateSessionModalProps {
  teamId: string
  currentUserId: string
}

interface SelectedMember extends TeamMember {
  user: {
    id: string
    email: string
    name: string
    username?: string
    avatar?: string
    provider: 'kakao' | 'naver' | 'google'
    createdAt: Date
  }
  calculatedTierScore?: number
}

type BalancingMethod = 'smart' | 'random'

export default function CreateSessionModal({ teamId, currentUserId }: CreateSessionModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isBalancing, setIsBalancing] = useState(false)
  const [balancingMethod, setBalancingMethod] = useState<BalancingMethod>('smart')
  const [balancedTeams, setBalancedTeams] = useState<{
    team1: SelectedMember[]
    team2: SelectedMember[]
    team1MMR: number
    team2MMR: number
    positionFeasible: boolean
    positionAnalysis: {
      team1Assignments: Record<string, string>
      team2Assignments: Record<string, string>
      team1Score: number
      team2Score: number
    }
  } | null>(null)
  const [membersWithUser, setMembersWithUser] = useState<SelectedMember[]>([])

  // 실시간 팀 멤버 관리
  const {
    members: teamMembers,
    loading: membersLoading
  } = useTeamMembersRealtime(teamId)

  // 실시간 팀 세션 관리
  const {
    activeSessions,
    activeSessionCount
  } = useTeamSessionsRealtime(teamId)

  // 실시간 팀 멤버 데이터를 사용자 정보와 함께 가공
  useEffect(() => {
    const loadMembersWithUserData = async () => {
      if (!open || !teamMembers.length) return

      try {
        // 각 멤버의 사용자 정보도 로드
        const membersWithUserData = await Promise.all(
          teamMembers.map(async (member) => {
            const user = await getUserById(member.userId)
            return {
              ...member,
              user,
              calculatedTierScore: calculateMemberTierScore(member)
            }
          })
        )

        setMembersWithUser(membersWithUserData as any)
      } catch (error) {
        console.error('세션 모달: 사용자 정보 로드 오류:', error)
      }
    }

    loadMembersWithUserData()
  }, [open, teamMembers])

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
    // 선택이 바뀌면 밸런싱 결과 초기화
    setBalancedTeams(null)
  }

  const handleBalancingMethodChange = (newMethod: BalancingMethod) => {
    setBalancingMethod(newMethod)
    // 밸런싱 방식이 바뀌면 결과 초기화
    setBalancedTeams(null)
  }


  const balanceTeamsSmart = (players: SelectedMember[]): { 
    team1: SelectedMember[], 
    team2: SelectedMember[],
    positionAnalysis: {
      team1Assignments: Record<string, string>
      team2Assignments: Record<string, string> 
      team1Score: number
      team2Score: number
      feasible: boolean
    }
  } => {
    try {
      // 새로운 최적화된 팀 밸런싱 알고리즘 사용
      const optimizedResult = optimizedTeamBalancing(players)
      
      if (optimizedResult.success && optimizedResult.bestCombination) {
        const legacyFormat = convertToLegacyFormat(optimizedResult.bestCombination)
        
        return {
          team1: legacyFormat.team1 as SelectedMember[],
          team2: legacyFormat.team2 as SelectedMember[],
          positionAnalysis: {
            team1Assignments: legacyFormat.positionAnalysis.team1Assignments,
            team2Assignments: legacyFormat.positionAnalysis.team2Assignments,
            team1Score: legacyFormat.positionAnalysis.team1Score,
            team2Score: legacyFormat.positionAnalysis.team2Score,
            feasible: legacyFormat.positionFeasible
          }
        }
      }
    } catch (error) {
      // 최적화된 밸런싱 실패 시 백업 방식 사용
    }

    // 백업: 균형잡힌 스네이크 드래프트
    const sortedPlayers = [...players].sort((a, b) => b.calculatedTierScore! - a.calculatedTierScore!)
    const team1: SelectedMember[] = []
    const team2: SelectedMember[] = []

    // 개선된 스네이크 패턴: ABBAABBA... (1-2-2-1-1-2-2-1...)
    for (let i = 0; i < sortedPlayers.length; i++) {
      const roundNumber = Math.floor(i / 2)
      const isFirstPick = i % 2 === 0
      
      if (roundNumber % 2 === 0) {
        // 홀수 라운드 (0, 2, 4...): A가 먼저 뽑음
        if (isFirstPick) {
          team1.push(sortedPlayers[i])
        } else {
          team2.push(sortedPlayers[i])
        }
      } else {
        // 짝수 라운드 (1, 3, 5...): B가 먼저 뽑음
        if (isFirstPick) {
          team2.push(sortedPlayers[i])
        } else {
          team1.push(sortedPlayers[i])
        }
      }
    }

    return { 
      team1, 
      team2,
      positionAnalysis: {
        team1Assignments: recommendOptimalPositions(team1),
        team2Assignments: recommendOptimalPositions(team2),
        team1Score: analyzeTeamFormation(team1).balanceScore,
        team2Score: analyzeTeamFormation(team2).balanceScore,
        feasible: analyzeTeamFormation(team1).canFormCompleteTeam && analyzeTeamFormation(team2).canFormCompleteTeam
      }
    }
  }

  const balanceTeamsRandom = (players: SelectedMember[]): { team1: SelectedMember[], team2: SelectedMember[] } => {
    // 플레이어 배열을 섞기 (Fisher-Yates 알고리즘)
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // 섞인 배열을 반으로 나누기
    const midPoint = Math.floor(shuffled.length / 2)
    const team1 = shuffled.slice(0, midPoint)
    const team2 = shuffled.slice(midPoint)

    return { team1, team2 }
  }

  const balanceTeams = () => {
    if (selectedMembers.length !== 10) {
      if (selectedMembers.length < 10) {
        alert(`10명을 선택해야 합니다. 현재: ${selectedMembers.length}명`)
      } else {
        alert(`정확히 10명만 선택해야 합니다. 현재: ${selectedMembers.length}명`)
      }
      return
    }

    setIsBalancing(true)

    setTimeout(() => {
      const selectedMemberObjects = membersWithUser.filter(m => selectedMembers.includes(m.id))
      const membersWithTierScore = selectedMemberObjects.map(member => ({
        ...member,
        calculatedTierScore: calculateMemberTierScore(member)
      }))

      // 정확히 10명으로 5vs5 팀 구성
      const playersToUse = membersWithTierScore
      
      // 선택된 밸런싱 방식에 따라 팀 구성
      if (balancingMethod === 'smart') {
        const smartResult = balanceTeamsSmart(playersToUse)
        const team1TierScore = Math.round(smartResult.team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / smartResult.team1.length)
        const team2TierScore = Math.round(smartResult.team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / smartResult.team2.length)

        setBalancedTeams({
          team1: smartResult.team1,
          team2: smartResult.team2,
          team1MMR: team1TierScore,
          team2MMR: team2TierScore,
          positionFeasible: smartResult.positionAnalysis.feasible,
          positionAnalysis: smartResult.positionAnalysis
        })
      } else {
        const randomResult = balanceTeamsRandom(playersToUse)
        const team1TierScore = Math.round(randomResult.team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / randomResult.team1.length)
        const team2TierScore = Math.round(randomResult.team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / randomResult.team2.length)

        setBalancedTeams({
          team1: randomResult.team1,
          team2: randomResult.team2,
          team1MMR: team1TierScore,
          team2MMR: team2TierScore,
          positionFeasible: analyzeTeamFormation(randomResult.team1).canFormCompleteTeam && analyzeTeamFormation(randomResult.team2).canFormCompleteTeam,
          positionAnalysis: {
            team1Assignments: recommendOptimalPositions(randomResult.team1),
            team2Assignments: recommendOptimalPositions(randomResult.team2),
            team1Score: analyzeTeamFormation(randomResult.team1).balanceScore,
            team2Score: analyzeTeamFormation(randomResult.team2).balanceScore
          }
        })
      }

      setIsBalancing(false)
    }, 1500) // 1.5초 로딩으로 진짜처럼 보이게
  }

  const confirmSession = async () => {
    if (!balancedTeams) return
    
    try {
      setIsBalancing(true)
      
      // 포지션 배열을 상수로 선언하여 반복 생성 방지
      const positions = ['top', 'jungle', 'mid', 'adc', 'support'] as const
      
      // 데이터 변환 최적화 - 한 번에 처리
      const createTeamData = (teamMembers: typeof balancedTeams.team1) => 
        teamMembers.map((member, index) => ({
          id: member.id,
          nickname: member.nickname,
          position: positions[index],
          tier: member.tier,
          tierScore: member.calculatedTierScore || 0
        }))
      
      const team1MembersData = createTeamData(balancedTeams.team1)
      const team2MembersData = createTeamData(balancedTeams.team2)

      // 선택된 멤버 ID만 추출
      const selectedMemberIds = selectedMembers

      const sessionId = await createSession(
        teamId,
        currentUserId,
        [...team1MembersData, ...team2MembersData], // 모든 선택된 멤버 데이터
        balancingMethod,
        team1MembersData,
        team2MembersData
      )
      
      if (!sessionId) {
        throw new Error('세션 생성에 실패했습니다.')
      }
      
      // 세션이 실제로 데이터베이스에 저장되었는지 확인
      let sessionReady = false
      let retryCount = 0
      const maxRetries = 10
      
      while (!sessionReady && retryCount < maxRetries) {
        try {
          const { getSession } = await import('@/lib/supabase-api')
          const sessionData = await getSession(sessionId)
          
          if (sessionData) {
            sessionReady = true
          } else {
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (error) {
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      if (!sessionReady) {
        throw new Error('세션 생성이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.')
      }
      
      // 페이지 이동
      const targetUrl = `/session/${sessionId}/match`
      router.push(targetUrl)
      
      // 비동기적으로 상태 정리
      setTimeout(() => {
        setOpen(false)
        setSelectedMembers([])
        setBalancedTeams(null)
        setIsBalancing(false)
      }, 100)
      
    } catch (error) {
      console.error('세션 생성 실패:', error)
      alert('세션 생성에 실패했습니다.')
      setIsBalancing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 rounded-xl text-base font-semibold">
          새 내전 시작하기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-6 h-6 text-blue-600" />
            새 내전 세션 생성
          </DialogTitle>
          <DialogDescription>
            참가할 멤버를 선택하고 팀 밸런싱을 진행하세요 (정확히 10명)
            {activeSessionCount > 0 && (
              <div className="mt-2 text-orange-600 font-medium">
                ⚠️ 현재 {activeSessionCount}개의 활성 세션이 있습니다
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 멤버 선택 섹션 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              참가 멤버 선택 ({selectedMembers.length}명)
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
              {membersWithUser.map((member) => {
                const isSelected = selectedMembers.includes(member.id)
                return (
                  <div 
                    key={member.id} 
                    className={`
                      flex items-center space-x-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                    onClick={() => handleMemberToggle(member.id)}
                  >
                    <div className="flex-shrink-0">
                      <Checkbox
                        id={member.id}
                        checked={isSelected}
                        onCheckedChange={() => handleMemberToggle(member.id)}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base break-all">
                          {member.nickname}
                        </span>
                        {member.role === 'leader' && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tierNames[member.tier]} • {positionNames[member.mainPosition]}
                        {member.subPositions && member.subPositions.length > 0 && (
                          <span> (+{member.subPositions.map(pos => positionNames[pos]).join(', ')})</span>
                        )}
                        • 점수: {calculateMemberTierScore(member)}
                      </div>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* 전체 선택/해제 버튼 */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedMembers.length}명 선택됨 
                {selectedMembers.length === 10 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium"> ✓ 완료</span>
                ) : selectedMembers.length < 10 ? (
                  <span className="text-orange-600 dark:text-orange-400"> ({10 - selectedMembers.length}명 더 필요)</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400"> ({selectedMembers.length - 10}명 초과)</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMembers(membersWithUser.slice(0, 10).map(m => m.id))}
                  disabled={membersWithUser.length < 10}
                >
                  {membersWithUser.length >= 10 ? '10명 선택' : '전체 선택'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMembers([])}
                >
                  전체 해제
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* 밸런싱 방식 선택 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">밸런싱 방식</h3>
            <div className="space-y-3">
              <div>
                <Select value={balancingMethod} onValueChange={handleBalancingMethodChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">스마트 밸런싱 (티어 점수 + 승률)</SelectItem>
                    <SelectItem value="random">랜덤 밸런싱</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {balancingMethod === 'smart' ? (
                  <div>
                    <strong>스마트 밸런싱:</strong> 각 플레이어의 티어와 승률을 고려하여 양 팀의 실력이 균등하게 배치됩니다.
                  </div>
                ) : (
                  <div>
                    <strong>랜덤 밸런싱:</strong> 완전히 무작위로 팀을 구성합니다. 실력 차이는 고려하지 않습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 밸런싱 버튼 */}
          <div className="flex justify-center">
            <Button
              onClick={balanceTeams}
              disabled={selectedMembers.length !== 10 || isBalancing}
              className="px-8 h-12"
            >
              {isBalancing ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>밸런싱 중...</span>
                </div>
              ) : (
                <>팀 밸런싱 시작</>
              )}
            </Button>
          </div>

          {/* 밸런싱 결과 */}
          {balancedTeams && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold">팀 밸런싱 결과</h3>
                {balancedTeams.positionFeasible ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-xs">
                    <CheckCircle className="w-3 h-3" />
                    <span>포지션 완성</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-md text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>포지션 부족</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 팀 1 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300">블루팀</h4>
                    <div className="flex justify-center gap-4 text-sm text-blue-600 dark:text-blue-400">
                      <span>평균 티어: {balancedTeams.team1MMR}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {balancedTeams.team1.map((member) => {
                      const assignedPosition = balancedTeams.positionAnalysis.team1Assignments[member.id]
                      return (
                        <div key={member.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                          <div>
                            <span className="font-medium">{member.nickname}</span>
                            {assignedPosition && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                {positionNames[assignedPosition as keyof typeof positionNames]}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground text-right">
                            <div>{calculateMemberTierScore(member)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 팀 2 */}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-200 dark:border-red-800">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-bold text-red-700 dark:text-red-300">레드팀</h4>
                    <div className="flex justify-center gap-4 text-sm text-red-600 dark:text-red-400">
                      <span>평균 티어: {balancedTeams.team2MMR}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {balancedTeams.team2.map((member) => {
                      const assignedPosition = balancedTeams.positionAnalysis.team2Assignments[member.id]
                      return (
                        <div key={member.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                          <div>
                            <span className="font-medium">{member.nickname}</span>
                            {assignedPosition && (
                              <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                                {positionNames[assignedPosition as keyof typeof positionNames]}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground text-right">
                            <div>{calculateMemberTierScore(member)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-semibold text-gray-700 dark:text-gray-300">밸런싱 방법</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {balancingMethod === 'smart' ? '스마트 최적화' : '랜덤 배정'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-semibold text-gray-700 dark:text-gray-300">티어 점수 차이</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.abs(balancedTeams.team1MMR - balancedTeams.team2MMR)}점
                    </div>
                  </div>
                </div>
                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={balanceTeams} disabled={isBalancing}>
                    다시 밸런싱
                  </Button>
                  <Button onClick={confirmSession} disabled={isBalancing}>
                    {isBalancing ? '세션 생성 중...' : '내전 확정'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}