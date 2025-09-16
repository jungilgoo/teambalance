'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MemberSelect } from '@/components/ui/member-select'
import { ChampionSelect } from '@/components/ui/champion-select'
import { NumberWheel } from '@/components/ui/number-wheel'
import { TeamMember, Match } from '@/lib/types'
import { getTeamMembers, updateMatchByMatchId } from '@/lib/supabase-api'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { positionNames } from '@/lib/utils'
import { Trophy, Users, Save, X } from 'lucide-react'

interface EditMatchModalProps {
  match: Match
  teamId: string
  currentUserId: string
  onClose: () => void
  onSuccess: () => void
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

export default function EditMatchModal({ 
  match, 
  teamId, 
  currentUserId, 
  onClose, 
  onSuccess 
}: EditMatchModalProps) {
  const [winner, setWinner] = useState<'team1' | 'team2'>(match.winner)
  const [teamData, setTeamData] = useState<{
    team1: TeamData
    team2: TeamData
  }>({
    team1: {
      top: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      jungle: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      mid: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      adc: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      support: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 }
    },
    team2: {
      top: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      jungle: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      mid: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      adc: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
      support: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 }
    }
  })
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState('')
  const isMobile = useIsMobile()

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 팀 멤버 정보 로드
        const members = await getTeamMembers(teamId)
        setTeamMembers(members.filter(m => m.status === 'active'))

        // 기존 매치 데이터로 폼 초기화
        const newTeamData = {
          team1: {
            top: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            jungle: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            mid: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            adc: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            support: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 }
          },
          team2: {
            top: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            jungle: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            mid: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            adc: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 },
            support: { memberId: '', champion: '', kills: 0, deaths: 0, assists: 0 }
          }
        }

        // team1 데이터 복원
        match.team1.members.forEach(member => {
          const position = member.position as Position
          newTeamData.team1[position] = {
            memberId: member.memberId,
            champion: member.champion,
            kills: member.kills,
            deaths: member.deaths,
            assists: member.assists
          }
        })

        // team2 데이터 복원
        match.team2.members.forEach(member => {
          const position = member.position as Position
          newTeamData.team2[position] = {
            memberId: member.memberId,
            champion: member.champion,
            kills: member.kills,
            deaths: member.deaths,
            assists: member.assists
          }
        })

        setTeamData(newTeamData)
      } catch (error) {
        console.error('초기 데이터 로드 오류:', error)
        alert('데이터를 불러오는 중 오류가 발생했습니다.')
      }
    }

    loadInitialData()
  }, [match, teamId])

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

  // 필드 업데이트 함수
  const updateTeamData = (
    team: 'team1' | 'team2',
    position: Position,
    field: keyof PositionData,
    value: string | number
  ) => {
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

  // 입력 완료 검증
  const isInputComplete = () => {
    if (!winner) return false

    const allPositions = positions
    
    for (const team of ['team1', 'team2'] as const) {
      for (const position of allPositions) {
        const data = teamData[team][position]
        if (!data.memberId || !data.champion) {
          return false
        }
      }
    }

    return true
  }

  // 저장 처리
  const handleSaveResults = async () => {
    if (!isInputComplete()) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    setIsSaving(true)
    setSavingProgress('경기 결과 업데이트 중...')

    try {
      // 데이터 변환
      const matchUpdateData = {
        winningTeam: winner!,
        team1: positions.map(position => ({
          memberId: teamData.team1[position].memberId,
          champion: teamData.team1[position].champion,
          position: position as Position,
          kills: teamData.team1[position].kills,
          deaths: teamData.team1[position].deaths,
          assists: teamData.team1[position].assists
        })),
        team2: positions.map(position => ({
          memberId: teamData.team2[position].memberId,
          champion: teamData.team2[position].champion,
          position: position as Position,
          kills: teamData.team2[position].kills,
          deaths: teamData.team2[position].deaths,
          assists: teamData.team2[position].assists
        }))
      }

      setSavingProgress('통계 업데이트 중...')
      const success = await updateMatchByMatchId(match.id, matchUpdateData)

      if (success) {
        alert('✅ 경기 결과가 성공적으로 수정되었습니다!')
        onSuccess()
        onClose()
      } else {
        alert('❌ 경기 결과 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('경기 결과 저장 오류:', error)
      alert('❌ 경기 결과 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
      setSavingProgress('')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            경기 결과 수정
          </DialogTitle>
          <DialogDescription>
            경기 결과를 수정하고 저장하세요. 통계도 자동으로 업데이트됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 승리팀 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">승리팀 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 justify-center">
                <Button
                  variant={winner === 'team1' ? 'default' : 'outline'}
                  onClick={() => setWinner('team1')}
                  className="flex-1 max-w-[200px] h-12"
                >
                  <Users className="w-4 h-4 mr-2" />
                  블루팀 승리
                </Button>
                <Button
                  variant={winner === 'team2' ? 'default' : 'outline'}
                  onClick={() => setWinner('team2')}
                  className="flex-1 max-w-[200px] h-12"
                >
                  <Users className="w-4 h-4 mr-2" />
                  레드팀 승리
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 팀별 데이터 입력 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(['team1', 'team2'] as const).map((team) => (
              <Card key={team} className={winner === team ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {team === 'team1' ? '블루팀' : '레드팀'}
                    </span>
                    {winner === team && <span className="text-sm text-primary">승리팀</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {positions.map((position) => (
                    <div key={position} className="space-y-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <span>{positionIcons[position]}</span>
                        <span>{positionNames[position]}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 멤버 & 챔피언 선택 */}
                        <div className="space-y-2">
                          <MemberSelect
                            members={teamMembers}
                            value={teamData[team][position].memberId}
                            onValueChange={(memberId) => 
                              updateTeamData(team, position, 'memberId', memberId)
                            }
                            excludeMembers={getSelectedMemberIds(team, position)}
                            placeholder="멤버 선택"
                          />
                          
                          <ChampionSelect
                            value={teamData[team][position].champion}
                            onValueChange={(champion) => 
                              updateTeamData(team, position, 'champion', champion)
                            }
                            placeholder="챔피언 선택"
                          />
                        </div>

                        {/* KDA 입력 */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">킬</label>
                              <NumberWheel
                                value={teamData[team][position].kills}
                                onChange={(value) => updateTeamData(team, position, 'kills', value)}
                                min={0}
                                max={30}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">데스</label>
                              <NumberWheel
                                value={teamData[team][position].deaths}
                                onChange={(value) => updateTeamData(team, position, 'deaths', value)}
                                min={0}
                                max={30}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">어시</label>
                              <NumberWheel
                                value={teamData[team][position].assists}
                                onChange={(value) => updateTeamData(team, position, 'assists', value)}
                                min={0}
                                max={30}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 버튼들 */}
          <div className={`flex gap-2 justify-center ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              <X className="w-4 h-4" />
              취소
            </Button>

            <Button
              onClick={handleSaveResults}
              disabled={isSaving || !isInputComplete()}
              className={`flex items-center gap-2 ${isMobile ? 'h-12 text-base justify-center' : ''}`}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? '저장 중...' : '수정 저장'}
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
