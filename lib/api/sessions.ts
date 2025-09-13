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

export const saveMatchResult = async (matchData: {
  sessionId: string
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
    // 입력값 검증
    const validatedSessionId = validateUUID(matchData.sessionId)
    const validatedTeamId = validateUUID(matchData.teamId)
    
    if (!validatedSessionId || !validatedTeamId) {
      console.error('매치 결과 저장 입력값 검증 실패')
      return false
    }

    // MVP 계산을 위한 Match 객체 생성
    const matchForMVP = {
      id: 'temp-match-for-mvp',
      sessionId: validatedSessionId,
      team1: { members: matchData.team1 },
      team2: { members: matchData.team2 },
      winner: matchData.winningTeam,
      createdAt: new Date()
    }
    const mvpMemberId = calculateMatchMVP(matchForMVP as any)

    // 매치 결과 저장 (실제 데이터베이스 스키마에 맞춤)
    const matchResult = {
      session_id: validatedSessionId,
      team_id: validatedTeamId,
      winner: matchData.winningTeam, // winning_team → winner
      mvp_member_id: mvpMemberId, // MVP 멤버 ID 저장
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
    const team1Winners = matchData.winningTeam === 'team1'
    const team2Winners = matchData.winningTeam === 'team2'

    for (const player of matchData.team1) {
      const isWinner = team1Winners
      const isMVP = player.memberId === mvpMemberId
      await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
    }

    for (const player of matchData.team2) {
      const isWinner = team2Winners
      const isMVP = player.memberId === mvpMemberId
      await updateMemberStats(player.memberId, player.position, isWinner, isMVP)
    }

    return true
  } catch (error) {
    console.error('매치 결과 저장 중 예외:', error)
    return false
  }
}

const updateMemberStats = async (
  memberId: string,
  position: Position,
  isWinner: boolean,
  isMVP: boolean
): Promise<void> => {
  try {
    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      console.error('멤버 통계 업데이트용 정보 조회 오류:', memberError)
      return
    }

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
      totalWins: updates.total_wins || memberData.total_wins,
      totalLosses: updates.total_losses || memberData.total_losses,
      mainPositionGames: updates.main_position_games || memberData.main_position_games,
      mainPositionWins: updates.main_position_wins || memberData.main_position_wins,
      subPositionGames: updates.sub_position_games || memberData.sub_position_games,
      subPositionWins: updates.sub_position_wins || memberData.sub_position_wins
    }

    updates.tier_score = calculateTierScore(memberData.tier as TierType, newStats)

    // 통계 업데이트 실행
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update(updates)
      .eq('id', memberId)

    if (updateError) {
      console.error('멤버 통계 업데이트 오류:', updateError)
    }
  } catch (error) {
    console.error('멤버 통계 업데이트 중 예외:', error)
  }
}

export const getMatchesByTeamId = async (teamId: string): Promise<Match[]> => {
  try {
    // 먼저 매치 정보와 매치 멤버들을 조인하여 조회
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        session_id,
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
        sessionId: match.session_id,
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
    // 세션 ID로 매치와 매치 멤버들을 조인하여 조회
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        id,
        session_id,
        team_id,
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
      .eq('session_id', sessionId)
      .single()

    if (error || !match) {
      console.log('매치 조회 결과 없음:', error)
      return null
    }

    // 데이터를 Match 타입에 맞게 변환
    const matchData = match as any
    const team1Members = matchData.match_members
      ?.filter((member: any) => member.team_side === 'team1')
      .map((member: any) => ({
        memberId: member.team_member_id,
        position: member.position,
        champion: member.champion,
        kills: member.kills || 0,
        deaths: member.deaths || 0,
        assists: member.assists || 0
      })) || []

    const team2Members = matchData.match_members
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
      id: matchData.id,
      teamId: matchData.team_id || '',
      sessionId: matchData.session_id,
      team1: { members: team1Members },
      team2: { members: team2Members },
      winner: matchData.winner as 'team1' | 'team2',
      mvpMemberId: matchData.mvp_member_id || undefined,
      createdAt: new Date(matchData.created_at)
    } as any
  } catch (error) {
    console.error('매치 조회 중 예외:', error)
    return null
  }
}

export const deleteMatchResult = async (matchId: string): Promise<boolean> => {
  try {
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
      console.error('매치 정보 조회 오류:', matchError)
      return false
    }

    // 플레이어 통계 롤백
    const matchData = match as any
    const matchMembers = matchData.match_members || []
    
    for (const member of matchMembers) {
      const memberInfo = member as any
      const isWinner = (memberInfo.team_side === 'team1' && matchData.winner === 'team1') || 
                      (memberInfo.team_side === 'team2' && matchData.winner === 'team2')
      const isMVP = false // MVP 기능 비활성화
      
      await rollbackMemberStats(memberInfo.team_member_id, memberInfo.position, isWinner, isMVP)
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

    return true
  } catch (error) {
    console.error('매치 삭제 중 예외:', error)
    return false
  }
}

const rollbackMemberStats = async (
  memberId: string,
  position: Position,
  wasWinner: boolean,
  wasMVP: boolean
): Promise<void> => {
  try {
    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      console.error('멤버 통계 롤백용 정보 조회 오류:', memberError)
      return
    }

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

    updates.tier_score = calculateTierScore(memberData.tier as TierType, newStats)

    // 통계 롤백 실행
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update(updates)
      .eq('id', memberId)

    if (updateError) {
      console.error('멤버 통계 롤백 오류:', updateError)
    }
  } catch (error) {
    console.error('멤버 통계 롤백 중 예외:', error)
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