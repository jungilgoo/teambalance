'use client'

import { TeamMember, Position } from '@/lib/types'
import { TierBadge } from '@/components/ui/tier-badge'
import { positionNames, getTierColor, cn } from '@/lib/utils'
import { getChampionSplashArt, getChampionFallbackGradient } from '@/lib/champion-images'
import { RecentMatch } from '@/lib/api/personal-stats'
import {
  Crown,
  Trophy,
  TrendingUp,
  Target,
  Swords,
  Shield,
  Zap,
  Heart,
  Users,
  Crosshair,
  Search,
  Flame,
  Trees
} from 'lucide-react'
import { useState } from 'react'

interface MemberCardProps {
  member: TeamMember
  currentUserId?: string
  isLeader?: boolean
  onClick?: () => void
  className?: string
  showActions?: boolean
  children?: React.ReactNode
  topChampion?: string | null
  actualKDA?: number
  actualMvpCount?: number
  actualCurrentStreak?: number
  recentMatches?: RecentMatch[]
}

// 포지션별 아이콘 매핑
const positionIcons = {
  top: Swords,
  jungle: Trees,
  mid: Zap,
  adc: Flame,
  support: Heart
}

// 포지션별 색상 매핑
const positionColors = {
  top: 'text-red-500',
  jungle: 'text-green-500',
  mid: 'text-blue-500',
  adc: 'text-yellow-500',
  support: 'text-pink-500'
}

