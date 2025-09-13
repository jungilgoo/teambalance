'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuthState } from '@/lib/auth'
import { Team, TeamMember, User } from '@/lib/types'
import { getTeamById, getTeamMembers, getUserById, positionNames } from '@/lib/supabase-api'
import { getMemberMVPCount } from '@/lib/api/sessions'
import { calculateMemberRankings, MemberRanking } from '@/lib/stats'
import { TierBadge } from '@/components/ui/tier-badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  BarChart3, 
  ArrowLeft,
  Crown,
  Medal
} from 'lucide-react'

export default function TeamStatsPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [memberRankings, setMemberRankings] = useState<MemberRanking[]>([])
  const [membersWithUsers, setMembersWithUsers] = useState<Array<MemberRanking & { user: User | null, mvpCount: number }>>([])

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
        setMembers(teamMembers)
        
        // 멤버 랭킹 계산
        const rankings = calculateMemberRankings(teamMembers)
        setMemberRankings(rankings)
        
        // 사용자 정보와 MVP 횟수를 함께 멤버 데이터 구성
        const rankingsWithUsers = await Promise.all(
          rankings.map(async (member) => {
            const user = await getUserById(member.userId)
            const mvpCount = await getMemberMVPCount(member.id)
            return { ...member, user, mvpCount }
          })
        )
        setMembersWithUsers(rankingsWithUsers)
        
        setIsLoading(false)
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        router.push('/dashboard')
      }
    }

    loadData()
  }, [teamId, router])

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
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                  {team.name} 멤버 랭킹
                </h1>
                <p className="text-sm text-muted-foreground">
                  승률 기준 멤버 순위
                </p>
              </div>
            </div>
            
            <div className="text-right text-sm text-muted-foreground">
              <div>총 {members.length}명의 멤버</div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        {/* 멤버 랭킹 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="w-5 h-5" />
              멤버 랭킹 (승률순)
            </CardTitle>
            <CardDescription>
              승률 기준으로 정렬된 멤버 순위
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>멤버</TableHead>
                    <TableHead>티어</TableHead>
                    <TableHead>포지션</TableHead>
                    <TableHead className="text-right">티어 점수</TableHead>
                    <TableHead className="text-right">승률</TableHead>
                    <TableHead className="text-right">경기수</TableHead>
                    <TableHead className="text-right">MVP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersWithUsers
                    .sort((a, b) => b.winRate - a.winRate)
                    .map((member, index) => {
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                              {index === 1 && <Medal className="w-4 h-4 text-gray-400" />}
                              {index === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                              #{index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.nickname}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.user?.username || member.user?.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={member.tier} size="sm" />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{positionNames[member.mainPosition]}</div>
                              <div className="text-muted-foreground">
                                {member.subPositions && member.subPositions.length > 0 
                                  ? member.subPositions.map(pos => positionNames[pos]).join(', ')
                                  : '없음'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {member.stats.tierScore}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={member.winRate >= 60 ? 'text-green-600 font-semibold' : 
                                            member.winRate >= 50 ? 'text-blue-600' : 'text-red-600'}>
                              {member.winRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {member.totalGames}경기
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={member.mvpCount > 0 ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                              {member.mvpCount}회
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}