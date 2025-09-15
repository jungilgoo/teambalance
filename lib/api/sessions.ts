import { createSupabaseBrowser } from '../supabase'
import { Match, TierType, Position } from '../types'
import { calculateTierScore, calculateMatchMVP } from '../stats'
import { validateUUID, validateString, validateInteger } from '../input-validator'
import type { Database } from '../database.types'

const supabase = createSupabaseBrowser()

interface SessionTeamMember {
  id: string
  nickname: string
  position: Position
  tier: TierType
  tierScore: number
}

// ============================================================================
// 세션 관리 API 함수들
// ============================================================================

export const createSession = async (
  teamId: string,
  createdBy: string,
  selectedMembers: SessionTeamMember[],
  balancingType: 'smart' | 'random',
  team1Members: SessionTeamMember[],
  team2Members: SessionTeamMember[]
) => {
  try {
    const validatedTeamId = validateUUID(teamId)
    if (!validatedTeamId) {
      console.error('유효하지 않은 팀 ID:', teamId)
      return null
    }


    const sessionData = {
      team_id: validatedTeamId,
      created_by: createdBy,
      status: 'preparing' as const,
      selected_members: selectedMembers,
      team1_members: team1Members,
      team2_members: team2Members
    }

    // 세션 저장 데이터 검증 로깅
    console.log('💾 세션 저장 데이터:', {
      teamId: validatedTeamId,
      selectedCount: selectedMembers.length,
      team1Count: team1Members.length,
      team2Count: team2Members.length,
      team1Positions: team1Members.map(m => ({ nickname: m.nickname, position: m.position })),
      team2Positions: team2Members.map(m => ({ nickname: m.nickname, position: m.position }))
    })


    const { data: session, error } = await (supabase as any)
      .from('sessions')
      .insert(sessionData)
      .select('id')
      .single()

    if (error) {
      console.error('세션 생성 오류:', error)
      return null
    }

    return session.id
  } catch (error) {
    console.error('세션 생성 중 예외:', error)
    return null
  }
}

export const updateSession = async (
  sessionId: string,
  updates: {
    status?: 'preparing' | 'in_progress' | 'completed'
    team1Members?: SessionTeamMember[]
    team2Members?: SessionTeamMember[]
    result?: {
      winningTeam: 'team1' | 'team2'
      mvpMemberId?: string
    }
  }
): Promise<boolean> => {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (updates.status) updateData.status = updates.status
    if (updates.team1Members) updateData.team1_members = updates.team1Members
    if (updates.team2Members) updateData.team2_members = updates.team2Members
    if (updates.result) updateData.result = updates.result

    const { error } = await (supabase as any)
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.error('세션 업데이트 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('세션 업데이트 중 예외:', error)
    return false
  }
}

export const getSession = async (sessionId: string) => {
  try {
    
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      console.error('세션 조회 오류:', error)
      return null
    }

    if (!session) {
      console.log('세션 데이터 없음:', sessionId)
      return null
    }


    const sessionData = session as any
    return {
      id: sessionData.id,
      teamId: sessionData.team_id,
      status: sessionData.status,
      balancingType: 'smart', // 기본값으로 설정
      selectedMembers: sessionData.selected_members || [],
      team1Members: sessionData.team1_members || [],
      team2Members: sessionData.team2_members || [],
      result: sessionData.result,
      createdAt: new Date(sessionData.created_at),
      updatedAt: new Date(sessionData.updated_at)
    }
  } catch (error) {
    console.error('세션 조회 중 예외:', error)
    return null
  }
}

