import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { TierType, Position } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 티어별 색상 시스템 (롤 공식 색상에 맞게 조정)
export const getTierColor = (tier: TierType): string => {
  const tierColors: Record<TierType, string> = {
    // Iron - 진한 회색/갈색 계열
    iron_iv: 'bg-gray-700 text-gray-200 border-gray-600',
    iron_iii: 'bg-gray-700 text-gray-200 border-gray-600',
    iron_ii: 'bg-gray-700 text-gray-200 border-gray-600',
    iron_i: 'bg-gray-700 text-gray-200 border-gray-600',
    
    // Bronze - 청동색 계열
    bronze_iv: 'bg-amber-800 text-amber-100 border-amber-700',
    bronze_iii: 'bg-amber-800 text-amber-100 border-amber-700',
    bronze_ii: 'bg-amber-800 text-amber-100 border-amber-700',
    bronze_i: 'bg-amber-800 text-amber-100 border-amber-700',
    
    // Silver - 밝은 회색/은색
    silver_iv: 'bg-slate-500 text-white border-slate-400',
    silver_iii: 'bg-slate-500 text-white border-slate-400',
    silver_ii: 'bg-slate-500 text-white border-slate-400',
    silver_i: 'bg-slate-500 text-white border-slate-400',
    
    // Gold - 황금색
    gold_iv: 'bg-yellow-600 text-yellow-50 border-yellow-500',
    gold_iii: 'bg-yellow-600 text-yellow-50 border-yellow-500',
    gold_ii: 'bg-yellow-600 text-yellow-50 border-yellow-500',
    gold_i: 'bg-yellow-600 text-yellow-50 border-yellow-500',
    
    // Platinum - 청록색 (더 진하게)
    platinum_iv: 'bg-cyan-700 text-cyan-50 border-cyan-600',
    platinum_iii: 'bg-cyan-700 text-cyan-50 border-cyan-600',
    platinum_ii: 'bg-cyan-700 text-cyan-50 border-cyan-600',
    platinum_i: 'bg-cyan-700 text-cyan-50 border-cyan-600',
    
    // Emerald - 에메랄드 녹색
    emerald_iv: 'bg-emerald-600 text-emerald-50 border-emerald-500',
    emerald_iii: 'bg-emerald-600 text-emerald-50 border-emerald-500',
    emerald_ii: 'bg-emerald-600 text-emerald-50 border-emerald-500',
    emerald_i: 'bg-emerald-600 text-emerald-50 border-emerald-500',
    
    // Diamond - 다이아몬드 푸른색
    diamond_iv: 'bg-sky-600 text-sky-50 border-sky-500',
    diamond_iii: 'bg-sky-600 text-sky-50 border-sky-500',
    diamond_ii: 'bg-sky-600 text-sky-50 border-sky-500',
    diamond_i: 'bg-sky-600 text-sky-50 border-sky-500',
    
    // Master - 진보라색
    master: 'bg-purple-700 text-purple-100 border-purple-600',
    
    // Grandmaster - 진한 빨간색
    grandmaster: 'bg-red-700 text-red-100 border-red-600',
    
    // Challenger - 특별한 황금 그라데이션
    challenger: 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500 text-yellow-900 border-yellow-400 font-bold'
  }
  
  return tierColors[tier]
}

// 티어 한글 이름 매핑
export const tierNames: Record<TierType, string> = {
  iron_iv: '아이언 IV', iron_iii: '아이언 III', iron_ii: '아이언 II', iron_i: '아이언 I',
  bronze_iv: '브론즈 IV', bronze_iii: '브론즈 III', bronze_ii: '브론즈 II', bronze_i: '브론즈 I',
  silver_iv: '실버 IV', silver_iii: '실버 III', silver_ii: '실버 II', silver_i: '실버 I',
  gold_iv: '골드 IV', gold_iii: '골드 III', gold_ii: '골드 II', gold_i: '골드 I',
  platinum_iv: '플래티넘 IV', platinum_iii: '플래티넘 III', platinum_ii: '플래티넘 II', platinum_i: '플래티넘 I',
  emerald_iv: '에메랄드 IV', emerald_iii: '에메랄드 III', emerald_ii: '에메랄드 II', emerald_i: '에메랄드 I',
  diamond_iv: '다이아몬드 IV', diamond_iii: '다이아몬드 III', diamond_ii: '다이아몬드 II', diamond_i: '다이아몬드 I',
  master: '마스터',
  grandmaster: '그랜드마스터',
  challenger: '챌린저'
}

// 포지션 한글 이름 매핑
export const positionNames: Record<Position, string> = {
  top: '탑',
  jungle: '정글',
  mid: '미드',
  adc: '원딜',
  support: '서포터'
}
