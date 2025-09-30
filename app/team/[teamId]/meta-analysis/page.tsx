'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, TrendingUp, Users, ArrowLeft, RefreshCw } from 'lucide-react'
import { getTeamMetaAnalysis, type TeamMetaAnalysis } from '@/lib/api/meta-analysis'
import { useAuth } from '@/components/providers/AuthProvider'

export default function MetaAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { authState } = useAuth()
  const teamId = params.teamId as string

  const [metaData, setMetaData] = useState<TeamMetaAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (teamId) {
      loadMetaAnalysis()
    }
  }, [teamId])

  const loadMetaAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTeamMetaAnalysis(teamId)
      setMetaData(data)
    } catch (err) {
      console.error('메타 분석 로드 실패:', err)
      setError('메타 분석을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <div className="text-muted-foreground">메타 분석을 불러오는 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleGoBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <h1 className="text-2xl font-bold">메타 분석</h1>
          </div>
          
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="text-red-500 mb-4">{error}</div>
                <Button onClick={loadMetaAnalysis} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!metaData || metaData.totalMatches === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleGoBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <h1 className="text-2xl font-bold">메타 분석</h1>
          </div>
          
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="text-muted-foreground mb-4">아직 경기 데이터가 없습니다</div>
                <div className="text-sm text-muted-foreground mb-6">
                  경기를 진행하면 메타 분석을 확인할 수 있습니다
                </div>
                <Button onClick={handleGoBack} variant="outline">
                  팀 페이지로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { sideWinRate, topChampions } = metaData

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={handleGoBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUp className="h-8 w-8" />
                메타 분석
              </h1>
              <p className="text-muted-foreground mt-1">
                총 {metaData.totalMatches}경기 분석 결과
              </p>
            </div>
          </div>
          <Button onClick={loadMetaAnalysis} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 블루팀 vs 레드팀 승률 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                팀 승률 분석
              </CardTitle>
              <CardDescription>
                블루팀과 레드팀의 승률을 비교합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {sideWinRate.blueTeamWinRate}%
                  </div>
                  <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    블루팀 승률
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sideWinRate.blueTeamWins}승 / {sideWinRate.totalGames}경기
                  </div>
                </div>
                <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                    {sideWinRate.redTeamWinRate}%
                  </div>
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300 mb-1">
                    레드팀 승률
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sideWinRate.redTeamWins}승 / {sideWinRate.totalGames}경기
                  </div>
                </div>
              </div>
              
              {/* 승률 차이 분석 */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium mb-2">승률 차이 분석</div>
                <div className="text-xs text-muted-foreground">
                  {sideWinRate.blueTeamWinRate > sideWinRate.redTeamWinRate ? (
                    <>블루팀이 레드팀보다 <span className="font-semibold text-blue-600">{sideWinRate.blueTeamWinRate - sideWinRate.redTeamWinRate}%</span> 높은 승률을 보입니다.</>
                  ) : sideWinRate.redTeamWinRate > sideWinRate.blueTeamWinRate ? (
                    <>레드팀이 블루팀보다 <span className="font-semibold text-red-600">{sideWinRate.redTeamWinRate - sideWinRate.blueTeamWinRate}%</span> 높은 승률을 보입니다.</>
                  ) : (
                    <>블루팀과 레드팀의 승률이 동일합니다.</>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 인기 챔피언 순위 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                인기 챔피언 TOP 10
              </CardTitle>
              <CardDescription>
                픽 횟수 기준으로 가장 많이 선택된 챔피언들입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topChampions.map((champion, index) => (
                  <div key={champion.championId} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                      <span className="text-sm font-bold text-primary">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{champion.championName}</div>
                      <div className="text-sm text-muted-foreground">
                        {champion.totalPicks}픽 • 승률 {champion.winRate}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{champion.winRate}%</div>
                      <div className="text-xs text-muted-foreground">
                        {champion.totalWins}승 {champion.totalPicks - champion.totalWins}패
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