export function MemberCard({
  member,
  currentUserId,
  isLeader,
  onClick,
  className,
  showActions = false,
  children,
  topChampion,
  actualKDA,
  actualMvpCount,
  actualCurrentStreak,
  recentMatches = []
}: MemberCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const MainPositionIcon = positionIcons[member.mainPosition]
  const totalWins = member.stats?.totalWins ?? 0
  const totalLosses = member.stats?.totalLosses ?? 0
  const winRate = totalWins + totalLosses > 0
    ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
    : 0

  // 실제 KDA 데이터가 있으면 사용하고, 없으면 기본값 사용
  const kda = actualKDA !== undefined ? actualKDA : 1.0

  // 챔피언 배경 이미지 관련
  const championImage = getChampionSplashArt(topChampion)
  const fallbackGradient = getChampionFallbackGradient(topChampion)

  // 조건부 렌더링으로 앞면/뒷면 구분
  if (isFlipped) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-gray-50",
          "shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer h-80",
          "transform animate-pulse",
          getTierBorderColor(member.tier),
          className
        )}
        onClick={(e) => {
          e.stopPropagation()
          setIsFlipped(false)
          onClick?.()
        }}
      >
        {/* 뒷면 - 최근 5경기 */}
        <div className="h-full p-5 flex flex-col">
          {/* 뒷면 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-800">최근 경기</h3>
            </div>
            <div className="text-sm text-gray-500">{recentMatches.length}경기</div>
          </div>

          {/* 최근 경기 목록 */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {recentMatches.length > 0 ? (
              recentMatches.map((match, index) => {
                const kda = match.deaths > 0 
                  ? ((match.kills + match.assists) / match.deaths).toFixed(1)
                  : `${match.kills + match.assists}.0`

                return (
                  <div
                    key={`${match.matchId}-${index}`}
                    className={cn(
                      "p-3 rounded-lg border-2 flex items-center justify-between",
                      match.isWin 
                        ? "bg-blue-50 border-blue-200" 
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    {/* 챔피언 & 결과 */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-bold",
                        match.isWin ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                      )}>
                        {match.isWin ? "승리" : "패배"}
                      </div>
                      <div className="font-medium text-gray-800">
                        {match.champion}
                      </div>
                    </div>

                    {/* KDA & MVP */}
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{match.kills}</span>/
                        <span className="font-medium text-red-500">{match.deaths}</span>/
                        <span className="font-medium">{match.assists}</span>
                        <span className="ml-1 text-gray-500">({kda})</span>
                      </div>
                      {match.isMvp && (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">경기 기록이 없습니다</p>
                </div>
              </div>
            )}
          </div>

          {/* 뒷면 하단 정보 */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500">
              카드를 다시 클릭하면 기본 정보로 돌아갑니다
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        // 기본 카드 스타일
        "relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-gray-50",
        "shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
        "transform hover:scale-105 hover:-translate-y-1 h-80",
        // 티어에 따른 테두리 색상
        getTierBorderColor(member.tier),
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        setIsFlipped(true)
        onClick?.()
      }}
    >
      {/* 챔피언 배경 이미지 또는 티어 그라데이션 */}
      {championImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${championImage})`,
          }}
        />
      ) : topChampion ? (
        <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} opacity-25`} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br opacity-5" style={{
          backgroundImage: getTierGradient(member.tier)
        }} />
      )}

        {/* 카드 헤더 */}
        <div className="relative p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          {/* 티어 + 닉네임 박스 */}
          <div className="relative">
            <div className={cn(
              "px-4 py-3 rounded-lg flex flex-col items-center justify-center text-white font-bold text-center min-w-[90px]",
              "shadow-lg border-2 border-white/20",
              getTierAvatarColor(member.tier)
            )}>
              <div className="text-xs font-bold opacity-90 leading-tight">
                {member.tier?.toUpperCase().replace('_', ' ')}
              </div>
              <div className="text-sm font-bold leading-tight mt-1 truncate max-w-[80px]">
                {member.nickname}
              </div>
            </div>

            {/* 리더 크라운 */}
            {member.role === 'leader' && (
              <div className="absolute -top-2 -right-1 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* 편집 버튼들 */}
          {showActions && children && (
            <div className="flex flex-col gap-1 relative z-10">
              {children}
            </div>
          )}
        </div>

        {/* 포지션 정보 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <MainPositionIcon className={cn("w-5 h-5", positionColors[member.mainPosition])} />
            <span className="text-base font-semibold text-gray-800">
              {positionNames[member.mainPosition]}
            </span>
          </div>

          {member.subPositions && member.subPositions.length > 0 && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {member.subPositions.slice(0, 2).map(pos => positionNames[pos]).join(', ')}
                  {member.subPositions.length > 2 && '...'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* 승률 */}
          <div className="text-center p-2 bg-white/70 rounded-lg border">
            <div className={cn(
              "text-lg font-bold",
              winRate >= 60 ? "text-green-600" :
              winRate >= 50 ? "text-blue-600" : "text-red-500"
            )}>
              {winRate}%
            </div>
            <div className="text-xs text-gray-500">승률</div>
          </div>

          {/* 경기 수 */}
          <div className="text-center p-2 bg-white/70 rounded-lg border">
            <div className="text-lg font-bold text-gray-700">
              {totalWins + totalLosses}
            </div>
            <div className="text-xs text-gray-500">경기</div>
          </div>

          {/* 티어 점수 */}
          <div className="text-center p-2 bg-white/70 rounded-lg border">
            <div className="text-lg font-bold text-purple-600">
              {member.stats?.tierScore ?? 0}
            </div>
            <div className="text-xs text-gray-500">점수</div>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-3 gap-2 text-xs bg-white/60 rounded-lg p-2">
          {/* MVP */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-3 h-3 text-yellow-600" />
              <span className="font-bold text-yellow-700">
                {actualMvpCount !== undefined ? actualMvpCount : (member.stats?.mvpCount ?? 0)}
              </span>
            </div>
            <div className="text-gray-500">MVP</div>
          </div>

          {/* KDA */}
          <div className="text-center">
            <div className="font-bold text-blue-700 mb-1">
              {kda.toFixed(1)}
            </div>
            <div className="text-gray-500">KDA</div>
          </div>

          {/* 연승/연패 */}
          <div className="text-center">
            <div className="mb-1">
              {(() => {
                const streak = actualCurrentStreak !== undefined ? actualCurrentStreak : (member.stats?.currentStreak ?? 0)
                return streak === 0 ? (
                  <span className="font-bold text-gray-600">-</span>
                ) : (
                  <span className={cn(
                    "font-bold",
                    streak > 0 ? "text-green-600" : "text-red-500"
                  )}>
                    {Math.abs(streak)}
                  </span>
                )
              })()}
            </div>
            <div className="text-gray-500">
              {(() => {
                const streak = actualCurrentStreak !== undefined ? actualCurrentStreak : (member.stats?.currentStreak ?? 0)
                return streak === 0 ? '보통' : streak > 0 ? '연승' : '연패'
              })()}
            </div>
          </div>
        </div>

      </div>

      {/* 카드 테두리 발광 효과 */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300",
        "ring-2 ring-offset-2",
        getTierRingColor(member.tier)
      )} />
    </div>
  )
}

// 티어별 테두리 색상
function getTierBorderColor(tier: string): string {
  if (tier.includes('iron')) return 'border-gray-400'
  if (tier.includes('bronze')) return 'border-amber-600'
  if (tier.includes('silver')) return 'border-gray-500'
  if (tier.includes('gold')) return 'border-yellow-500'
  if (tier.includes('platinum')) return 'border-cyan-500'
  if (tier.includes('emerald')) return 'border-emerald-500'
  if (tier.includes('diamond')) return 'border-blue-500'
  if (tier.includes('master')) return 'border-purple-500'
  if (tier.includes('grandmaster')) return 'border-red-500'
  if (tier.includes('challenger')) return 'border-yellow-400'
  return 'border-gray-300'
}

// 티어별 아바타 배경색
function getTierAvatarColor(tier: string): string {
  if (tier.includes('iron')) return 'bg-gray-500'
  if (tier.includes('bronze')) return 'bg-amber-700'
  if (tier.includes('silver')) return 'bg-gray-600'
  if (tier.includes('gold')) return 'bg-yellow-600'
  if (tier.includes('platinum')) return 'bg-cyan-600'
  if (tier.includes('emerald')) return 'bg-emerald-600'
  if (tier.includes('diamond')) return 'bg-blue-600'
  if (tier.includes('master')) return 'bg-purple-600'
  if (tier.includes('grandmaster')) return 'bg-red-600'
  if (tier.includes('challenger')) return 'bg-gradient-to-r from-yellow-500 to-red-500'
  return 'bg-gray-500'
}

// 티어별 그라데이션
function getTierGradient(tier: string): string {
  if (tier.includes('iron')) return 'linear-gradient(135deg, #6b7280, #9ca3af)'
  if (tier.includes('bronze')) return 'linear-gradient(135deg, #d97706, #f59e0b)'
  if (tier.includes('silver')) return 'linear-gradient(135deg, #6b7280, #d1d5db)'
  if (tier.includes('gold')) return 'linear-gradient(135deg, #eab308, #fbbf24)'
  if (tier.includes('platinum')) return 'linear-gradient(135deg, #0891b2, #06b6d4)'
  if (tier.includes('emerald')) return 'linear-gradient(135deg, #059669, #10b981)'
  if (tier.includes('diamond')) return 'linear-gradient(135deg, #2563eb, #3b82f6)'
  if (tier.includes('master')) return 'linear-gradient(135deg, #7c3aed, #a855f7)'
  if (tier.includes('grandmaster')) return 'linear-gradient(135deg, #dc2626, #ef4444)'
  if (tier.includes('challenger')) return 'linear-gradient(135deg, #f59e0b, #dc2626)'
  return 'linear-gradient(135deg, #6b7280, #9ca3af)'
}

// 티어별 링 색상
function getTierRingColor(tier: string): string {
  if (tier.includes('iron')) return 'ring-gray-400'
  if (tier.includes('bronze')) return 'ring-amber-600'
  if (tier.includes('silver')) return 'ring-gray-500'
  if (tier.includes('gold')) return 'ring-yellow-500'
  if (tier.includes('platinum')) return 'ring-cyan-500'
  if (tier.includes('emerald')) return 'ring-emerald-500'
  if (tier.includes('diamond')) return 'ring-blue-500'
  if (tier.includes('master')) return 'ring-purple-500'
  if (tier.includes('grandmaster')) return 'ring-red-500'
  if (tier.includes('challenger')) return 'ring-yellow-400'
  return 'ring-gray-300'
}