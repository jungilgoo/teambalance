'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampionSelect } from '@/components/ui/champion-select'
import { NumberWheel } from '@/components/ui/number-wheel'
import { getAuthState } from '@/lib/auth'
import { Session, User, Position, TeamMember } from '@/lib/types'
import { getSession, updateSessionResult, saveMatchResult, updateMatchResult, getMatchBySessionId } from '@/lib/supabase-api'
import { useSessionRealtime } from '@/lib/hooks/useSessionRealtime'
import { useMatchRealtime } from '@/lib/hooks/useMatchRealtime'
import { positionNames } from '@/lib/utils'
import { Trophy, Users, ArrowLeft, Save } from 'lucide-react'

const positionOrder: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

// 간소화된 포지션 컬럼 컴포넌트
function PositionColumn({ members }: { members: TeamMember[] }) {
  return (
    <div className="w-20 space-y-3">
      {members.map((member, index) => {
        const actualPosition = (member as any).position || member.mainPosition
        const safePosition = actualPosition as Position

        return (
          <div key={`position-${member.id || index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px] flex items-center">
            <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs font-medium whitespace-nowrap">
              {positionNames[safePosition] || positionNames[member.mainPosition]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 간소화된 선수 이름 컬럼 컴포넌트 (드래그 기능 제거)
function PlayerNameColumn({ members }: { members: TeamMember[] }) {
  return (
    <div className="w-36 space-y-3">
      {members.map((member, index) => (
        <div
          key={`player-${member.id || index}`}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px] flex items-center"
        >
          <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm break-all">
            {member.nickname}
          </div>
        </div>
      ))}
    </div>
  )
}

// 챔피언 및 KDA 컬럼 컴포넌트
function ChampionKdaColumn({
  members,
  onUpdate
}: {
  members: TeamMember[]
  onUpdate: (memberId: string, field: keyof TeamMember, value: string | number) => void
}) {
  return (
    <div className="flex-1 space-y-3">
      {members.map((member, index) => (
        <div key={`champion-${member.id || index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px]">
          <div className="grid grid-cols-4 gap-3 items-center h-full">
            {/* 챔피언 선택 */}
            <ChampionSelect
              value={(member as any).champion || ''}
              onValueChange={(value) => onUpdate(member.id, 'champion' as any, value)}
              placeholder="챔피언"
              className="h-9"
            />

            {/* KDA 입력 */}
            <NumberWheel
              value={(member as any).kills || 0}
              onChange={(value) => onUpdate(member.id, 'kills' as any, value)}
              placeholder="K"
              min={0}
              max={30}
            />
            <NumberWheel
              value={(member as any).deaths || 0}
              onChange={(value) => onUpdate(member.id, 'deaths' as any, value)}
              placeholder="D"
              min={0}
              max={30}
            />
            <NumberWheel
              value={(member as any).assists || 0}
              onChange={(value) => onUpdate(member.id, 'assists' as any, value)}
              placeholder="A"
              min={0}
              max={30}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MatchResultPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const isEditMode = searchParams.get('edit') === 'true'

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSecondaryLoading, setIsSecondaryLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [sessionNotFound, setSessionNotFound] = useState(false)
  const [winner, setWinner] = useState<'team1' | 'team2' | null>(null)
  const [team1Data, setTeam1Data] = useState<TeamMember[]>([])
  const [team2Data, setTeam2Data] = useState<TeamMember[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState('')

  // 실시간 세션 관리
  const {
    session: realtimeSession,
    sessionStatus,
    loading: sessionLoading,
    connected: sessionConnected,
    completeSession
  } = useSessionRealtime(sessionId, !isSecondaryLoading)

  // 실시간 매치 결과 관리
  const {
    saveNewMatchResult
  } = useMatchRealtime(realtimeSession?.teamId || '', !!realtimeSession && !isSecondaryLoading)

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      try {
        // 병렬 처리로 성능 최적화: 인증 확인과 세션 데이터 로드를 동시 실행
        const [authState, sessionData] = await Promise.allSettled([
          getAuthState(),
          getSession(sessionId)
        ])

        // 인증 상태 확인
        if (authState.status === 'fulfilled' && authState.value.isAuthenticated) {
          if (isMounted) {
            setCurrentUser(authState.value.user)
          }
        } else {
          console.log('경기 페이지: 인증 안됨, 로그인으로 이동')
          router.push('/login')
          return
        }

        // 세션 데이터 확인 - 재시도 로직 포함
        if (sessionData.status === 'rejected' || !sessionData.value) {
          console.log('세션 데이터 로드 실패, 재시도 중...')

          if (isMounted) {
            setIsRetrying(true)
          }

          // 최대 3번까지 재시도
          let retrySessionData = null
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            try {
              retrySessionData = await getSession(sessionId)
              if (retrySessionData) {
                console.log(`재시도 ${i + 1}번째 성공`)
                break
              }
            } catch (retryError) {
              console.log(`재시도 ${i + 1}번째 실패:`, retryError)
            }
          }

          if (retrySessionData && isMounted) {
            // 재시도 성공 시 계속 진행
            const session: Session = {
              id: retrySessionData.id,
              teamId: retrySessionData.teamId,
              createdBy: 'unknown',
              status: retrySessionData.status === 'in_progress' ? 'in_progress' :
                      retrySessionData.status === 'completed' ? 'completed' : 'preparing',
              selectedMembers: retrySessionData.selectedMembers || [],
              team1Members: retrySessionData.team1Members || [],
              team2Members: retrySessionData.team2Members || [],
              createdAt: new Date(retrySessionData.createdAt)
            }

            const gameData = {
              team1: {
                color: 'blue' as const,
                members: (retrySessionData.team1Members || []).map((member: any, index: number) => {
                  const assignedPosition = member.position
                  const fallbackPosition = positionOrder[index]
                  const finalPosition = assignedPosition || fallbackPosition || member.mainPosition

                  return {
                    ...member,
                    memberId: member.id || member.id,
                    kills: member.kills ?? 0,
                    deaths: member.deaths ?? 0,
                    assists: member.assists ?? 0,
                    position: finalPosition,
                  }
                })
              },
              team2: {
                color: 'red' as const,
                members: (retrySessionData.team2Members || []).map((member: any, index: number) => {
                  const assignedPosition = member.position
                  const fallbackPosition = positionOrder[index]
                  const finalPosition = assignedPosition || fallbackPosition || member.mainPosition

                  return {
                    ...member,
                    memberId: member.id || member.id,
                    kills: member.kills ?? 0,
                    deaths: member.deaths ?? 0,
                    assists: member.assists ?? 0,
                    position: finalPosition,
                  }
                })
              }
            }

            setTeam1Data(gameData.team1.members)
            setTeam2Data(gameData.team2.members)
            setIsLoading(false)

            setTimeout(() => {
              if (isMounted) {
                setIsSecondaryLoading(false)
              }
            }, 500)

            return
          }

          // 재시도도 실패한 경우
          if (isMounted) {
            setSessionNotFound(true)
            setIsLoading(false)

            setTimeout(() => {
              if (isMounted) {
                router.push('/dashboard')
              }
            }, 3000)
          }
          return
        }

        const rawSession = sessionData.value
        console.log('경기 페이지: 세션 데이터 로드 완료:', rawSession)

        // 데이터 변환
        const session: Session = {
          id: rawSession.id,
          teamId: rawSession.teamId,
          createdBy: 'unknown',
          status: rawSession.status === 'in_progress' ? 'in_progress' :
                  rawSession.status === 'completed' ? 'completed' : 'preparing',
          selectedMembers: rawSession.selectedMembers || [],
          team1Members: rawSession.team1Members || [],
          team2Members: rawSession.team2Members || [],
          createdAt: new Date(rawSession.createdAt)
        }

        const gameData = {
          team1: {
            color: 'blue' as const,
            members: (rawSession.team1Members || []).map((member: any, index: number) => {
              const assignedPosition = member.position
              const fallbackPosition = positionOrder[index]
              const finalPosition = assignedPosition || fallbackPosition || member.mainPosition

              return {
                ...member,
                memberId: member.id || member.id,
                kills: member.kills ?? 0,
                deaths: member.deaths ?? 0,
                assists: member.assists ?? 0,
                position: finalPosition,
              }
            })
          },
          team2: {
            color: 'red' as const,
            members: (rawSession.team2Members || []).map((member: any, index: number) => {
              const assignedPosition = member.position
              const fallbackPosition = positionOrder[index]
              const finalPosition = assignedPosition || fallbackPosition || member.mainPosition

              return {
                ...member,
                memberId: member.id || member.id,
                kills: member.kills ?? 0,
                deaths: member.deaths ?? 0,
                assists: member.assists ?? 0,
                position: finalPosition,
              }
            })
          }
        }

        // Progressive Loading 1단계: 핵심 데이터 우선 로드
        if (isMounted) {
          setTeam1Data(gameData.team1.members)
          setTeam2Data(gameData.team2.members)
          setIsLoading(false)
        }

        // Edit 모드인 경우 기존 경기 결과 데이터 로드
        if (isEditMode && isMounted) {
          try {
            const existingMatch = await getMatchBySessionId(sessionId)

            if (existingMatch) {
              // 기존 매치 데이터와 세션 데이터를 병합
              const mergeMatchDataWithSession = (sessionMembers: any[], matchMembers: any[]) => {
                return sessionMembers.map(sessionMember => {
                  const matchMember = matchMembers.find(m => m.memberId === sessionMember.id)
                  return {
                    ...sessionMember,
                    champion: matchMember?.champion || '',
                    kills: matchMember?.kills || 0,
                    deaths: matchMember?.deaths || 0,
                    assists: matchMember?.assists || 0,
                    position: matchMember?.position || sessionMember.mainPosition
                  }
                })
              }

              const mergedTeam1 = mergeMatchDataWithSession(gameData.team1.members, existingMatch.team1.members)
              const mergedTeam2 = mergeMatchDataWithSession(gameData.team2.members, existingMatch.team2.members)

              setTeam1Data(mergedTeam1)
              setTeam2Data(mergedTeam2)
              setWinner(existingMatch.winner)
            }
          } catch (error) {
            console.error('Edit 모드: 기존 경기 결과 로드 오류:', error)
          }
        }

        // Progressive Loading 2단계
        setTimeout(() => {
          if (isMounted) {
            setIsSecondaryLoading(false)
          }
        }, 500)
      } catch (error) {
        console.error('세션 초기화 오류:', error)
        if (isMounted) {
          setIsLoading(false)
          router.push('/dashboard')
        }
      }
    }

    initializeSession()

    return () => {
      isMounted = false
    }
  }, [sessionId, router, isEditMode])

  const updateTeamMember = (
    team: 'team1' | 'team2',
    memberId: string,
    field: keyof TeamMember,
    value: string | number
  ) => {
    if (!memberId || memberId === 'undefined') {
      console.error('❌ memberId가 유효하지 않습니다:', memberId)
      return
    }

    const setTeamData = team === 'team1' ? setTeam1Data : setTeam2Data
    setTeamData(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, [field]: value }
          : member
      )
    )
  }

  const handleSaveResults = async () => {
    if (!winner) {
      alert('승리 팀을 선택해주세요.')
      return
    }

    // 필수 필드 검증
    const allMembers = [...team1Data, ...team2Data]
    const missingData = allMembers.some(member =>
      !(member as any).champion ||
      (member as any).kills === null ||
      (member as any).deaths === null ||
      (member as any).assists === null ||
      (member as any).kills === undefined ||
      (member as any).deaths === undefined ||
      (member as any).assists === undefined
    )

    if (missingData) {
      alert('모든 플레이어의 챔피언과 KDA를 입력해주세요.')
      return
    }

    setIsSaving(true)
    setSavingProgress('💾 경기 결과 준비 중...')

    try {
      // 1. 세션 상태 업데이트
      setSavingProgress('🔄 세션 상태 업데이트 중...')
      const sessionSuccess = await updateSessionResult(sessionId, winner)

      if (!sessionSuccess) {
        throw new Error('세션 상태 업데이트에 실패했습니다.')
      }

      // 2. 실제 경기 결과 저장 또는 업데이트
      let success = false

      if (isEditMode) {
        // 수정 모드: 기존 매치 업데이트
        setSavingProgress('🔄 기존 경기 결과 업데이트 중...')
        success = await updateMatchResult(sessionId, {
          winningTeam: winner,
          team1: team1Data.map(member => ({
            memberId: member.id,
            position: (member as any).position || member.mainPosition,
            champion: (member as any).champion || '',
            kills: (member as any).kills || 0,
            deaths: (member as any).deaths || 0,
            assists: (member as any).assists || 0
          })),
          team2: team2Data.map(member => ({
            memberId: member.id,
            position: (member as any).position || member.mainPosition,
            champion: (member as any).champion || '',
            kills: (member as any).kills || 0,
            deaths: (member as any).deaths || 0,
            assists: (member as any).assists || 0
          }))
        })

        if (success) {
          setSavingProgress('📊 멤버 통계 업데이트 완료!')
        }
      } else {
        // 새로 생성 모드: 새로운 매치 생성
        setSavingProgress('🏆 새로운 경기 결과 저장 중...')
        const matchId = await saveMatchResult({
          sessionId,
          teamId: realtimeSession?.teamId || '',
          winningTeam: winner,
          team1: team1Data.map(member => ({
            memberId: member.id,
            position: (member as any).position || member.mainPosition,
            champion: (member as any).champion || '',
            kills: (member as any).kills || 0,
            deaths: (member as any).deaths || 0,
            assists: (member as any).assists || 0
          })),
          team2: team2Data.map(member => ({
            memberId: member.id,
            position: (member as any).position || member.mainPosition,
            champion: (member as any).champion || '',
            kills: (member as any).kills || 0,
            deaths: (member as any).deaths || 0,
            assists: (member as any).assists || 0
          }))
        })
        success = !!matchId

        if (success) {
          setSavingProgress('📊 멤버 통계 업데이트 완료!')
        }
      }

      if (!success) {
        throw new Error(isEditMode ? '경기 결과 수정에 실패했습니다.' : '경기 결과 저장에 실패했습니다.')
      }

      setSavingProgress('✅ 완료! 통계가 성공적으로 업데이트되었습니다.')

      await new Promise(resolve => setTimeout(resolve, 1000))

      alert(isEditMode
        ? '✅ 경기 결과가 성공적으로 수정되었습니다!\n• 모든 멤버의 통계가 업데이트되었습니다\n• 승률과 티어 점수가 재계산되었습니다'
        : '✅ 경기 결과가 성공적으로 저장되었습니다!\n• 모든 멤버의 통계가 업데이트되었습니다\n• 승률과 티어 점수가 자동 계산되었습니다'
      )
      router.push(`/team/${realtimeSession?.teamId}`)
    } catch (error) {
      console.error('경기 결과 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '경기 결과 저장에 실패했습니다.'
      alert(`오류: ${errorMessage}`)
    } finally {
      setIsSaving(false)
      setSavingProgress('')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium">
            {isRetrying ? '세션 재연결 중...' : '경기 데이터 로딩 중...'}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {isRetrying
              ? '세션 생성이 완료되기까지 잠시 기다려주세요'
              : '팀 구성과 선수 정보를 불러오고 있습니다'
            }
          </div>
          {isRetrying && (
            <div className="mt-4 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg inline-block">
              💫 세션을 준비하는 중입니다
            </div>
          )}
        </div>
      </div>
    )
  }

  if (sessionNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-xl font-semibold text-gray-800 mb-2">
            세션을 준비하고 있습니다
          </div>
          <div className="text-gray-600 mb-6">
            내전 세션이 생성 중이거나 일시적으로 접근할 수 없습니다.
            잠시 후 대시보드로 이동합니다.
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            지금 대시보드로 이동하기
          </button>
        </div>
      </div>
    )
  }

  if (!team1Data.length && !team2Data.length && !isLoading && !sessionNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium">세션을 불러오는 중...</div>
        </div>
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
              <Button
                variant="ghost"
                onClick={() => router.push(`/team/${realtimeSession?.teamId || 'unknown'}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                팀으로 돌아가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  {isEditMode ? '경기 결과 수정' : '경기 결과 입력'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? '경기 결과를 수정하고 저장하세요.' : '각 플레이어의 챔피언과 KDA를 입력하세요.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSaveResults}
                disabled={isSaving || !winner}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? (
                  <span className="text-sm">{savingProgress || '저장 중...'}</span>
                ) : (
                  isEditMode ? '수정 저장' : '결과 저장'
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">

          {/* 승리 팀 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                승리 팀 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={winner === 'team1' ? 'default' : 'outline'}
                  onClick={() => setWinner('team1')}
                  className="flex-1 h-12 text-lg"
                  style={{
                    backgroundColor: winner === 'team1' ? '#3b82f6' : undefined,
                    color: winner === 'team1' ? 'white' : undefined
                  }}
                >
                  블루팀 승리
                </Button>
                <Button
                  variant={winner === 'team2' ? 'default' : 'outline'}
                  onClick={() => setWinner('team2')}
                  className="flex-1 h-12 text-lg"
                  style={{
                    backgroundColor: winner === 'team2' ? '#ef4444' : undefined,
                    color: winner === 'team2' ? 'white' : undefined
                  }}
                >
                  레드팀 승리
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 팀별 경기 결과 입력 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 블루팀 */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="w-5 h-5" />
                  블루팀 ({team1Data.length}/5)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <PositionColumn members={team1Data} />
                  <PlayerNameColumn members={team1Data} />
                  <ChampionKdaColumn
                    members={team1Data}
                    onUpdate={(memberId, field, value) => updateTeamMember('team1', memberId, field, value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 레드팀 */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="bg-red-50 dark:bg-red-900/20">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <Users className="w-5 h-5" />
                  레드팀 ({team2Data.length}/5)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <PositionColumn members={team2Data} />
                  <PlayerNameColumn members={team2Data} />
                  <ChampionKdaColumn
                    members={team2Data}
                    onUpdate={(memberId, field, value) => updateTeamMember('team2', memberId, field, value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 하단 저장 버튼 */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleSaveResults}
              disabled={isSaving || !winner}
              size="lg"
              className="px-12 h-12 text-lg"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {isSaving ? (
                <div className="text-center">
                  <div className="font-medium">{isEditMode ? '수정 중...' : '저장 중...'}</div>
                  <div className="text-xs opacity-90">{savingProgress}</div>
                </div>
              ) : (
                isEditMode ? '경기 결과 수정' : '경기 결과 저장'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}