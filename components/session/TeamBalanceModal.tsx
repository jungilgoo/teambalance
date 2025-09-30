'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TeamMember } from '@/lib/types'
import { getUserById } from '@/lib/supabase-api'
import { useTeamMembersRealtime } from '@/lib/hooks/useTeamMembersRealtime'
import { calculateMemberTierScore } from '@/lib/stats'
import { tierNames, positionNames } from '@/lib/utils'
import { analyzeTeamFormation, recommendOptimalPositions, optimizedTeamBalancing, convertToLegacyFormat, selectBalancingMethod, type BalancingMethod as BalancingMethodType } from '@/lib/position-analysis'
import { Users, Crown, RefreshCw, AlertTriangle, CheckCircle, Eye, Copy, Check, Camera } from 'lucide-react'
import PositionCoverageDisplay from '@/components/ui/position-coverage-display'

interface TeamBalanceModalProps {
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
    provider: 'email'
    createdAt: Date
  }
  calculatedTierScore?: number
}

type BalancingMethod = 'smart' | 'draft' | 'random'

export default function TeamBalanceModal({ teamId, currentUserId }: TeamBalanceModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isBalancing, setIsBalancing] = useState(false)
  const [balancingMethod, setBalancingMethod] = useState<BalancingMethod>('smart')
  const [captain1, setCaptain1] = useState<string | null>(null)
  const [captain2, setCaptain2] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
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
        console.error('팀 밸런싱 모달: 사용자 정보 로드 오류:', error)
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
    // 주장 선택도 초기화
    setCaptain1(null)
    setCaptain2(null)
  }

  const handleCaptainChange = (captainType: 'captain1' | 'captain2', memberId: string) => {
    if (captainType === 'captain1') {
      setCaptain1(memberId)
    } else {
      setCaptain2(memberId)
    }
    // 주장이 바뀌면 결과 초기화
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
      // 선택된 밸런싱 방식에 따라 다른 알고리즘 사용
      console.log(`🎯 ${balancingMethod} 밸런싱 시도:`, players.length, '명')
      
      if (balancingMethod === 'draft') {
        // 선택된 주장들을 찾기
        const selectedCaptain1Member = captain1 ? players.find(p => p.id === captain1) : undefined
        const selectedCaptain2Member = captain2 ? players.find(p => p.id === captain2) : undefined
        
        const result = selectBalancingMethod(players, 'draft' as BalancingMethodType, selectedCaptain1Member, selectedCaptain2Member)
        console.log(`🎯 드래프트 결과:`, result.success, result.message)

        if (result.success && result.bestCombination) {
          console.log('✅ 드래프트 알고리즘 성공!')
          const legacyFormat = convertToLegacyFormat(result.bestCombination)

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
        } else {
          console.log('❌ 드래프트 알고리즘 실패:', result.message)
        }
      } else {
        // 기존 최적화된 팀 밸런싱 알고리즘 사용
        const optimizedResult = optimizedTeamBalancing(players)
        console.log('🎯 최적화 결과:', optimizedResult.success, optimizedResult.message)

        if (optimizedResult.success && optimizedResult.bestCombination) {
          console.log('✅ 최적화된 알고리즘 성공!')
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
        } else {
          console.log('❌ 최적화된 알고리즘 실패:', optimizedResult.message)
        }
      }
    } catch (error) {
      // 선택된 밸런싱 실패 시 백업 방식 사용
      console.error(`❌ ${balancingMethod} 밸런싱 예외:`, error)
    }

    // 백업: 균형잡힌 스네이크 드래프트
    console.log('🔄 백업 방식 사용: 스네이크 드래프트')
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
      let finalResult: {
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
      }

      if (balancingMethod === 'random') {
        const randomResult = balanceTeamsRandom(playersToUse)
        const team1TierScore = Math.round(randomResult.team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / randomResult.team1.length)
        const team2TierScore = Math.round(randomResult.team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / randomResult.team2.length)

        finalResult = {
          team1: randomResult.team1,
          team2: randomResult.team2,
          team1MMR: team1TierScore,
          team2MMR: team2TierScore,
          positionFeasible: analyzeTeamFormation(randomResult.team1).canFormCompleteTeam && analyzeTeamFormation(randomResult.team2).canFormCompleteTeam,
          positionAnalysis: {
            team1Assignments: recommendOptimalPositions(randomResult.team1),
            team2Assignments: recommendOptimalPositions(randomResult.team2),
            team1Score: randomResult.team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0),
            team2Score: randomResult.team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
          }
        }
      } else {
        // smart 또는 draft 방식
        const smartResult = balanceTeamsSmart(playersToUse)
        const team1TierScore = Math.round(smartResult.team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / smartResult.team1.length)
        const team2TierScore = Math.round(smartResult.team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0) / smartResult.team2.length)

        finalResult = {
          team1: smartResult.team1,
          team2: smartResult.team2,
          team1MMR: team1TierScore,
          team2MMR: team2TierScore,
          positionFeasible: smartResult.positionAnalysis.feasible,
          positionAnalysis: smartResult.positionAnalysis
        }
      }

      // 평균 티어 점수가 낮은 팀을 블루팀(team1)으로 설정
      if (finalResult.team1MMR > finalResult.team2MMR) {
        // 팀 순서 바꾸기
        const swappedResult = {
          team1: finalResult.team2,
          team2: finalResult.team1,
          team1MMR: finalResult.team2MMR,
          team2MMR: finalResult.team1MMR,
          positionFeasible: finalResult.positionFeasible,
          positionAnalysis: {
            team1Assignments: finalResult.positionAnalysis.team2Assignments,
            team2Assignments: finalResult.positionAnalysis.team1Assignments,
            team1Score: finalResult.positionAnalysis.team2Score,
            team2Score: finalResult.positionAnalysis.team1Score
          }
        }
        setBalancedTeams(swappedResult)
      } else {
        setBalancedTeams(finalResult)
      }

      setIsBalancing(false)
    }, 1500) // 1.5초 로딩으로 진짜처럼 보이게
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedMembers([])
    setBalancedTeams(null)
    setIsCopied(false)
    setIsCapturing(false)
  }

  // 팀 밸런싱 결과를 텍스트로 포맷팅
  const formatTeamBalanceResult = () => {
    if (!balancedTeams) return ''

    const formatTeam = (team: SelectedMember[], teamName: string, teamMmr: number, teamKey: 'team1' | 'team2') => {
      const teamEmoji = teamKey === 'team1' ? '🔵' : '🔴'
      let result = `${teamEmoji} ${teamName} (평균 티어: ${teamMmr}점)\n`
      
      // 멤버 이름만 나열
      const memberNames = team.map(member => member.nickname).join(', ')
      result += `- ${memberNames}\n`
      
      return result
    }

    let result = '🏆 TeamBalance 팀 밸런싱 결과\n\n'
    result += formatTeam(balancedTeams.team1, '블루팀', balancedTeams.team1MMR, 'team1')
    result += '\n'
    result += formatTeam(balancedTeams.team2, '레드팀', balancedTeams.team2MMR, 'team2')
    result += '\n'
    
    const tierDiff = Math.abs(balancedTeams.team1MMR - balancedTeams.team2MMR)
    const methodText = balancingMethod === 'smart' ? '스마트 최적화' : '랜덤 배정'
    result += `💡 티어 점수 차이: ${tierDiff}점 (${methodText})\n`
    
    if (balancedTeams.positionFeasible) {
      result += '✅ 포지션 구성 완료'
    } else {
      result += '⚠️ 포지션 부족 (유연한 운용 필요)'
    }

    return result
  }

  // 클립보드에 복사하기
  const handleCopyToClipboard = async () => {
    if (!balancedTeams) return
    
    try {
      const formattedText = formatTeamBalanceResult()
      await navigator.clipboard.writeText(formattedText)
      setIsCopied(true)
      
      // 3초 후 복사 상태 초기화
      setTimeout(() => {
        setIsCopied(false)
      }, 3000)
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
      // 폴백: 텍스트 선택 방식
      const textArea = document.createElement('textarea')
      textArea.value = formatTeamBalanceResult()
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 3000)
    }
  }

  // 결과 영역 스크린샷 - 클립보드 복사 + 파일 저장
  const handleCaptureScreenshot = async () => {
    if (!balancedTeams || !resultRef.current) return
    
    setIsCapturing(true)
    
    try {
      // 동적으로 html2canvas를 import (번들 크기 최적화)
      const html2canvas = (await import('html2canvas')).default
      
      // 결과 영역만 캡처
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: resultRef.current.offsetWidth,
        height: resultRef.current.offsetHeight,
      })
      
      // 1. 클립보드에 이미지 복사 (바로 붙여넣기용)
      try {
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!)
          }, 'image/png')
        })
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
        
        // 클립보드 복사 성공 알림
        alert('✅ 클립보드에 복사되었습니다!\n\n디스코드, 카카오톡 등에 Ctrl+V로 바로 붙여넣기 하세요.')
        
      } catch (clipboardError) {
        console.warn('클립보드 복사 실패, 파일 다운로드로 대체:', clipboardError)
        
        // 클립보드 복사 실패 시 파일 다운로드로 대체
        const link = document.createElement('a')
        link.download = `팀밸런싱_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '_')}.png`
        link.href = canvas.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        alert('📁 파일로 다운로드되었습니다!\n\n(클립보드 복사가 지원되지 않는 환경)')
      }
      
    } catch (error) {
      console.error('스크린샷 생성 실패:', error)
      alert('❌ 스크린샷 생성에 실패했습니다.\n다시 시도해주세요.')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 rounded-xl text-base font-semibold">
          팀 밸런싱하기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600" />
            팀 밸런싱 확인
          </DialogTitle>
          <DialogDescription>
            참가할 멤버를 선택하고 팀 밸런싱 결과를 확인하세요 (정확히 10명)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 멤버 선택 섹션 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              참가 멤버 선택 ({selectedMembers.length}명)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
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
                    <SelectItem value="draft">드래프트 밸런싱 (주장 선정 + 스네이크 드래프트)</SelectItem>
                    <SelectItem value="random">랜덤 밸런싱</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {balancingMethod === 'smart' ? (
                  <div>
                    <strong>스마트 밸런싱:</strong> 각 플레이어의 티어와 승률을 고려하여 양 팀의 실력이 균등하게 배치됩니다.
                  </div>
                ) : balancingMethod === 'draft' ? (
                  <div>
                    <strong>드래프트 밸런싱:</strong> 티어 점수 상위 2명을 주장으로 선정하고, 포지션 부족도와 티어를 고려하여 스네이크 드래프트로 팀을 구성합니다.
                  </div>
                ) : (
                  <div>
                    <strong>랜덤 밸런싱:</strong> 완전히 무작위로 팀을 구성합니다. 실력 차이는 고려하지 않습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 주장 선택 (드래프트 방식일 때만 표시) */}
          {balancingMethod === 'draft' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">주장 선택</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">1팀 주장</label>
                  <Select value={captain1 || ''} onValueChange={(value) => handleCaptainChange('captain1', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="1팀 주장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersWithUser
                        .filter(member => selectedMembers.includes(member.id))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.nickname} ({member.mainPosition}, {calculateMemberTierScore(member)}점)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">2팀 주장</label>
                  <Select value={captain2 || ''} onValueChange={(value) => handleCaptainChange('captain2', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="2팀 주장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersWithUser
                        .filter(member => selectedMembers.includes(member.id))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.nickname} ({member.mainPosition}, {calculateMemberTierScore(member)}점)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <strong>주장 선택 안내:</strong> 각 팀의 주장을 선택하면 해당 주장들이 스네이크 드래프트로 나머지 멤버들을 선택합니다. 주장을 선택하지 않으면 자동으로 티어 점수 상위 2명이 주장이 됩니다.
                </div>
              </div>
            </div>
          )}

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
            <div ref={resultRef} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg border">
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
                  <div className="space-y-3">
                    {balancedTeams.team1.map((member) => {
                      return (
                        <div key={member.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-base">{member.nickname}</span>
                            <div className="text-sm text-muted-foreground text-right">
                              <div className="font-mono">{calculateMemberTierScore(member)}</div>
                            </div>
                          </div>
                          <PositionCoverageDisplay 
                            member={member}
                          />
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
                  <div className="space-y-3">
                    {balancedTeams.team2.map((member) => {
                      return (
                        <div key={member.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-base">{member.nickname}</span>
                            <div className="text-sm text-muted-foreground text-right">
                              <div className="font-mono">{calculateMemberTierScore(member)}</div>
                            </div>
                          </div>
                          <PositionCoverageDisplay 
                            member={member}
                          />
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
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCaptureScreenshot}
                    disabled={isCapturing}
                    className="min-w-[120px]"
                  >
                    {isCapturing ? (
                      <div className="flex items-center space-x-1">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>저장 중...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Camera className="w-4 h-4" />
                        <span>스크린샷</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyToClipboard}
                    className={`min-w-[120px] ${isCopied ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : ''}`}
                  >
                    {isCopied ? (
                      <div className="flex items-center space-x-1">
                        <Check className="w-4 h-4" />
                        <span>복사됨!</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Copy className="w-4 h-4" />
                        <span>복사하기</span>
                      </div>
                    )}
                  </Button>
                  <Button onClick={handleClose}>
                    확인 완료
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