'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampionSelect } from '@/components/ui/champion-select'
import { NumberWheel } from '@/components/ui/number-wheel'
import { getAuthState } from '@/lib/auth'
import { Session, User, Position, SessionMember } from '@/lib/types'
import { getSession, updateSessionResult, saveMatchResult } from '@/lib/supabase-api'
import { positionNames } from '@/lib/utils'
import { Trophy, Users, ArrowLeft, Save, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const positionOrder: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

// 포지션 컬럼 컴포넌트
function PositionColumn({ members }: { members: SessionMember[] }) {
  return (
    <div className="w-20 space-y-3">
      {members.map((member) => (
        <div key={member.memberId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px] flex items-center">
          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs font-medium whitespace-nowrap">
            {positionNames[member.position]}
          </div>
        </div>
      ))}
    </div>
  )
}

// 드래그 가능한 선수 이름 컬럼 컴포넌트
function PlayerNameColumn({ 
  members, 
  onDragEnd 
}: { 
  members: SessionMember[]
  onDragEnd: (event: DragEndEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <div className="w-36 space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext 
          items={members.map(m => m.memberId)} 
          strategy={verticalListSortingStrategy}
        >
          {members.map((member) => (
            <DraggablePlayerName key={member.memberId} member={member} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

// 드래그 가능한 선수 이름 카드
function DraggablePlayerName({ member }: { member: SessionMember }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.memberId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        cursor-grab active:cursor-grabbing 
        bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 
        border border-blue-200 dark:border-blue-700 
        rounded-lg shadow-sm hover:shadow-md 
        hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 
        px-3 py-4 transition-all duration-200 
        h-[84px] flex items-center
        ${isDragging ? 'opacity-80 shadow-lg scale-105 z-50' : 'z-0'}
        group
      `}
      title={member.nickname}
    >
      <div className="flex items-center justify-between w-full">
        <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm truncate pr-2 flex-1">
          {member.nickname}
        </div>
        <div className="opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0">
          <GripVertical className="w-3 h-3 text-blue-500 dark:text-blue-400" />
        </div>
      </div>
    </div>
  )
}

// 챔피언 및 KDA 컬럼 컴포넌트
function ChampionKdaColumn({ 
  members, 
  onUpdate 
}: { 
  members: SessionMember[]
  onUpdate: (memberId: string, field: keyof SessionMember, value: string | number) => void
}) {
  return (
    <div className="flex-1 space-y-3">
      {members.map((member) => (
        <div key={member.memberId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px]">
          <div className="grid grid-cols-4 gap-3 items-center h-full">
            {/* 챔피언 선택 */}
            <ChampionSelect
              value={member.champion || ''}
              onValueChange={(value) => onUpdate(member.memberId, 'champion', value)}
              placeholder="챔피언"
              className="h-9"
            />
            
            {/* KDA 입력 */}
            <NumberWheel
              value={member.kills || 0}
              onChange={(value) => onUpdate(member.memberId, 'kills', value)}
              placeholder="K"
              min={0}
              max={30}
            />
            <NumberWheel
              value={member.deaths || 0}
              onChange={(value) => onUpdate(member.memberId, 'deaths', value)}
              placeholder="D"
              min={0}
              max={30}
            />
            <NumberWheel
              value={member.assists || 0}
              onChange={(value) => onUpdate(member.memberId, 'assists', value)}
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
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [winner, setWinner] = useState<'team1' | 'team2' | null>(null)
  const [team1Data, setTeam1Data] = useState<SessionMember[]>([])
  const [team2Data, setTeam2Data] = useState<SessionMember[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      try {
        console.log('경기 페이지: 인증 상태 확인 시작')
        const authState = await getAuthState()
        if (!authState.isAuthenticated) {
          console.log('경기 페이지: 인증 안됨, 로그인으로 이동')
          router.push('/login')
          return
        }

        if (isMounted) {
          setCurrentUser(authState.user)
        }

        console.log('경기 페이지: 세션 데이터 로드 시작, sessionId:', sessionId)
        // Supabase에서 세션 데이터 로드
        const sessionData = await getSession(sessionId)
        
        if (!sessionData) {
          if (isMounted) {
            alert('세션 데이터를 찾을 수 없습니다.')
            router.push('/dashboard')
          }
          return
        }

        console.log('경기 페이지: 세션 데이터 로드 완료:', sessionData)
        
        // Supabase 데이터를 UI 형식으로 변환
        const session: Session = {
          id: sessionData.id,
          teamId: sessionData.teamId,
          createdBy: sessionData.createdBy,
          status: sessionData.status === 'in_progress' ? 'playing' : 
                  sessionData.status === 'completed' ? 'finished' : 'preparing',
          selectedMembers: sessionData.selectedMembers,
          balancingMethod: 'smart', // 기본값으로 스마트 밸런싱 설정
          createdAt: new Date(sessionData.createdAt),
          participants: [],
          team1: {
            color: 'blue' as const,
            members: sessionData.team1Members || []
          },
          team2: {
            color: 'red' as const,
            members: sessionData.team2Members || []
          }
        }

        console.log('세션 데이터 변환 완료:', session)
        console.log('팀1 멤버:', session.team1.members)
        console.log('팀2 멤버:', session.team2.members)

        if (isMounted) {
          setSession(session)
          setTeam1Data(session.team1.members || [])
          setTeam2Data(session.team2.members || [])
          setIsLoading(false)
        }
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
  }, [sessionId, router])

  const updateTeamMember = (
    team: 'team1' | 'team2',
    memberId: string,
    field: keyof SessionMember,
    value: string | number
  ) => {
    const setTeamData = team === 'team1' ? setTeam1Data : setTeam2Data
    setTeamData(prev => 
      prev.map(member => 
        member.memberId === memberId 
          ? { ...member, [field]: value }
          : member
      )
    )
  }

  const handleDragEnd = (event: DragEndEvent, team: 'team1' | 'team2') => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const setTeamData = team === 'team1' ? setTeam1Data : setTeam2Data

    setTeamData((items) => {
      const oldIndex = items.findIndex(item => item.memberId === active.id)
      const newIndex = items.findIndex(item => item.memberId === over.id)

      const reorderedItems = arrayMove(items, oldIndex, newIndex)
      
      // 포지션도 함께 업데이트
      return reorderedItems.map((item, index) => ({
        ...item,
        position: positionOrder[index]
      }))
    })
  }

  const handleSaveResults = async () => {
    if (!winner) {
      alert('승리 팀을 선택해주세요.')
      return
    }

    // 필수 필드 검증
    const allMembers = [...team1Data, ...team2Data]
    const missingData = allMembers.some(member => 
      !member.champion || 
      member.kills === undefined || 
      member.deaths === undefined || 
      member.assists === undefined
    )

    if (missingData) {
      alert('모든 플레이어의 챔피언과 KDA를 입력해주세요.')
      return
    }

    setIsSaving(true)
    
    try {
      // 1. 세션 상태 업데이트
      const sessionSuccess = await updateSessionResult(sessionId, {
        team1Members: team1Data.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion || '',
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })),
        team2Members: team2Data.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion || '',
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })),
        winner
      })
      
      if (!sessionSuccess) {
        throw new Error('세션 상태 업데이트에 실패했습니다.')
      }

      // 2. 실제 경기 결과 저장 및 통계 업데이트
      const matchId = await saveMatchResult({
        sessionId,
        teamId: session?.teamId || '',
        team1Members: team1Data.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion || '',
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })),
        team2Members: team2Data.map(member => ({
          memberId: member.memberId,
          position: member.position,
          champion: member.champion || '',
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })),
        winner
      })

      if (!matchId) {
        throw new Error('경기 결과 저장에 실패했습니다.')
      }
      
      alert('경기 결과가 저장되었습니다! 멤버 통계가 업데이트되었습니다.')
      console.log('경기 결과 저장 및 통계 업데이트 완료, 매치 ID:', matchId)
      router.push(`/team/${session?.teamId}`)
    } catch (error) {
      console.error('경기 결과 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '경기 결과 저장에 실패했습니다.'
      alert(`오류: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>세션을 찾을 수 없습니다.</div>
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
                onClick={() => router.push(`/team/${session.teamId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                팀으로 돌아가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  경기 결과 입력
                </h1>
                <p className="text-sm text-muted-foreground">
                  각 플레이어의 챔피언과 KDA를 입력하세요
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleSaveResults}
                disabled={isSaving || !winner}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '저장 중...' : '결과 저장'}
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
                  블루팀
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* 포지션 영역 */}
                  <PositionColumn members={team1Data} />
                  
                  {/* 드래그 가능한 선수명 영역 */}
                  <PlayerNameColumn 
                    members={team1Data}
                    onDragEnd={(event) => handleDragEnd(event, 'team1')}
                  />
                  
                  {/* 챔피언/KDA 영역 */}
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
                  레드팀
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* 포지션 영역 */}
                  <PositionColumn members={team2Data} />
                  
                  {/* 드래그 가능한 선수명 영역 */}
                  <PlayerNameColumn 
                    members={team2Data}
                    onDragEnd={(event) => handleDragEnd(event, 'team2')}
                  />
                  
                  {/* 챔피언/KDA 영역 */}
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
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? '저장 중...' : '경기 결과 저장'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}