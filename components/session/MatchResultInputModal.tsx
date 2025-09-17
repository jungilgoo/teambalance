'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MemberSelect } from '@/components/ui/member-select'
import { ChampionSelect } from '@/components/ui/champion-select'
import { NumberWheel } from '@/components/ui/number-wheel'
import { TeamMember } from '@/lib/types'
import { getTeamMembers, saveMatchResult } from '@/lib/supabase-api'
import { useTeamMembersRealtime } from '@/lib/hooks/useTeamMembersRealtime'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { positionNames } from '@/lib/utils'
import { Trophy, Users, Save, RotateCcw, ArrowLeftRight } from 'lucide-react'

interface MatchResultInputModalProps {
  teamId: string
  currentUserId: string
}

type Position = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

interface PositionData {
  memberId: string
  champion: string
  kills: number
  deaths: number
  assists: number
}

interface TeamData {
  top: PositionData
  jungle: PositionData
  mid: PositionData
  adc: PositionData
  support: PositionData
}

const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

const positionIcons = {
  top: '🗡️',
  jungle: '🌳',
  mid: '⭐',
  adc: '🏹',
  support: '🛡️'
}

const emptyPositionData: PositionData = {
  memberId: '',
  champion: '',
  kills: 0,
  deaths: 0,
  assists: 0
}

const emptyTeamData: TeamData = {
  top: { ...emptyPositionData },
  jungle: { ...emptyPositionData },
  mid: { ...emptyPositionData },
  adc: { ...emptyPositionData },
  support: { ...emptyPositionData }
}