export const updateSessionResult = async (
  sessionId: string,
  winningTeam: 'team1' | 'team2',
  mvpMemberId?: string
): Promise<boolean> => {
  try {
    // 세션 상태만 completed로 업데이트
    const { error } = await (supabase as any)
      .from('sessions')
      .update({
        status: 'completed'
      })
      .eq('id', sessionId)

    if (error) {
      console.error('세션 결과 업데이트 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('세션 결과 업데이트 중 예외:', error)
    return false
  }
}

// ============================================================================
// 매치 결과 관리 API 함수들
// ============================================================================

// 멤버 ID 배치 검증 함수 추가
const validateMemberIds = async (memberIds: string[]): Promise<{ valid: string[]; invalid: string[] }> => {
  const valid: string[] = []
  const invalid: string[] = []
  
  for (const memberId of memberIds) {
    if (!memberId || memberId === 'undefined') {
      invalid.push(memberId)
      continue
    }
    
    try {
      const { data: member, error } = await supabase
        .from('team_members')
        .select('id')
        .eq('id', memberId)
        .single()
      
      if (error || !member) {
        invalid.push(memberId)
      } else {
        valid.push(memberId)
      }
    } catch (error) {
      invalid.push(memberId)
    }
  }
  
  return { valid, invalid }
}

export const saveMatchResult = async (matchData: {
  teamId: string
  winningTeam: 'team1' | 'team2'
  team1: Array<{
    memberId: string
    champion: string
    position: Position
    kills: number
    deaths: number
    assists: number
  }>
  team2: Array<{
    memberId: string
    champion: string
    position: Position
    kills: number
    deaths: number
    assists: number
  }>
}): Promise<boolean> => {
  try {
    console.log('🏁 매치 결과 저장 시작:', { teamId: matchData.teamId, winningTeam: matchData.winningTeam })
    
    // 입력값 검증
    const validatedTeamId = validateUUID(matchData.teamId)
    
    if (!validatedTeamId) {
      console.error('❌ 매치 결과 저장 입력값 검증 실패 - 유효하지 않은 teamId')
      return false
    }

    // 모든 멤버 ID 검증
    const allMemberIds = [...matchData.team1, ...matchData.team2].map(player => player.memberId)
    const memberValidation = await validateMemberIds(allMemberIds)
    
    if (memberValidation.invalid.length > 0) {
      console.error('❌ 잘못된 멤버 ID가 발견됨:', memberValidation.invalid)
      return false
    }
    
    console.log('✅ 모든 멤버 ID 검증 완료:', { validCount: memberValidation.valid.length })

    // MVP 계산을 위한 Match 객체 생성
    const matchForMVP = {
      id: 'temp-match-for-mvp',
      team1: { members: matchData.team1 },
      team2: { members: matchData.team2 },
      winner: matchData.winningTeam,
      createdAt: new Date()
    }
    const mvpMemberId = calculateMatchMVP(matchForMVP as any)

    // 매치 결과 저장 (session_id 컬럼 제거됨)
    const matchResult = {
      team_id: validatedTeamId,
      winner: matchData.winningTeam,
      mvp_member_id: mvpMemberId,
      created_at: new Date().toISOString()
    }

    const { data: match, error: matchError } = await (supabase as any)
      .from('matches')
      .insert(matchResult)
      .select('id')
      .single()

    if (matchError) {
      console.error('매치 저장 오류:', matchError)
      return false
    }

    // match_members 테이블에 개별 선수 데이터 저장
    const allMatchMembers = []
    
    // team1 선수들 데이터
    for (const player of matchData.team1) {
      allMatchMembers.push({
        match_id: match.id,
        team_member_id: player.memberId,
        team_side: 'team1' as const,
        position: player.position,
        champion: player.champion,
        kills: player.kills || 0,
        deaths: player.deaths || 0,
        assists: player.assists || 0
      })
    }

    // team2 선수들 데이터  
    for (const player of matchData.team2) {
      allMatchMembers.push({
        match_id: match.id,
        team_member_id: player.memberId,
        team_side: 'team2' as const,
        position: player.position,
        champion: player.champion,
        kills: player.kills || 0,
        deaths: player.deaths || 0,
        assists: player.assists || 0
      })
    }

    // match_members 일괄 저장
    const { error: membersError } = await (supabase as any)
      .from('match_members')
      .insert(allMatchMembers)

    if (membersError) {
      console.error('매치 멤버 저장 오류:', membersError)
      // 매치는 저장되었으므로 부분 성공으로 처리
    }

    // 개별 플레이어 통계 업데이트
    console.log('📊 멤버 통계 업데이트 시작')
    const team1Winners = matchData.winningTeam === 'team1'
    const team2Winners = matchData.winningTeam === 'team2'
    const statUpdateErrors: string[] = []

    for (const player of matchData.team1) {
      const isWinner = team1Winners
      const isMVP = player.memberId === mvpMemberId
      const result = await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
      if (!result.success) {
        statUpdateErrors.push(`Team1 ${player.memberId}: ${result.error}`)
      }
    }

    for (const player of matchData.team2) {
      const isWinner = team2Winners
      const isMVP = player.memberId === mvpMemberId
      const result = await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
      if (!result.success) {
        statUpdateErrors.push(`Team2 ${player.memberId}: ${result.error}`)
      }
    }

    if (statUpdateErrors.length > 0) {
      console.error('⚠️ 일부 멤버 통계 업데이트 실패:', statUpdateErrors)
      // 실패해도 매치 저장은 성공으로 처리 (배치 업데이트 처리를 위해)
    } else {
      console.log('✅ 모든 멤버 통계 업데이트 완료')
    }

    console.log('✅ 매치 결과 저장 및 통계 업데이트 완료')
    
    // 최종 검증: 새로 생성된 통계 확인
    console.log('🔍 새로 생성된 통계 검증 시작')
    
    for (const member of [...matchData.team1, ...matchData.team2]) {
      try {
        const { data: updatedMember, error } = await supabase
          .from('team_members')
          .select('total_wins, total_losses, tier_score, nickname')
          .eq('id', member.memberId)
          .single()
          
        if (error || !updatedMember) {
          console.error(`⚠️ 새로 생성 후 검증 실패 - ${member.memberId}:`, error)
        } else {
          console.log(`✅ ${(updatedMember as any).nickname}: W${(updatedMember as any).total_wins} L${(updatedMember as any).total_losses} TS:${Math.round((updatedMember as any).tier_score)}`)
        }
      } catch (error) {
        console.error(`⚠️ 새로 생성 후 검증 예외 - ${member.memberId}:`, error)
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ 매치 결과 저장 중 예외:', error)
    return false
  }
}

const updateMemberStats = async (
  memberId: string,
  position: Position,
  isWinner: boolean,
  isMVP: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`📊 멤버 통계 업데이트 시작:`, { memberId, position, isWinner, isMVP })
    
    // 멤버 ID 검증
    if (!memberId || memberId === 'undefined') {
      const error = `잘못된 멤버 ID: ${memberId}`
      console.error('❌', error)
      return { success: false, error }
    }

    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      const error = `멤버 정보 조회 실패: ${memberError?.message || '멤버를 찾을 수 없음'}`
      console.error('❌', error, { memberId, memberError })
      return { success: false, error }
    }

    console.log(`🔍 멤버 정보 조회 성공:`, {
      memberId,
      nickname: (member as any).nickname,
      currentWins: (member as any).total_wins,
      currentLosses: (member as any).total_losses
    })

    // 통계 업데이트 준비
    const memberData = member as any
    const isMainPosition = memberData.main_position === position
    const updates: Record<string, number> = {}

    // 기본 승패 통계
    if (isWinner) {
      updates.total_wins = memberData.total_wins + 1
      if (isMainPosition) {
        updates.main_position_wins = memberData.main_position_wins + 1
      } else {
        updates.sub_position_wins = memberData.sub_position_wins + 1
      }
    } else {
      updates.total_losses = memberData.total_losses + 1
    }

    // 포지션별 게임 수
    if (isMainPosition) {
      updates.main_position_games = memberData.main_position_games + 1
    } else {
      updates.sub_position_games = memberData.sub_position_games + 1
    }

    // MVP 카운트 (임시 비활성화 - mvp_count 컬럼 없음)
    // if (isMVP) {
    //   updates.mvp_count = (memberData.mvp_count || 0) + 1
    // }

    // 새로운 티어 점수 계산 (승률 반영)
    const newStats = {
      totalWins: updates.total_wins !== undefined ? updates.total_wins : memberData.total_wins,
      totalLosses: updates.total_losses !== undefined ? updates.total_losses : memberData.total_losses,
      mainPositionGames: updates.main_position_games !== undefined ? updates.main_position_games : memberData.main_position_games,
      mainPositionWins: updates.main_position_wins !== undefined ? updates.main_position_wins : memberData.main_position_wins,
      subPositionGames: updates.sub_position_games !== undefined ? updates.sub_position_games : memberData.sub_position_games,
      subPositionWins: updates.sub_position_wins !== undefined ? updates.sub_position_wins : memberData.sub_position_wins
    }

    const oldTierScore = memberData.tier_score
    updates.tier_score = calculateTierScore(memberData.tier as TierType, newStats)

    console.log(`📈 통계 업데이트 계산:`, {
      memberId,
      oldStats: { wins: memberData.total_wins, losses: memberData.total_losses, tierScore: oldTierScore },
      updates,
      newTierScore: updates.tier_score
    })

    // 통계 업데이트 실행
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update(updates)
      .eq('id', memberId)

    if (updateError) {
      const error = `통계 업데이트 실패: ${updateError.message}`
      console.error('❌', error, { memberId, updates, updateError })
      return { success: false, error }
    }

    console.log(`✅ 멤버 통계 업데이트 완료:`, { memberId, updatedFields: Object.keys(updates) })
    return { success: true }
  } catch (error) {
    const errorMessage = `통계 업데이트 중 예외: ${error instanceof Error ? error.message : String(error)}`
    console.error('❌', errorMessage, { memberId, error })
    return { success: false, error: errorMessage }
  }
}

export const getMatchesByTeamId = async (teamId: string): Promise<Match[]> => {
  try {
    // 먼저 매치 정보와 매치 멤버들을 조인하여 조회
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        mvp_member_id,
        created_at,
        match_members (
          team_member_id,
          team_side,
          position,
          champion,
          kills,
          deaths,
          assists
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50) // 최근 50경기만

    if (error) {
      console.error('팀 매치 목록 조회 오류:', error)
      return []
    }

    // 데이터를 Match 타입에 맞게 변환
    return matches.map((match: any) => {
      const team1Members = match.match_members
        ?.filter((member: any) => member.team_side === 'team1')
        .map((member: any) => ({
          memberId: member.team_member_id,
          position: member.position,
          champion: member.champion,
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })) || []

      const team2Members = match.match_members
        ?.filter((member: any) => member.team_side === 'team2')
        .map((member: any) => ({
          memberId: member.team_member_id,
          position: member.position,
          champion: member.champion,
          kills: member.kills || 0,
          deaths: member.deaths || 0,
          assists: member.assists || 0
        })) || []

      return {
        id: match.id,
        teamId: match.team_id || '',
        team1: { members: team1Members },
        team2: { members: team2Members },
        winner: match.winner as 'team1' | 'team2',
        mvpMemberId: match.mvp_member_id || undefined,
        createdAt: new Date(match.created_at)
      } as any
    })
  } catch (error) {
    console.error('팀 매치 목록 조회 중 예외:', error)
    return []
  }
}

export const getMatchBySessionId = async (sessionId: string): Promise<Match | null> => {
  try {
    console.log('⚠️ getMatchBySessionId 함수는 session_id 컬럼 제거로 인해 더 이상 사용할 수 없습니다 - sessionId:', sessionId)
    
    // session_id 컬럼이 제거되어 이 함수는 더 이상 작동하지 않습니다
    // 세션별 경기 결과 조회가 필요한 경우 대안을 사용해야 합니다
    return null
  } catch (error) {
    console.error('getMatchBySessionId 호출 오류:', error)
    return null
  }
}

export const deleteMatchResult = async (matchId: string): Promise<boolean> => {
  try {
    console.log('🗑️ 매치 삭제 시작:', matchId)
    
    // 매치 정보와 매치 멤버들을 조회하여 통계 롤백에 필요한 데이터 수집
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        match_members (
          team_member_id,
          team_side,
          position,
          champion
        )
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      console.error('❌ 매치 정보 조회 오류:', matchError)
      return false
    }
    
    console.log('🔍 삭제 대상 매치 정보:', {
      matchId,
      winner: (match as any).winner,
      memberCount: (match as any).match_members?.length || 0
    })

    // 플레이어 통계 롤백
    const matchData = match as any
    const matchMembers = matchData.match_members || []
    
    console.log('🔄 멤버 통계 롤백 시작')
    const rollbackErrors: string[] = []
    
    for (const member of matchMembers) {
      const memberInfo = member as any
      const isWinner = (memberInfo.team_side === 'team1' && matchData.winner === 'team1') || 
                      (memberInfo.team_side === 'team2' && matchData.winner === 'team2')
      const isMVP = false // MVP 기능 비활성화
      
      const result = await rollbackMemberStats(memberInfo.team_member_id, memberInfo.position, isWinner, isMVP)
      if (!result.success) {
        rollbackErrors.push(`${memberInfo.team_member_id}: ${result.error}`)
      }
    }
    
    if (rollbackErrors.length > 0) {
      console.error('⚠️ 일부 멤버 통계 롤백 실패:', rollbackErrors)
    } else {
      console.log('✅ 모든 멤버 통계 롤백 완료')
    }

    // 매치와 연관된 match_members도 함께 삭제
    const { error: deleteMembersError } = await supabase
      .from('match_members')
      .delete()
      .eq('match_id', matchId)

    if (deleteMembersError) {
      console.error('매치 멤버 삭제 오류:', deleteMembersError)
      // 계속 진행 (매치는 삭제해야 함)
    }

    // 매치 삭제
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (deleteError) {
      console.error('매치 삭제 오류:', deleteError)
      return false
    }

    console.log('✅ 매치 삭제 및 통계 롤백 완료')
    
    // 최종 검증: 롤백된 통계 확인
    console.log('🔍 삭제 후 통계 검증 시작')
    const matchDetails = match as any
    const deletedMatchMembers = matchDetails.match_members || []
    
    for (const member of deletedMatchMembers) {
      const memberInfo = member as any
      try {
        const { data: updatedMember, error } = await supabase
          .from('team_members')
          .select('total_wins, total_losses, tier_score, nickname')
          .eq('id', memberInfo.team_member_id)
          .single()
          
        if (error || !updatedMember) {
          console.error(`⚠️ 삭제 후 검증 실패 - ${memberInfo.team_member_id}:`, error)
        } else {
          console.log(`✅ ${(updatedMember as any).nickname}: W${(updatedMember as any).total_wins} L${(updatedMember as any).total_losses} TS:${Math.round((updatedMember as any).tier_score)}`)
        }
      } catch (error) {
        console.error(`⚠️ 삭제 후 검증 예외 - ${memberInfo.team_member_id}:`, error)
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ 매치 삭제 중 예외:', error)
    return false
  }
}

const rollbackMemberStats = async (
  memberId: string,
  position: Position,
  wasWinner: boolean,
  wasMVP: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`🔄 멤버 통계 롤백 시작:`, { memberId, position, wasWinner, wasMVP })
    
    // 멤버 ID 검증
    if (!memberId || memberId === 'undefined') {
      const error = `잘못된 멤버 ID: ${memberId}`
      console.error('❌', error)
      return { success: false, error }
    }

    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      const error = `멤버 정보 조회 실패: ${memberError?.message || '멤버를 찾을 수 없음'}`
      console.error('❌', error, { memberId, memberError })
      return { success: false, error }
    }

    console.log(`🔍 롤백 대상 멤버 정보:`, {
      memberId,
      nickname: (member as any).nickname,
      currentWins: (member as any).total_wins,
      currentLosses: (member as any).total_losses
    })

    // 통계 롤백 준비
    const memberData = member as any
    const isMainPosition = memberData.main_position === position
    const updates: Record<string, number> = {}

    // 기본 승패 통계 롤백
    if (wasWinner) {
      updates.total_wins = Math.max(0, memberData.total_wins - 1)
      if (isMainPosition) {
        updates.main_position_wins = Math.max(0, memberData.main_position_wins - 1)
      } else {
        updates.sub_position_wins = Math.max(0, memberData.sub_position_wins - 1)
      }
    } else {
      updates.total_losses = Math.max(0, memberData.total_losses - 1)
    }

    // 포지션별 게임 수 롤백
    if (isMainPosition) {
      updates.main_position_games = Math.max(0, memberData.main_position_games - 1)
    } else {
      updates.sub_position_games = Math.max(0, memberData.sub_position_games - 1)
    }

    // MVP 카운트 롤백
    if (wasMVP) {
      // updates.mvp_count = Math.max(0, (memberData.mvp_count || 0) - 1) // 임시 비활성화
    }

    // 새로운 티어 점수 계산
    const newStats = {
      totalWins: updates.total_wins !== undefined ? updates.total_wins : memberData.total_wins,
      totalLosses: updates.total_losses !== undefined ? updates.total_losses : memberData.total_losses,
      mainPositionGames: updates.main_position_games !== undefined ? updates.main_position_games : memberData.main_position_games,
      mainPositionWins: updates.main_position_wins !== undefined ? updates.main_position_wins : memberData.main_position_wins,
      subPositionGames: updates.sub_position_games !== undefined ? updates.sub_position_games : memberData.sub_position_games,
      subPositionWins: updates.sub_position_wins !== undefined ? updates.sub_position_wins : memberData.sub_position_wins
    }

    const oldTierScore = memberData.tier_score
    updates.tier_score = calculateTierScore(memberData.tier as TierType, newStats)

    console.log(`📉 통계 롤백 계산:`, {
      memberId,
      oldStats: { wins: memberData.total_wins, losses: memberData.total_losses, tierScore: oldTierScore },
      updates,
      newTierScore: updates.tier_score
    })

    // 통계 롤백 실행
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update(updates)
      .eq('id', memberId)

    if (updateError) {
      const error = `통계 롤백 실패: ${updateError.message}`
      console.error('❌', error, { memberId, updates, updateError })
      return { success: false, error }
    }

    console.log(`✅ 멤버 통계 롤백 완료:`, { memberId, rolledBackFields: Object.keys(updates) })
    return { success: true }
  } catch (error) {
    const errorMessage = `통계 롤백 중 예외: ${error instanceof Error ? error.message : String(error)}`
    console.error('❌', errorMessage, { memberId, error })
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// 통계 조회 API 함수들
// ============================================================================

export const getRecentTeamActivities = async (
  teamId: string,
  limit: number = 20
): Promise<Array<{
  id: string
  type: 'match'
  description: string
  timestamp: Date
  data?: Record<string, unknown>
}>> => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        created_at
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('최근 팀 활동 조회 오류:', error)
      return []
    }

    return matches.map((match: any) => ({
      id: match.id,
      type: 'match' as const,
      description: `내전 경기 완료 (${match.winner === 'team1' ? '블루팀' : '레드팀'} 승리)`,
      timestamp: new Date(match.created_at),
      data: {
        winningTeam: match.winner
      }
    }))
  } catch (error) {
    console.error('최근 팀 활동 조회 중 예외:', error)
    return []
  }
}

