'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TierBadge } from '@/components/ui/tier-badge'
import { TierSelect } from '@/components/ui/tier-select'
import { TierType } from '@/lib/types'

export default function TierTestPage() {
  const [selectedTier, setSelectedTier] = useState<TierType>()

  // 모든 티어 샘플
  const sampleTiers: TierType[] = [
    'iron_iv', 'bronze_ii', 'silver_i', 'gold_iii', 
    'platinum_i', 'emerald_ii', 'diamond_i', 
    'master', 'grandmaster', 'challenger'
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">티어 컴포넌트 테스트</h1>
          <p className="text-muted-foreground">TierBadge와 TierSelect 컴포넌트를 테스트해보세요.</p>
        </div>

        <div className="grid gap-8">
          {/* TierBadge 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle>TierBadge 컴포넌트</CardTitle>
              <CardDescription>
                다양한 크기와 모든 티어의 배지를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Small 크기 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Small 크기</h3>
                <div className="flex flex-wrap gap-2">
                  {sampleTiers.map(tier => (
                    <TierBadge key={tier} tier={tier} size="sm" />
                  ))}
                </div>
              </div>

              {/* Medium 크기 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Medium 크기 (기본)</h3>
                <div className="flex flex-wrap gap-2">
                  {sampleTiers.map(tier => (
                    <TierBadge key={tier} tier={tier} size="md" />
                  ))}
                </div>
              </div>

              {/* Large 크기 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Large 크기</h3>
                <div className="flex flex-wrap gap-2">
                  {sampleTiers.map(tier => (
                    <TierBadge key={tier} tier={tier} size="lg" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TierSelect 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle>TierSelect 컴포넌트</CardTitle>
              <CardDescription>
                드롭다운에서 티어를 선택해보세요. 선택된 티어가 아래에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <TierSelect
                  value={selectedTier}
                  onValueChange={setSelectedTier}
                  placeholder="티어를 선택하세요"
                />
              </div>
              
              {selectedTier && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">선택된 티어:</p>
                  <TierBadge tier={selectedTier} size="lg" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 실제 사용 예시 */}
          <Card>
            <CardHeader>
              <CardTitle>실제 사용 예시</CardTitle>
              <CardDescription>
                플레이어 카드에서 티어가 어떻게 표시되는지 확인해보세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">탑갓홍길동</h3>
                    <TierBadge tier="diamond_ii" size="sm" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    주 포지션: 탑 • 승률: 65%
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">마스터탑</h3>
                    <TierBadge tier="master" size="sm" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    주 포지션: 탑 • 승률: 70%
                  </div>
                </div>

                <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">챌린저원딜</h3>
                    <TierBadge tier="challenger" size="sm" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    주 포지션: 원딜 • 승률: 85%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button onClick={() => window.history.back()}>
            ← 뒤로 가기
          </Button>
        </div>
      </div>
    </div>
  )
}