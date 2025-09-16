'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuthState } from '@/lib/auth'
import { Team, User, TeamMember } from '@/lib/types'
import { getTeamById, getTeamMembers, positionNames } from '@/lib/supabase-api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  User as UserIcon,
  ArrowLeft,
  Crown,
  Target,
  Gamepad2,
  TrendingUp
} from 'lucide-react'
import {
  getUserPersonalStats,
  getUserChampionStats,
  getUserPositionChampionStats,
  PersonalStats,
  ChampionStats,
  PositionChampionStats
} from '@/lib/api/personal-stats'

export default function PersonalStatsPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string

  const [team, setTeam] = useState<Team | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null)
  const [championStats, setChampionStats] = useState<ChampionStats[]>([])
  const [positionChampionStats, setPositionChampionStats] = useState<PositionChampionStats[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedMemberNickname, setSelectedMemberNickname] = useState<string>('')

  // 선택된 멤버의 통계 데이터를 로드하는 함수
  const loadMemberStats = useCallback(async (memberId: string) => {
    try {
      const [personalStatsData, championStatsData, positionStatsData] = await Promise.all([
        getUserPersonalStats(teamId, memberId),
        getUserChampionStats(teamId, memberId),
        getUserPositionChampionStats(teamId, memberId)
      ])

      setPersonalStats(personalStatsData)
      setChampionStats(championStatsData)
      setPositionChampionStats(positionStatsData)
    } catch (error) {
      console.error('멤버 통계 로드 오류:', error)
    }
  }, [teamId])

  // 멤버 변경 핸들러
  const handleMemberChange = async (memberId: string) => {
    setIsLoading(true)

    const selectedMember = teamMembers.find(member => member.userId === memberId)
    if (selectedMember) {
      setSelectedMemberId(memberId)
      setSelectedMemberNickname(selectedMember.nickname)

      await loadMemberStats(memberId)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const authState = await getAuthState()
        if (!authState.isAuthenticated) {
          router.push('/login')
          return
        }

        setCurrentUser(authState.user)

        // 팀 데이터 로드
        const teamData = await getTeamById(teamId)
        if (!teamData) {
          alert('팀을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }

        const teamMembers = await getTeamMembers(teamId)

        // 현재 사용자가 팀의 활성 멤버인지 확인
        const currentMember = teamMembers.find(member =>
          member.userId === authState.user?.id && member.status === 'active'
        )

        if (!currentMember && teamData.leaderId !== authState.user?.id) {
          alert('이 팀에 접근할 수 있는 권한이 없습니다.')
          router.push('/dashboard')
          return
        }

        setTeam(teamData)
        setTeamMembers(teamMembers)

        // 기본 선택된 멤버를 현재 사용자로 설정
        const defaultMemberId = authState.user!.id
        const defaultMemberNickname = currentMember?.nickname || authState.user?.username || authState.user?.name || ''

        setSelectedMemberId(defaultMemberId)
        setSelectedMemberNickname(defaultMemberNickname)

        // 선택된 멤버(현재 사용자)의 개인 통계 데이터 로드
        await loadMemberStats(defaultMemberId)

        setIsLoading(false)
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        router.push('/dashboard')
      }
    }

    loadData()
  }, [teamId, router, loadMemberStats])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  if (!team || !personalStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  // 3경기 이상 플레이한 챔피언만 필터링
  const qualifiedChampions = championStats.filter(champion => champion.gamesPlayed >= 3)

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/team/${teamId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                팀으로 돌아가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-blue-500" />
                  {selectedMemberNickname}님의 개인 통계
                </h1>
                <p className="text-sm text-muted-foreground">
                  {team.name} 팀에서의 개인 성과
                </p>
              </div>
            </div>

            {/* 멤버 선택 드롭다운 */}
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <label className="text-sm text-muted-foreground mb-1">멤버 선택</label>
                <Select value={selectedMemberId} onValueChange={handleMemberChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="멤버를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers
                      .filter(member => member.status === 'active')
                      .map(member => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.nickname} {member.userId === currentUser?.id ? '(나)' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 기본 성과 지표 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                기본 성과 지표
              </CardTitle>
              <CardDescription>
                팀 내 전체 경기 성과
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-accent/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{personalStats.totalGames}</div>
                  <div className="text-sm text-muted-foreground">총 경기</div>
                </div>
                <div className="text-center p-3 bg-accent/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{personalStats.winRate}%</div>
                  <div className="text-sm text-muted-foreground">승률</div>
                </div>
                <div className="text-center p-3 bg-accent/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{personalStats.averageKDA}</div>
                  <div className="text-sm text-muted-foreground">평균 KDA</div>
                </div>
                <div className="text-center p-3 bg-accent/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{personalStats.tierScore}</div>
                  <div className="text-sm text-muted-foreground">티어 점수</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">{personalStats.mvpCount}회</div>
                  <div className="text-sm text-muted-foreground">MVP 획득</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${personalStats.currentStreak > 0 ? 'text-red-600' : personalStats.currentStreak < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                    {personalStats.currentStreak === 0 ? '없음' :
                     personalStats.currentStreak > 0 ? `${personalStats.currentStreak}연승` :
                     `${Math.abs(personalStats.currentStreak)}연패`}
                  </div>
                  <div className="text-sm text-muted-foreground">현재 연속 기록</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 포지션별 성과 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                포지션별 성과
              </CardTitle>
              <CardDescription>
                주 포지션과 부 포지션 성과 분석
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-accent/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">주 포지션</div>
                    <div className="text-sm text-muted-foreground">
                      {personalStats.mainPositionGames > 0 ?
                        `${Math.round((personalStats.mainPositionWins / personalStats.mainPositionGames) * 100)}% 승률` :
                        '경기 없음'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {personalStats.mainPositionWins}승 {personalStats.mainPositionGames - personalStats.mainPositionWins}패
                    ({personalStats.mainPositionGames}경기)
                  </div>
                </div>

                <div className="p-3 bg-accent/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">부 포지션</div>
                    <div className="text-sm text-muted-foreground">
                      {personalStats.subPositionGames > 0 ?
                        `${Math.round((personalStats.subPositionWins / personalStats.subPositionGames) * 100)}% 승률` :
                        '경기 없음'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {personalStats.subPositionWins}승 {personalStats.subPositionGames - personalStats.subPositionWins}패
                    ({personalStats.subPositionGames}경기)
                  </div>
                </div>
              </div>

              {/* 포지션별 주력 챔피언 */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">포지션별 주력 챔피언</h4>
                <div className="space-y-2">
                  {positionChampionStats.map((posStats) => (
                    <div key={posStats.position} className="flex justify-between items-center text-sm">
                      <div className="font-medium">{positionNames[posStats.position]}</div>
                      <div className="text-muted-foreground">
                        {posStats.topChampion ? (
                          `${posStats.topChampion} (${posStats.gamesPlayed}경기, ${posStats.winRate}% 승률)`
                        ) : (
                          '경기 없음'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최다 플레이 챔피언 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                최다 플레이 챔피언 (상위 5개)
              </CardTitle>
              <CardDescription>
                가장 많이 플레이한 챔피언들
              </CardDescription>
            </CardHeader>
            <CardContent>
              {championStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  아직 경기 기록이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {championStats.slice(0, 5).map((champion, index) => (
                    <div key={champion.champion} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{champion.champion}</div>
                          <div className="text-sm text-muted-foreground">
                            {champion.gamesPlayed}경기 • KDA {champion.averageKDA}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${champion.winRate >= 60 ? 'text-green-600' :
                                        champion.winRate >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                          {champion.winRate}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {champion.wins}승 {champion.gamesPlayed - champion.wins}패
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 챔피언별 승률 (3경기 이상) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                챔피언별 승률 (3경기 이상)
              </CardTitle>
              <CardDescription>
                충분한 경기 수를 가진 챔피언들의 성과
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualifiedChampions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  3경기 이상 플레이한 챔피언이 없습니다
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>챔피언</TableHead>
                        <TableHead className="text-right">경기수</TableHead>
                        <TableHead className="text-right">승률</TableHead>
                        <TableHead className="text-right">평균 KDA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualifiedChampions
                        .sort((a, b) => b.winRate - a.winRate)
                        .map((champion) => (
                          <TableRow key={champion.champion}>
                            <TableCell className="font-medium">{champion.champion}</TableCell>
                            <TableCell className="text-right">{champion.gamesPlayed}</TableCell>
                            <TableCell className="text-right">
                              <span className={champion.winRate >= 60 ? 'text-green-600 font-semibold' :
                                              champion.winRate >= 50 ? 'text-blue-600' : 'text-red-600'}>
                                {champion.winRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{champion.averageKDA}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 전체 챔피언 수 표시 */}
        {championStats.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>챔피언 다양성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{championStats.length}</div>
                <div className="text-sm text-muted-foreground">총 플레이한 챔피언 수</div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}