export default function MatchResultInputModal({ teamId, currentUserId }: MatchResultInputModalProps) {
  const [open, setOpen] = useState(false)
  const [winner, setWinner] = useState<'team1' | 'team2' | null>(null)
  const [teamData, setTeamData] = useState<{
    team1: TeamData
    team2: TeamData
  }>({
    team1: { ...emptyTeamData },
    team2: { ...emptyTeamData }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState('')
  const isMobile = useIsMobile()

  // 실시간 팀 멤버 관리
  const {
    members: teamMembers,
    loading: membersLoading
  } = useTeamMembersRealtime(teamId)

  // 선택된 멤버 ID들 추출 (중복 방지용)
  const getSelectedMemberIds = (excludeTeam?: 'team1' | 'team2', excludePosition?: Position) => {
    const selectedIds: string[] = []

    Object.entries(teamData).forEach(([team, teamPositions]) => {
      if (excludeTeam && team === excludeTeam) return

      Object.entries(teamPositions).forEach(([position, data]) => {
        if (excludeTeam && excludePosition && team === excludeTeam && position === excludePosition) return
        if (data.memberId) {
          selectedIds.push(data.memberId)
        }
      })
    })

    return selectedIds
  }

  // 특정 포지션에서 선택 가능한 멤버들 반환
  const getAvailableMembers = (team: 'team1' | 'team2', position: Position) => {
    const excludeIds = getSelectedMemberIds(team, position)
    return teamMembers.filter(member => !excludeIds.includes(member.id))
  }

  // 팀 데이터 업데이트
  const updateTeamData = (team: 'team1' | 'team2', position: Position, field: keyof PositionData, value: string | number) => {
    setTeamData(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [position]: {
          ...prev[team][position],
          [field]: value
        }
      }
    }))
  }

  // 팀 스왑 기능
  const handleTeamSwap = () => {
    setTeamData(prev => ({
      team1: prev.team2,
      team2: prev.team1
    }))
    setWinner(null)
  }

  // 데이터 부분 초기화 (멤버는 유지, 챔피언/KDA만 초기화)
  const resetGameData = () => {
    setTeamData(prev => ({
      team1: Object.fromEntries(
        Object.entries(prev.team1).map(([pos, data]) => [
          pos,
          { ...data, champion: '', kills: 0, deaths: 0, assists: 0 }
        ])
      ) as TeamData,
      team2: Object.fromEntries(
        Object.entries(prev.team2).map(([pos, data]) => [
          pos,
          { ...data, champion: '', kills: 0, deaths: 0, assists: 0 }
        ])
      ) as TeamData
    }))
    setWinner(null)
  }

  // 완전 초기화
  const resetAllData = () => {
    setTeamData({
      team1: { ...emptyTeamData },
      team2: { ...emptyTeamData }
    })
    setWinner(null)
  }

  // 입력 완료 확인
  const isInputComplete = () => {
    const allPositions = [...Object.values(teamData.team1), ...Object.values(teamData.team2)]
    return allPositions.every(data =>
      data.memberId &&
      data.champion &&
      data.kills !== null &&
      data.deaths !== null &&
      data.assists !== null
    ) && winner
  }

  // 경기 결과 저장
  const handleSaveResult = async (closeAfterSave: boolean = true) => {
    if (!isInputComplete()) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    setIsSaving(true)
    setSavingProgress('💾 경기 결과 저장 중...')

    try {
      const matchId = await saveMatchResult({
        teamId,
        winningTeam: winner!,
        team1: positions.map(position => ({
          memberId: teamData.team1[position].memberId,
          position,
          champion: teamData.team1[position].champion,
          kills: teamData.team1[position].kills,
          deaths: teamData.team1[position].deaths,
          assists: teamData.team1[position].assists
        })),
        team2: positions.map(position => ({
          memberId: teamData.team2[position].memberId,
          position,
          champion: teamData.team2[position].champion,
          kills: teamData.team2[position].kills,
          deaths: teamData.team2[position].deaths,
          assists: teamData.team2[position].assists
        }))
      })

      if (!matchId) {
        throw new Error('경기 결과 저장에 실패했습니다.')
      }

      setSavingProgress('✅ 저장 완료!')

      await new Promise(resolve => setTimeout(resolve, 1000))

      alert('✅ 경기 결과가 성공적으로 저장되었습니다!\n• 모든 멤버의 통계가 업데이트되었습니다')

      if (closeAfterSave) {
        setOpen(false)
        resetAllData()
      } else {
        // 다음 경기를 위해 챔피언/KDA만 초기화
        resetGameData()
      }
    } catch (error) {
      console.error('경기 결과 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '경기 결과 저장에 실패했습니다.'
      alert(`오류: ${errorMessage}`)
    } finally {
      setIsSaving(false)
      setSavingProgress('')
    }
  }

  // 포지션별 입력 컴포넌트
  const PositionInput = ({ team, position }: { team: 'team1' | 'team2', position: Position }) => {
    const positionData = teamData[team][position]
    const availableMembers = getAvailableMembers(team, position)

    if (isMobile) {
      // 모바일: 세로 레이아웃으로 변경
      return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border space-y-3">
          {/* 포지션 헤더 */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <span className="text-lg">{positionIcons[position]}</span>
            <span className="font-semibold text-base">{positionNames[position]}</span>
          </div>

          {/* 멤버 & 챔피언 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">멤버</label>
              <MemberSelect
                value={positionData.memberId}
                onValueChange={(value) => updateTeamData(team, position, 'memberId', value)}
                placeholder="멤버 선택"
                members={teamMembers}
                excludeMembers={getSelectedMemberIds(team, position)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">챔피언</label>
              <ChampionSelect
                value={positionData.champion}
                onValueChange={(value) => updateTeamData(team, position, 'champion', value)}
                placeholder="챔피언 선택"
                className="h-10"
              />
            </div>
          </div>

          {/* KDA 입력 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">킬</label>
              <NumberWheel
                value={positionData.kills}
                onChange={(value) => updateTeamData(team, position, 'kills', value)}
                placeholder="K"
                min={0}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">데스</label>
              <NumberWheel
                value={positionData.deaths}
                onChange={(value) => updateTeamData(team, position, 'deaths', value)}
                placeholder="D"
                min={0}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">어시</label>
              <NumberWheel
                value={positionData.assists}
                onChange={(value) => updateTeamData(team, position, 'assists', value)}
                placeholder="A"
                min={0}
                max={30}
              />
            </div>
          </div>
        </div>
      )
    }

    // 데스크톱: 기존 그리드 레이아웃 유지
    return (
      <div className="grid grid-cols-6 gap-2 items-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
        <div className="flex items-center gap-1 text-sm font-medium">
          <span>{positionIcons[position]}</span>
          <span>{positionNames[position]}</span>
        </div>

        <MemberSelect
          value={positionData.memberId}
          onValueChange={(value) => updateTeamData(team, position, 'memberId', value)}
          placeholder="멤버"
          members={teamMembers}
          excludeMembers={getSelectedMemberIds(team, position)}
          className="h-10 text-sm"
        />

        <ChampionSelect
          value={positionData.champion}
          onValueChange={(value) => updateTeamData(team, position, 'champion', value)}
          placeholder="챔피언"
          className="h-10 text-sm"
        />

        <NumberWheel
          value={positionData.kills}
          onChange={(value) => updateTeamData(team, position, 'kills', value)}
          placeholder="K"
          min={0}
          max={30}
        />

        <NumberWheel
          value={positionData.deaths}
          onChange={(value) => updateTeamData(team, position, 'deaths', value)}
          placeholder="D"
          min={0}
          max={30}
        />

        <NumberWheel
          value={positionData.assists}
          onChange={(value) => updateTeamData(team, position, 'assists', value)}
          placeholder="A"
          min={0}
          max={30}
        />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 rounded-xl text-base font-semibold" variant="outline">
          경기 결과 입력하기
        </Button>
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'max-w-full mx-2 max-h-[95vh]' : 'max-w-6xl max-h-[90vh]'} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            경기 결과 입력
          </DialogTitle>
          <DialogDescription>
            포지션별로 멤버, 챔피언, KDA를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 승리 팀 선택 */}
          <div className={`flex gap-4 justify-center ${isMobile ? 'flex-col' : ''}`}>
            <Button
              variant={winner === 'team1' ? 'default' : 'outline'}
              onClick={() => setWinner('team1')}
              className={`${isMobile ? 'h-12 text-base' : 'px-8 h-10'}`}
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
              className={`${isMobile ? 'h-12 text-base' : 'px-8 h-10'}`}
              style={{
                backgroundColor: winner === 'team2' ? '#ef4444' : undefined,
                color: winner === 'team2' ? 'white' : undefined
              }}
            >
              레드팀 승리
            </Button>
          </div>

          <Separator />

          {/* 팀별 입력 */}
          <div className="grid grid-cols-1 gap-6">

            {/* 블루팀 */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Users className="w-5 h-5" />
                  블루팀
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'p-3 space-y-4' : 'p-4 space-y-3'}`}>
                {positions.map(position => (
                  <PositionInput key={position} team="team1" position={position} />
                ))}
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
              <CardContent className={`${isMobile ? 'p-3 space-y-4' : 'p-4 space-y-3'}`}>
                {positions.map(position => (
                  <PositionInput key={position} team="team2" position={position} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 버튼들 */}
          <div className={`flex gap-2 justify-center ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
            <Button
              variant="outline"
              onClick={handleTeamSwap}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              팀 교체
            </Button>

            <Button
              variant="outline"
              onClick={resetGameData}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              <RotateCcw className="w-4 h-4" />
              챔피언/KDA 초기화
            </Button>

            <Button
              onClick={() => handleSaveResult(false)}
              disabled={isSaving || !isInputComplete()}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장 후 다음 경기
            </Button>

            <Button
              onClick={() => handleSaveResult(true)}
              disabled={isSaving || !isInputComplete()}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장 후 닫기
            </Button>
          </div>

          {isSaving && (
            <div className="text-center text-sm text-muted-foreground">
              {savingProgress}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}