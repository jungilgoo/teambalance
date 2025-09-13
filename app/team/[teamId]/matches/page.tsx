'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuthState } from '@/lib/auth'
import { Match, Team, MatchMember } from '@/lib/types'
import { getTeamById, getMatchesByTeamId, getMemberNickname, positionNames, deleteMatchResult, getTeamMembers } from '@/lib/supabase-api'
import { ArrowLeft, Edit, Trophy, Users, Trash2 } from 'lucide-react'

export default function TeamMatchesPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberNicknames, setMemberNicknames] = useState<Record<string, string>>({})
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const authState = await getAuthState()
        if (!authState.isAuthenticated) {
          router.push('/login')
          return
        }

        // 팀 데이터 로드
        const teamData = await getTeamById(teamId)
        if (!teamData) {
          alert('팀을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }

        // 멤버 권한 확인
        const teamMembers = await getTeamMembers(teamId)
        const currentMember = teamMembers.find(member => 
          member.userId === authState.user?.id && member.status === 'active'
        )
        
        if (!currentMember && teamData.leaderId !== authState.user?.id) {
          alert('이 팀에 접근할 수 있는 권한이 없습니다.')
          router.push('/dashboard')
          return
        }

        // 경기 데이터 로드
        const matchesData = await getMatchesByTeamId(teamId)
        
        // 모든 멤버 ID에 대한 닉네임 수집
        const allMemberIds = new Set<string>()
        matchesData.forEach(match => {
          if (match.team1 && match.team1.members) {
            match.team1.members.forEach(member => allMemberIds.add(member.memberId))
          }
          if (match.team2 && match.team2.members) {
            match.team2.members.forEach(member => allMemberIds.add(member.memberId))
          }
        })
        
        // 닉네임 정보 로드
        const nicknamesMap: Record<string, string> = {}
        await Promise.all(
          Array.from(allMemberIds).map(async (memberId) => {
            const nickname = await getMemberNickname(memberId)
            nicknamesMap[memberId] = nickname
          })
        )
        
        setTeam(teamData)
        setMatches(matchesData)
        setMemberNicknames(nicknamesMap)
        setIsLoading(false)
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        router.push('/dashboard')
      }
    }

    loadData()
  }, [teamId, router])

  const handleEditMatch = (match: Match) => {
    router.push(`/session/${match.sessionId}/match?edit=true`)
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('이 경기 결과를 정말 삭제하시겠습니까?\n삭제된 경기는 복구할 수 없으며, 모든 플레이어의 통계에서 제외됩니다.')) {
      return
    }

    setDeletingMatchId(matchId)
    
    try {
      const success = await deleteMatchResult(matchId)
      
      if (success) {
        // 매치 목록에서 삭제된 매치 제거
        setMatches(prevMatches => prevMatches.filter(match => match.id !== matchId))
        alert('경기 결과가 성공적으로 삭제되었습니다.')
      } else {
        alert('경기 결과 삭제에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('경기 삭제 중 오류:', error)
      alert('경기 결과 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingMatchId(null)
    }
  }

  // Sample data creation function removed - createSampleMatchData no longer exists

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTeamScore = (team: any) => {
    return team.members ? team.members.reduce((total: number, member: any) => total + member.kills, 0) : 0
  }

  const TeamPlayerTable = ({ team, isWinner, mvpMemberId }: { 
    team: any, 
    isWinner: boolean, 
    mvpMemberId?: string 
  }) => (
    <div className={`p-3 rounded-lg ${isWinner ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
      <div className="space-y-2">
        {team.members.map((member: any, index: number) => {
          const isMVP = mvpMemberId === member.memberId
          return (
            <div key={index} className={`grid grid-cols-4 gap-3 text-sm py-1 ${isMVP ? 'bg-yellow-50 border border-yellow-200 rounded px-2' : ''}`}>
              <div className="font-medium text-muted-foreground">
                {positionNames[member.position as keyof typeof positionNames]}
              </div>
              <div className="font-medium flex items-center gap-1">
                {memberNicknames[member.memberId] || `Player ${member.memberId}`}
                {isMVP && <Trophy className="w-3 h-3 text-yellow-600" />}
              </div>
              <div className="text-blue-600 font-medium">
                {member.champion}
              </div>
              <div className="font-mono">
                {member.kills}/{member.deaths}/{member.assists}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

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
              <Button variant="ghost" onClick={() => router.push(`/team/${teamId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                팀 대시보드
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  경기 결과 조회
                </h1>
                <p className="text-sm text-muted-foreground">
                  {team.name}의 경기 히스토리
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {matches.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">아직 경기 기록이 없습니다</p>
                  <p className="text-sm">첫 번째 내전을 시작해보세요!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            matches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{formatDate(match.createdAt)}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>{match.winner === 'team1' ? '블루팀 승리' : '레드팀 승리'}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMatch(match)}
                        className="shrink-0"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={deletingMatchId === match.id}
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingMatchId === match.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        {deletingMatchId === match.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 헤더 라벨 */}
                  <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-muted-foreground px-3 py-1 bg-gray-100 rounded">
                    <div>포지션</div>
                    <div>선수이름</div>
                    <div>챔피언</div>
                    <div>K/D/A</div>
                  </div>

                  {/* 블루팀 */}
                  <div>
                    <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      블루팀 {match.winner === 'team1' && <span className="text-green-600 font-bold">(승리)</span>}
                    </div>
                    <TeamPlayerTable 
                      team={match.team1} 
                      isWinner={match.winner === 'team1'} 
                      mvpMemberId={match.winner === 'team1' ? (match as any).mvpMemberId : undefined} 
                    />
                  </div>

                  {/* 레드팀 */}
                  <div>
                    <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      레드팀 {match.winner === 'team2' && <span className="text-green-600 font-bold">(승리)</span>}
                    </div>
                    <TeamPlayerTable 
                      team={match.team2} 
                      isWinner={match.winner === 'team2'} 
                      mvpMemberId={match.winner === 'team2' ? (match as any).mvpMemberId : undefined} 
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}