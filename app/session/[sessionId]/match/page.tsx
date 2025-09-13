'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampionSelect } from '@/components/ui/champion-select'
import { NumberWheel } from '@/components/ui/number-wheel'
import { getAuthState } from '@/lib/auth'
import { Session, User, Position, TeamMember } from '@/lib/types'
import { getSession, updateSessionResult, saveMatchResult, getMatchBySessionId } from '@/lib/supabase-api'
import { useSessionRealtime } from '@/lib/hooks/useSessionRealtime'
import { useMatchRealtime } from '@/lib/hooks/useMatchRealtime'
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
  DragStartEvent,
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
function PositionColumn({ members }: { members: TeamMember[] }) {
  return (
    <div className="w-20 space-y-3">
      {members.map((member, index) => (
        <div key={`position-${member.id || index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm h-[84px] flex items-center">
          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs font-medium whitespace-nowrap">
            {positionNames[member.mainPosition]}
          </div>
        </div>
      ))}
    </div>
  )
}

// HTML5 네이티브 드래그 앤 드롭을 사용하는 선수 이름 컬럼 컴포넌트
function PlayerNameColumn({ 
  members, 
  team,
  onDragEnd,
  onReorder
}: { 
  members: TeamMember[]
  team: 'team1' | 'team2'
  onDragEnd: (event: DragEndEvent, team: 'team1' | 'team2') => void
  onReorder: (newMembers: TeamMember[]) => void
}) {
  const [draggedItem, setDraggedItem] = useState<TeamMember | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null)

  const handleNativeDragStart = (e: React.DragEvent, member: TeamMember, index: number) => {
    // 즉시 상태 업데이트
    setDraggedItem(member)
    setDragOverIndex(null)
    setDraggedFromIndex(index) // 원본 인덱스 저장
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', member.id)
    
    // 드래그 이미지 커스터마이징
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.opacity = '0.8'
    e.dataTransfer.setDragImage(dragImage, 0, 0)
  }

  const handleNativeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // 교체할 타겟 인덱스 설정
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleNativeDragLeave = (e: React.DragEvent) => {
    // 컨테이너를 완전히 벗어날 때만 dragOverIndex를 리셋
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null)
    }
  }

  const handleNativeDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (!draggedItem || dragOverIndex === null || draggedFromIndex === null) {
      return
    }
    
    const sourceIndex = draggedFromIndex // 저장된 원본 인덱스 사용
    const finalTargetIndex = dragOverIndex
    
    if (sourceIndex !== finalTargetIndex) {
      // 즉시 교체 실행 (지연 없음)
      const newMembers = [...members]
      
      // 안전한 교체: 인덱스 범위 확인
      if (sourceIndex >= 0 && sourceIndex < newMembers.length && 
          finalTargetIndex >= 0 && finalTargetIndex < newMembers.length) {
        
        // 두 요소의 위치를 교체
        const temp = newMembers[sourceIndex]
        newMembers[sourceIndex] = newMembers[finalTargetIndex]
        newMembers[finalTargetIndex] = temp
        
        // 포지션 업데이트
        const updatedMembers = newMembers.map((member, index) => ({
          ...member,
          position: positionOrder[index]
        }))
        
        
        // 부모 컴포넌트에 새로운 순서 전달
        onReorder(updatedMembers)
      } else {
        console.error('잘못된 인덱스:', { sourceIndex, finalTargetIndex, membersLength: members.length })
      }
    }
    
    // 상태 리셋 (약간의 지연으로 애니메이션 완료 대기)
    setTimeout(() => {
      setDraggedItem(null)
      setDragOverIndex(null)
      setDraggedFromIndex(null)
    }, 300)
  }

  const handleNativeDragEnd = () => {
    // 드롭이 처리되지 않은 경우에만 상태 리셋
    setTimeout(() => {
      setDraggedItem(null)
      setDragOverIndex(null)
      setDraggedFromIndex(null)
    }, 100)
  }

  return (
    <div className="w-36 space-y-3">
      {members.map((member, index) => {
        // 더 안전한 ID 비교: memberId가 없으면 nickname으로 대체
        const draggedId = draggedItem?.id || draggedItem?.nickname
        const currentId = member.id || member.nickname
        const isDragging = draggedId === currentId
        const isSwapTarget = dragOverIndex === index && draggedItem && !isDragging
        
        
        return (
          <div 
            key={`native-wrapper-${member.id || index}`} 
            className={`
              relative will-change-transform
              ${isSwapTarget ? 'z-10' : ''}
              ${isDragging ? 'z-50' : 'z-0'}
            `}
            style={{
              transform: isSwapTarget ? 'translateY(20px) scale(1.05)' : 
                        isDragging ? 'translateY(-20px) scale(0.95)' : 
                        'translateY(0px) scale(1)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: isSwapTarget ? 'drop-shadow(0 15px 25px rgba(34, 197, 94, 0.4))' :
                     isDragging ? 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))' :
                     'none',
              zIndex: isDragging ? 1000 : isSwapTarget ? 100 : 1
            }}
          >
            {/* 교체 대상 표시 오버레이 */}
            {isSwapTarget && (
              <div className="absolute inset-0 rounded-lg bg-green-200/30 animate-ping pointer-events-none" />
            )}
            
            {/* 드래그 중 표시 오버레이 */}
            {isDragging && (
              <div className="absolute inset-0 rounded-lg bg-blue-200/20 animate-pulse pointer-events-none" />
            )}
            <NativeDraggablePlayerName 
              member={member}
              index={index}
              isDragging={isDragging}
              isDragOver={!!isSwapTarget}
              onDragStart={(e) => handleNativeDragStart(e, member, index)}
              onDragOver={(e) => handleNativeDragOver(e, index)}
              onDragLeave={handleNativeDragLeave}
              onDrop={(e) => handleNativeDrop(e, index)}
              onDragEnd={handleNativeDragEnd}
            />
          </div>
        )
      })}
    </div>
  )
}

// HTML5 네이티브 드래그 앤 드롭을 사용하는 선수 이름 카드
function NativeDraggablePlayerName({ 
  member, 
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: { 
  member: TeamMember
  index: number
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        cursor-grab active:cursor-grabbing
        rounded-lg shadow-sm hover:shadow-md 
        px-3 py-4 h-[84px] flex items-center
        group select-none will-change-transform
        ${isDragging ? 
          'opacity-60 shadow-2xl z-[9999] rotate-3' : 
          'z-0 hover:scale-[1.02] hover:-translate-y-0.5'
        }
      `}
      style={{
        background: isDragOver ? 
          'linear-gradient(to right, rgb(34 197 94 / 0.1), rgb(16 185 129 / 0.1))' :
          'linear-gradient(to right, rgb(59 130 246 / 0.1), rgb(99 102 241 / 0.1))',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isDragOver ? '#22c55e' : '#3b82f6',
        boxShadow: isDragOver ? 
          '0 10px 25px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.2)' :
          isDragging ? 
          '0 25px 50px -12px rgba(0, 0, 0, 0.25)' :
          '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transform: isDragging ? 'rotate(3deg) scale(1.05)' : 'rotate(0deg) scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      title={`${member.nickname} - 드래그하여 순서 변경`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm break-all pr-2 flex-1 pointer-events-none">
          {member.nickname}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1">
          <GripVertical className="w-4 h-4 text-blue-500 dark:text-blue-400 pointer-events-none" />
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

  // 실시간 세션 관리 (Progressive Loading - 2단계에서 활성화)
  const {
    session: realtimeSession,
    sessionStatus,
    loading: sessionLoading,
    connected: sessionConnected,
    completeSession
  } = useSessionRealtime(sessionId, !isSecondaryLoading)

  // 실시간 매치 결과 관리 (Progressive Loading - 2단계에서 활성화)
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
          
          // 최대 3번까지 재시도 (세션 생성이 완료되지 않았을 가능성)
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
            members: (retrySessionData.team1Members || []).map((member: any) => ({
              ...member,
              memberId: member.id || member.id, // id를 memberId로 매핑
              kills: member.kills ?? 0, // 기본값 0 설정
              deaths: member.deaths ?? 0, // 기본값 0 설정
              assists: member.assists ?? 0, // 기본값 0 설정
            }))
          },
          team2: {
            color: 'red' as const,
            members: (retrySessionData.team2Members || []).map((member: any) => ({
              ...member,
              memberId: member.id || member.id, // id를 memberId로 매핑
              kills: member.kills ?? 0, // 기본값 0 설정
              deaths: member.deaths ?? 0, // 기본값 0 설정
              assists: member.assists ?? 0, // 기본값 0 설정
            }))
          }
            }

            setTeam1Data(gameData.team1.members)
            setTeam2Data(gameData.team2.members)
            setIsLoading(false)
            
            // 실시간 기능은 나중에 활성화
            setTimeout(() => {
              if (isMounted) {
                setIsSecondaryLoading(false)
              }
            }, 500)
            
            console.log('재시도 성공 - 세션 초기화 완료')
            return
          }
          
          // 재시도도 실패한 경우 - 에러 상태 표시 후 대시보드로 이동
          if (isMounted) {
            console.log('세션 데이터를 찾을 수 없어 대시보드로 이동합니다.')
            setSessionNotFound(true)
            setIsLoading(false)
            
            // 3초 후 자동으로 대시보드로 이동
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
        
        // 데이터 변환 최적화 - 필요한 필드만 변환
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
            members: (rawSession.team1Members || []).map((member: any) => ({
              ...member,
              memberId: member.id || member.id, // id를 memberId로 매핑
              kills: member.kills ?? 0, // 기본값 0 설정
              deaths: member.deaths ?? 0, // 기본값 0 설정
              assists: member.assists ?? 0, // 기본값 0 설정
            }))
          },
          team2: {
            color: 'red' as const,
            members: (rawSession.team2Members || []).map((member: any) => ({
              ...member,
              memberId: member.id || member.id, // id를 memberId로 매핑
              kills: member.kills ?? 0, // 기본값 0 설정
              deaths: member.deaths ?? 0, // 기본값 0 설정
              assists: member.assists ?? 0, // 기본값 0 설정
            }))
          }
        }

        // Progressive Loading 1단계: 핵심 데이터 우선 로드
        if (isMounted) {
          setTeam1Data(gameData.team1.members)
          setTeam2Data(gameData.team2.members)
          setIsLoading(false) // 핵심 UI는 이미 렌더링 가능
        }

        // Edit 모드인 경우 기존 경기 결과 데이터 로드
        if (isEditMode && isMounted) {
          try {
            console.log('Edit 모드: 기존 경기 결과 로드 시작')
            const existingMatch = await getMatchBySessionId(sessionId)
            
            if (existingMatch) {
              console.log('기존 경기 결과 로드 완료:', existingMatch)
              
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
              
              console.log('Edit 모드: 기존 데이터 적용 완료')
            } else {
              console.log('Edit 모드: 기존 경기 결과를 찾을 수 없음')
            }
          } catch (error) {
            console.error('Edit 모드: 기존 경기 결과 로드 오류:', error)
          }
        }

        // Progressive Loading 2단계: 실시간 기능 등 부가 기능은 비동기로 로드
        setTimeout(() => {
          if (isMounted) {
            setIsSecondaryLoading(false)
          }
        }, 500) // 0.5초 후 부가 기능 활성화
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
    // memberId가 undefined이거나 빈 문자열인 경우 경고
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

  const handleDragEnd = (event: DragEndEvent, team: 'team1' | 'team2') => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const setTeamData = team === 'team1' ? setTeam1Data : setTeam2Data

    setTeamData((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      const reorderedItems = arrayMove(items, oldIndex, newIndex)
      
      // 포지션도 함께 업데이트
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        position: positionOrder[index]
      }))
      
      
      return updatedItems
    })
  }


  const handleSaveResults = async () => {
    if (!winner) {
      alert('승리 팀을 선택해주세요.')
      return
    }

    // 필수 필드 검증
    const allMembers = [...team1Data, ...team2Data]
    console.log('검증 중인 멤버 데이터:', allMembers.map(member => ({
      nickname: member.nickname,
      champion: (member as any).champion,
      kills: (member as any).kills,
      deaths: (member as any).deaths,
      assists: (member as any).assists
    })))
    
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
    
    try {
      // 1. 세션 상태 업데이트
      const sessionSuccess = await updateSessionResult(sessionId, winner)
      
      if (!sessionSuccess) {
        throw new Error('세션 상태 업데이트에 실패했습니다.')
      }

      // 2. 실제 경기 결과 저장 및 통계 업데이트
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

      if (!matchId) {
        throw new Error('경기 결과 저장에 실패했습니다.')
      }
      
      alert('경기 결과가 저장되었습니다! 멤버 통계가 업데이트되었습니다.')
      router.push(`/team/${realtimeSession?.teamId}`)
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
          <div className="mt-4 text-xs text-gray-500">
            잠시만 기다려주세요...
          </div>
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
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="animate-bounce">●</div>
            <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              지금 대시보드로 이동하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 세션 데이터가 아직 로드되지 않은 경우
  if (!team1Data.length && !team2Data.length && !isLoading && !sessionNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium">세션을 불러오는 중...</div>
          <div className="text-sm text-muted-foreground mt-2">
            잠시만 기다려주세요
          </div>
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
                  {isSecondaryLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? '경기 결과를 수정하고 저장하세요' : '각 플레이어의 챔피언과 KDA를 입력하세요'}
                  {isSecondaryLoading && (
                    <span className="ml-2 text-blue-600">• 실시간 기능 로딩 중...</span>
                  )}
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
{isSaving ? '저장 중...' : (isEditMode ? '수정 저장' : '결과 저장')}
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
                    team="team1"
                    onDragEnd={(event) => handleDragEnd(event, 'team1')}
                    onReorder={(newMembers) => setTeam1Data(newMembers)}
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
                    team="team2"
                    onDragEnd={(event) => handleDragEnd(event, 'team2')}
                    onReorder={(newMembers) => setTeam2Data(newMembers)}
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
{isSaving ? '저장 중...' : (isEditMode ? '경기 결과 수정' : '경기 결과 저장')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}