'use client'

import { TeamMember, Position } from '@/lib/types'
import { TierBadge } from '@/components/ui/tier-badge'
import { positionNames, getTierColor, cn } from '@/lib/utils'
import { getChampionSplashArt, getChampionFallbackGradient } from '@/lib/champion-images'
import {
  Crown,
  Trophy,
  TrendingUp,
  Target,
  Swords,
  Shield,
  Zap,
  Heart,
  Users
} from 'lucide-react'

interface MemberCardProps {
  member: TeamMember
  currentUserId?: string
  isLeader?: boolean
  onClick?: () => void
  className?: string
  showActions?: boolean
  children?: React.ReactNode
  topChampion?: string | null
}

// 포지션별 아이콘 매핑
const positionIcons = {
  top: Swords,
  jungle: Target,
  mid: Zap,
  adc: TrendingUp,
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
  topChampion
}: MemberCardProps) {
  const MainPositionIcon = positionIcons[member.mainPosition]
  const winRate = member.stats.totalWins + member.stats.totalLosses > 0
    ? Math.round((member.stats.totalWins / (member.stats.totalWins + member.stats.totalLosses)) * 100)
    : 0

  const kda = member.stats.totalWins + member.stats.totalLosses > 0
    ? ((member.stats.totalWins * 2.5) + (member.stats.totalLosses * 0.5)) / (member.stats.totalWins + member.stats.totalLosses)
    : 2.0

  // 챔피언 배경 이미지 관련
  const championImage = getChampionSplashArt(topChampion)
  const fallbackGradient = getChampionFallbackGradient(topChampion)

  return (
    <div
      className={cn(
        // 기본 카드 스타일
        "relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-gray-50",
        "shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
        "transform hover:scale-105 hover:-translate-y-1",
        // 티어에 따른 테두리 색상
        getTierBorderColor(member.tier),
        className
      )}
      onClick={onClick}
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
      <div className="relative p-4 pb-2">
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
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* MVP 배지 */}
          {member.stats.mvpCount > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
              <Trophy className="w-4 h-4" />
              {member.stats.mvpCount}
            </div>
          )}
        </div>

        {/* 포지션 정보 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <MainPositionIcon className={cn("w-4 h-4", positionColors[member.mainPosition])} />
            <span className="text-sm font-medium text-gray-700">
              {positionNames[member.mainPosition]}
            </span>
          </div>

          {member.subPositions && member.subPositions.length > 0 && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {member.subPositions.slice(0, 2).map(pos => positionNames[pos]).join(', ')}
                  {member.subPositions.length > 2 && '...'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
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
              {member.stats.totalWins + member.stats.totalLosses}
            </div>
            <div className="text-xs text-gray-500">경기</div>
          </div>

          {/* 티어 점수 */}
          <div className="text-center p-2 bg-white/70 rounded-lg border">
            <div className="text-lg font-bold text-purple-600">
              {member.stats.tierScore}
            </div>
            <div className="text-xs text-gray-500">점수</div>
          </div>
        </div>

        {/* 전적 정보 */}
        <div className="flex items-center justify-between text-sm text-gray-600 bg-white/50 rounded-lg p-2">
          <span>{member.stats.totalWins}승 {member.stats.totalLosses}패</span>
          {member.stats.currentStreak !== 0 && (
            <span className={cn(
              "font-medium",
              member.stats.currentStreak > 0 ? "text-green-600" : "text-red-500"
            )}>
              {member.stats.currentStreak > 0 ? `${member.stats.currentStreak}연승` : `${Math.abs(member.stats.currentStreak)}연패`}
            </span>
          )}
        </div>

        {/* 액션 버튼 영역 */}
        {showActions && children && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {children}
          </div>
        )}
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