export const getMemberMVPCount = async (memberId: string): Promise<number> => {
  try {
    // matches 테이블에서 MVP로 선정된 횟수를 계산
    const { data: matches, error } = await supabase
      .from('matches')
      .select('mvp_member_id')
      .eq('mvp_member_id', memberId)

    if (error) {
      console.error('멤버 MVP 개수 조회 오류:', error)
      return 0
    }

    // 기존 매치들은 MVP가 저장되지 않았으므로 일시적으로 0을 반환
    // 새로 생성되는 매치부터 MVP가 정상 저장될 예정
    const mvpCount = matches?.length || 0
    console.log(`MVP 카운트 조회 - 멤버 ID: ${memberId}, MVP 횟수: ${mvpCount}`)
    
    return mvpCount
  } catch (error) {
    console.error('멤버 MVP 개수 조회 중 예외:', error)
    return 0
  }
}

export const getTeamMVPRanking = async (teamId: string): Promise<Array<{
  memberId: string
  nickname: string
  mvpCount: number
}>> => {
  try {
    // MVP 횟수를 직접 계산하는 간단한 방법
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('mvp_member_id')
      .eq('team_id', teamId)
      .not('mvp_member_id', 'is', null)

    if (matchError) {
      console.error('팀 MVP 랭킹 조회 오류:', matchError)
      return []
    }

    // MVP 횟수 계산
    const mvpCounts = new Map<string, number>()
    matches?.forEach((match: any) => {
      if (match.mvp_member_id) {
        mvpCounts.set(match.mvp_member_id, (mvpCounts.get(match.mvp_member_id) || 0) + 1)
      }
    })

    if (mvpCounts.size === 0) {
      return []
    }

    // 멤버 정보 조회
    const memberIds = Array.from(mvpCounts.keys())
    const { data: members, error: memberError } = await supabase
      .from('team_members')
      .select('id, nickname')
      .in('id', memberIds)

    if (memberError) {
      console.error('멤버 정보 조회 오류:', memberError)
      return []
    }

    // 결과 정렬 및 반환
    return members
      .map((member: any) => ({
        memberId: member.id,
        nickname: member.nickname,
        mvpCount: mvpCounts.get(member.id) || 0
      }))
      .sort((a, b) => b.mvpCount - a.mvpCount)
      .slice(0, 10)
  } catch (error) {
    console.error('팀 MVP 랭킹 조회 중 예외:', error)
    return []
  }
}

