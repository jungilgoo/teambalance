import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateTierScore } from '@/lib/stats'
import type { TierType } from '@/lib/types'

// Supabase Admin 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 티어 점수 마이그레이션 시작...')
    
    // 모든 활성 멤버 조회
    const { data: members, error: fetchError } = await supabase
      .from('team_members')
      .select(`
        id, 
        nickname, 
        tier, 
        tier_score,
        total_wins, 
        total_losses, 
        main_position_games, 
        main_position_wins, 
        sub_position_games, 
        sub_position_wins
      `)
      .eq('status', 'active')

    if (fetchError) {
      console.error('❌ 멤버 조회 실패:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: '멤버 조회 실패' 
      }, { status: 500 })
    }

    console.log(`📊 총 ${members.length}명의 멤버 발견`)
    
    const results = []
    let updatedCount = 0
    let unchangedCount = 0

    for (const member of members) {
      const oldScore = member.tier_score || 0
      
      // 새로운 방식으로 티어 점수 계산
      const newScore = calculateTierScore(member.tier as TierType, {
        totalWins: member.total_wins || 0,
        totalLosses: member.total_losses || 0,
        mainPositionGames: member.main_position_games || 0,
        mainPositionWins: member.main_position_wins || 0,
        subPositionGames: member.sub_position_games || 0,
        subPositionWins: member.sub_position_wins || 0
      })

      const result = {
        id: member.id,
        nickname: member.nickname,
        tier: member.tier,
        wins: member.total_wins || 0,
        losses: member.total_losses || 0,
        oldScore,
        newScore,
        difference: newScore - oldScore,
        updated: false,
        error: undefined as string | undefined
      }

      // 점수가 바뀐 경우에만 업데이트
      if (oldScore !== newScore) {
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ tier_score: newScore })
          .eq('id', member.id)

        if (updateError) {
          console.error(`❌ ${member.nickname} 업데이트 실패:`, updateError)
          result.updated = false
          result.error = updateError.message
        } else {
          console.log(`✅ ${member.nickname}: ${oldScore} → ${newScore} (${newScore - oldScore > 0 ? '+' : ''}${newScore - oldScore})`)
          result.updated = true
          updatedCount++
        }
      } else {
        console.log(`⚪ ${member.nickname}: ${oldScore} (변경 없음)`)
        unchangedCount++
      }

      results.push(result)
    }

    console.log('\n🎉 마이그레이션 완료!')
    console.log(`✅ 업데이트된 멤버: ${updatedCount}명`)
    console.log(`⚪ 변경 없음: ${unchangedCount}명`)
    console.log(`📊 총 처리: ${members.length}명`)

    return NextResponse.json({
      success: true,
      message: '티어 점수 마이그레이션 완료',
      summary: {
        totalMembers: members.length,
        updatedCount,
        unchangedCount
      },
      results
    })

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '마이그레이션 중 오류 발생',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