export const getTopRankings = async (teamId: string): Promise<Array<{
  nickname: string
  winRate: number
}>> => {
  try {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('nickname, total_wins, total_losses')
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (error) {
      console.error('상위 랭킹 조회 오류:', error)
      return []
    }

    // 승률 계산 후 정렬
    return members
      .map((member: any) => {
        const totalGames = member.total_wins + member.total_losses
        const winRate = totalGames > 0 ? Math.round((member.total_wins / totalGames) * 100) : 0
        
        return {
          nickname: member.nickname,
          winRate,
          totalGames
        }
      })
      .filter((member: any) => member.totalGames > 0) // 경기 기록이 있는 멤버만
      .sort((a, b) => {
        // 승률 우선, 같으면 총 경기수 많은 순
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate
        }
        return b.totalGames - a.totalGames
      })
      .slice(0, 3) // 상위 3명만
      .map((member: any) => ({
        nickname: member.nickname,
        winRate: member.winRate
      }))
  } catch (error) {
    console.error('상위 랭킹 조회 중 예외:', error)
    return []
  }
}

export const getCurrentStreaks = async (teamId: string): Promise<{
  nickname: string
  streak: number
} | null> => {
  try {
    // 최근 매치 기록을 시간순으로 조회 (최대 50경기)
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        created_at,
        match_members (
          team_member_id,
          team_side,
          team_members (
            id,
            nickname
          )
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (matchError || !matches?.length) {
      return null
    }

    // 각 멤버별 최근 경기 결과를 시간순으로 정리
    const memberMatchHistory = new Map<string, {
      nickname: string
      recentMatches: { isWin: boolean; date: string }[]
    }>()

    // 매치 데이터를 멤버별로 정리
    matches.forEach((match: any) => {
      match.match_members?.forEach((matchMember: any) => {
        const memberId = matchMember.team_member_id
        const member = matchMember.team_members
        
        if (!member) return

        const isWin = (matchMember.team_side === 'team1' && match.winner === 'team1') ||
                      (matchMember.team_side === 'team2' && match.winner === 'team2')

        if (!memberMatchHistory.has(memberId)) {
          memberMatchHistory.set(memberId, {
            nickname: member.nickname,
            recentMatches: []
          })
        }

        memberMatchHistory.get(memberId)!.recentMatches.push({
          isWin,
          date: match.created_at
        })
      })
    })

    // 각 멤버의 현재 연승/연패 계산
    let bestStreak = { nickname: '', streak: 0 }

    memberMatchHistory.forEach((data, memberId) => {
      // 최근 경기부터 시간순으로 정렬 (이미 created_at desc로 정렬됨)
      const matches = data.recentMatches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      if (matches.length === 0) return

      // 현재 연승/연패 계산
      let currentStreak = 0
      const firstMatchResult = matches[0].isWin

      // 첫 번째 경기부터 연속된 결과 계산
      for (const match of matches) {
        if (match.isWin === firstMatchResult) {
          currentStreak += firstMatchResult ? 1 : -1
        } else {
          break // 연속이 끊어지면 중단
        }
      }

      // 최소 2경기 이상 연속이어야 의미있는 연승/연패로 간주
      if (Math.abs(currentStreak) >= 2) {
        // 가장 긴 연승/연패를 찾기 (절댓값 기준)
        if (Math.abs(currentStreak) > Math.abs(bestStreak.streak)) {
          bestStreak = {
            nickname: data.nickname,
            streak: currentStreak
          }
        }
        // 같은 길이면 연승을 우선시
        else if (Math.abs(currentStreak) === Math.abs(bestStreak.streak) && currentStreak > 0 && bestStreak.streak < 0) {
          bestStreak = {
            nickname: data.nickname,
            streak: currentStreak
          }
        }
      }
    })

    return bestStreak.streak !== 0 ? bestStreak : null
  } catch (error) {
    console.error('연승 기록 조회 중 예외:', error)
    return null
  }
}

// 모든 멤버의 현재 연승/연패 상태를 반환하는 함수 (추가 기능)
export const getAllMemberStreaks = async (teamId: string): Promise<Array<{
  memberId: string
  nickname: string
  streak: number
  recentForm: string // 최근 5경기 결과 (예: "WWLWW")
}>> => {
  try {
    // 최근 매치 기록을 시간순으로 조회
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        created_at,
        match_members (
          team_member_id,
          team_side,
          team_members (
            id,
            nickname
          )
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (matchError || !matches?.length) {
      return []
    }

    // 각 멤버별 최근 경기 결과를 시간순으로 정리
    const memberMatchHistory = new Map<string, {
      nickname: string
      recentMatches: { isWin: boolean; date: string }[]
    }>()

    // 매치 데이터를 멤버별로 정리
    matches.forEach((match: any) => {
      match.match_members?.forEach((matchMember: any) => {
        const memberId = matchMember.team_member_id
        const member = matchMember.team_members
        
        if (!member) return

        const isWin = (matchMember.team_side === 'team1' && match.winner === 'team1') ||
                      (matchMember.team_side === 'team2' && match.winner === 'team2')

        if (!memberMatchHistory.has(memberId)) {
          memberMatchHistory.set(memberId, {
            nickname: member.nickname,
            recentMatches: []
          })
        }

        memberMatchHistory.get(memberId)!.recentMatches.push({
          isWin,
          date: match.created_at
        })
      })
    })

    // 각 멤버의 연승/연패 및 최근 폼 계산
    const results: Array<{
      memberId: string
      nickname: string
      streak: number
      recentForm: string
    }> = []

    memberMatchHistory.forEach((data, memberId) => {
      // 최근 경기부터 시간순으로 정렬
      const matches = data.recentMatches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      if (matches.length === 0) return

      // 현재 연승/연패 계산
      let currentStreak = 0
      const firstMatchResult = matches[0].isWin

      for (const match of matches) {
        if (match.isWin === firstMatchResult) {
          currentStreak += firstMatchResult ? 1 : -1
        } else {
          break
        }
      }

      // 최근 5경기 폼 계산
      const recentForm = matches
        .slice(0, 5)
        .map(match => match.isWin ? 'W' : 'L')
        .join('')

      results.push({
        memberId,
        nickname: data.nickname,
        streak: currentStreak,
        recentForm
      })
    })

    // 연승/연패 순으로 정렬 (연승이 높은 순, 연패가 적은 순)
    return results.sort((a, b) => b.streak - a.streak)
  } catch (error) {
    console.error('전체 멤버 연승 기록 조회 중 예외:', error)
    return []
  }
}

export const updateMatchResult = async (
  sessionId: string,
  matchData: {
    winningTeam: 'team1' | 'team2'
    team1: Array<{
      memberId: string
      champion: string
      position: Position
      kills: number
      deaths: number
      assists: number
    }>
    team2: Array<{
      memberId: string
      champion: string
      position: Position
      kills: number
      deaths: number
      assists: number
    }>
  }
): Promise<boolean> => {
  try {
    console.log('🔄 매치 업데이트 시작:', sessionId)
    
    // 모든 멤버 ID 검증
    const allMemberIds = [...matchData.team1, ...matchData.team2].map(player => player.memberId)
    const memberValidation = await validateMemberIds(allMemberIds)
    
    if (memberValidation.invalid.length > 0) {
      console.error('❌ 잘못된 멤버 ID가 발견됨:', memberValidation.invalid)
      return false
    }
    
    console.log('✅ 모든 멤버 ID 검증 완료:', { validCount: memberValidation.valid.length })
    
    // 1. 기존 매치 정보 조회
    const existingMatch = await getMatchBySessionId(sessionId)
    if (!existingMatch) {
      console.error('업데이트할 매치를 찾을 수 없습니다.')
      return false
    }

    console.log('기존 매치 정보:', existingMatch)

    // 2. 기존 통계 롤백 (기존 승패 결과를 되돌림)
    console.log('🔄 기존 통계 롤백 시작')
    const oldTeam1Winners = existingMatch.winner === 'team1'
    const oldTeam2Winners = existingMatch.winner === 'team2'
    const rollbackErrors: string[] = []

    // 기존 team1 멤버들의 통계 롤백
    for (const member of existingMatch.team1.members) {
      const wasWinner = oldTeam1Winners
      const wasMVP = member.memberId === existingMatch.mvpMemberId
      const result = await rollbackMemberStats(member.memberId, member.position, wasWinner, wasMVP)
      if (!result.success) {
        rollbackErrors.push(`OldTeam1 ${member.memberId}: ${result.error}`)
      }
    }

    // 기존 team2 멤버들의 통계 롤백
    for (const member of existingMatch.team2.members) {
      const wasWinner = oldTeam2Winners
      const wasMVP = member.memberId === existingMatch.mvpMemberId
      const result = await rollbackMemberStats(member.memberId, member.position, wasWinner, wasMVP)
      if (!result.success) {
        rollbackErrors.push(`OldTeam2 ${member.memberId}: ${result.error}`)
      }
    }
    
    if (rollbackErrors.length > 0) {
      console.error('❌ 기존 통계 롤백 일부 실패:', rollbackErrors)
      return false // 롤백 실패 시 중단
    }
    console.log('✅ 기존 통계 롤백 완료')

    // 3. 매치 테이블 업데이트 (승리팀만)
    const { error: matchUpdateError } = await (supabase as any)
      .from('matches')
      .update({
        winner: matchData.winningTeam
      })
      .eq('session_id', sessionId)

    if (matchUpdateError) {
      console.error('매치 업데이트 오류:', matchUpdateError)
      return false
    }

    // 4. 기존 match_members 삭제
    const { error: deleteMembersError } = await (supabase as any)
      .from('match_members')
      .delete()
      .eq('match_id', existingMatch.id)

    if (deleteMembersError) {
      console.error('기존 매치 멤버 삭제 오류:', deleteMembersError)
      return false
    }

    // 5. 새로운 match_members 생성
    const allMatchMembers = [
      ...matchData.team1.map(member => ({
        match_id: existingMatch.id,
        team_member_id: member.memberId,
        team_side: 'team1' as const,
        position: member.position,
        champion: member.champion,
        kills: member.kills,
        deaths: member.deaths,
        assists: member.assists
      })),
      ...matchData.team2.map(member => ({
        match_id: existingMatch.id,
        team_member_id: member.memberId,
        team_side: 'team2' as const,
        position: member.position,
        champion: member.champion,
        kills: member.kills,
        deaths: member.deaths,
        assists: member.assists
      }))
    ]

    const { error: insertMembersError } = await (supabase as any)
      .from('match_members')
      .insert(allMatchMembers)

    if (insertMembersError) {
      console.error('새 매치 멤버 생성 오류:', insertMembersError)
      return false
    }

    // 6. 새로운 통계 적용 (새로운 승패 결과 반영)
    console.log('📊 새로운 통계 적용 시작')
    
    // MVP 계산을 위한 Match 객체 생성
    const matchForMVP = {
      id: existingMatch.id,
      sessionId: sessionId,
      team1: { members: matchData.team1 },
      team2: { members: matchData.team2 },
      winner: matchData.winningTeam,
      createdAt: new Date()
    }
    const newMvpMemberId = calculateMatchMVP(matchForMVP as any)

    // MVP 정보도 업데이트
    if (newMvpMemberId !== existingMatch.mvpMemberId) {
      await (supabase as any)
        .from('matches')
        .update({ mvp_member_id: newMvpMemberId })
        .eq('session_id', sessionId)
    }

    const newTeam1Winners = matchData.winningTeam === 'team1'
    const newTeam2Winners = matchData.winningTeam === 'team2'
    const updateErrors: string[] = []

    // 새로운 team1 멤버들의 통계 적용
    for (const member of matchData.team1) {
      const isWinner = newTeam1Winners
      const isMVP = member.memberId === newMvpMemberId
      const result = await updateMemberStats(member.memberId, member.position, isWinner, isMVP)
      if (!result.success) {
        updateErrors.push(`NewTeam1 ${member.memberId}: ${result.error}`)
      }
    }

    // 새로운 team2 멤버들의 통계 적용
    for (const member of matchData.team2) {
      const isWinner = newTeam2Winners
      const isMVP = member.memberId === newMvpMemberId
      const result = await updateMemberStats(member.memberId, member.position, isWinner, isMVP)
      if (!result.success) {
        updateErrors.push(`NewTeam2 ${member.memberId}: ${result.error}`)
      }
    }
    
    if (updateErrors.length > 0) {
      console.error('❌ 새로운 통계 적용 일부 실패:', updateErrors)
      return false // 업데이트 실패 시 중단
    }
    console.log('✅ 새로운 통계 적용 완료')

    console.log('✅ 매치 업데이트 및 통계 갱신 완룼 완료')
    
    // 최종 검증: 업데이트된 통계 확인
    console.log('🔍 최종 통계 검증 시작')
    let finalValidation = true
    
    for (const member of [...matchData.team1, ...matchData.team2]) {
      try {
        const { data: updatedMember, error } = await supabase
          .from('team_members')
          .select('total_wins, total_losses, tier_score, nickname')
          .eq('id', member.memberId)
          .single()
          
        if (error || !updatedMember) {
          console.error(`⚠️ 최종 검증 실패 - ${member.memberId}:`, error)
          finalValidation = false
        } else {
          console.log(`✅ ${(updatedMember as any).nickname}: W${(updatedMember as any).total_wins} L${(updatedMember as any).total_losses} TS:${Math.round((updatedMember as any).tier_score)}`)
        }
      } catch (error) {
        console.error(`⚠️ 최종 검증 예외 - ${member.memberId}:`, error)
        finalValidation = false
      }
    }
    
    if (finalValidation) {
      console.log('✅ 모든 멤버 통계 업데이트 최종 확인 완료')
    } else {
      console.error('⚠️ 일부 멤버 통계 검증에 문제가 있습니다')
    }
    
    return true
  } catch (error) {
    console.error('❌ 매치 업데이트 중 예외:', error)
    return false
  }
}

export const updateMatchByMatchId = async (
  matchId: string,
  matchData: {
    winningTeam: 'team1' | 'team2'
    team1: Array<{
      memberId: string
      champion: string
      position: Position
      kills: number
      deaths: number
      assists: number
    }>
    team2: Array<{
      memberId: string
      champion: string
      position: Position
      kills: number
      deaths: number
      assists: number
    }>
  }
): Promise<boolean> => {
  try {
    console.log('🔄 매치 ID로 경기 업데이트 시작:', matchId)
    
    // 모든 멤버 ID 검증
    const allMemberIds = [...matchData.team1, ...matchData.team2].map(player => player.memberId)
    const memberValidation = await validateMemberIds(allMemberIds)
    
    if (memberValidation.invalid.length > 0) {
      console.error('❌ 잘못된 멤버 ID가 발견됨:', memberValidation.invalid)
      return false
    }
    
    console.log('✅ 모든 멤버 ID 검증 완료:', { validCount: memberValidation.valid.length })
    
    // 1. 기존 매치 정보 조회
    const { data: existingMatch, error: fetchError } = await (supabase as any)
      .from('matches')
      .select(`
        id,
        winner,
        mvp_member_id,
        match_members (
          team_member_id,
          team_side,
          position,
          champion,
          kills,
          deaths,
          assists
        )
      `)
      .eq('id', matchId)
      .single()

    if (fetchError || !existingMatch) {
      console.error('업데이트할 매치를 찾을 수 없습니다:', fetchError)
      return false
    }

    console.log('기존 매치 정보:', existingMatch)

    // 2. 기존 통계 롤백 (기존 승패 결과를 되돌림)
    console.log('🔄 기존 통계 롤백 시작')
    const oldWinner = existingMatch.winner
    const rollbackErrors: string[] = []

    // 기존 멤버들의 통계 롤백
    for (const member of existingMatch.match_members) {
      const wasWinner = (member.team_side === 'team1' && oldWinner === 'team1') || 
                       (member.team_side === 'team2' && oldWinner === 'team2')
      const wasMVP = member.team_member_id === existingMatch.mvp_member_id
      const result = await rollbackMemberStats(member.team_member_id, member.position, wasWinner, wasMVP)
      if (!result.success) {
        rollbackErrors.push(`${member.team_side} ${member.team_member_id}: ${result.error}`)
      }
    }
    
    if (rollbackErrors.length > 0) {
      console.error('❌ 기존 통계 롤백 일부 실패:', rollbackErrors)
      return false // 롤백 실패 시 중단
    }
    console.log('✅ 기존 통계 롤백 완료')

    // 3. MVP 계산
    const matchForMVP = {
      id: matchId,
      team1: { members: matchData.team1 },
      team2: { members: matchData.team2 },
      winner: matchData.winningTeam,
      createdAt: new Date()
    }
    const mvpMemberId = calculateMatchMVP(matchForMVP as any)

    // 4. 매치 테이블 업데이트 (승리팀과 MVP)
    const { error: matchUpdateError } = await (supabase as any)
      .from('matches')
      .update({
        winner: matchData.winningTeam,
        mvp_member_id: mvpMemberId
      })
      .eq('id', matchId)

    if (matchUpdateError) {
      console.error('매치 업데이트 오류:', matchUpdateError)
      return false
    }

    // 5. 기존 match_members 삭제
    const { error: deleteMembersError } = await (supabase as any)
      .from('match_members')
      .delete()
      .eq('match_id', matchId)

    if (deleteMembersError) {
      console.error('기존 매치 멤버 삭제 오류:', deleteMembersError)
      return false
    }

    // 6. 새로운 match_members 생성
    const allMatchMembers = [
      ...matchData.team1.map(player => ({
        match_id: matchId,
        team_member_id: player.memberId,
        team_side: 'team1' as const,
        position: player.position,
        champion: player.champion,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists
      })),
      ...matchData.team2.map(player => ({
        match_id: matchId,
        team_member_id: player.memberId,
        team_side: 'team2' as const,
        position: player.position,
        champion: player.champion,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists
      }))
    ]

    const { error: insertMembersError } = await (supabase as any)
      .from('match_members')
      .insert(allMatchMembers)

    if (insertMembersError) {
      console.error('새로운 매치 멤버 생성 오류:', insertMembersError)
      return false
    }

    // 7. 새로운 통계 적용
    console.log('🔄 새로운 통계 적용 시작')
    const team1Winners = matchData.winningTeam === 'team1'
    const team2Winners = matchData.winningTeam === 'team2'
    const statUpdateErrors: string[] = []

    for (const player of matchData.team1) {
      const isWinner = team1Winners
      const isMVP = player.memberId === mvpMemberId
      const result = await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
      if (!result.success) {
        statUpdateErrors.push(`Team1 ${player.memberId}: ${result.error}`)
      }
    }

    for (const player of matchData.team2) {
      const isWinner = team2Winners
      const isMVP = player.memberId === mvpMemberId
      const result = await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
      if (!result.success) {
        statUpdateErrors.push(`Team2 ${player.memberId}: ${result.error}`)
      }
    }

    if (statUpdateErrors.length > 0) {
      console.error('⚠️ 일부 멤버 통계 업데이트 실패:', statUpdateErrors)
    } else {
      console.log('✅ 모든 멤버 통계 업데이트 완료')
    }

    console.log('✅ 매치 ID로 경기 업데이트 완료')
    return true
    
  } catch (error) {
    console.error('매치 업데이트 중 예외:', error)
    return false
  }
}