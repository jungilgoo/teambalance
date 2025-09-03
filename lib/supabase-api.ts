import { createSupabaseBrowser } from './supabase'
import { Team, TeamMember, User, TierType, Position, Match, TeamInvite, InviteLink, MemberStats } from './types'
import { calculateTierScore, calculateMatchMVP } from './stats'
import { validateSearchQuery, validateString, validateEmail, validateUsername, validateTeamName, validateUUID, validateInteger, validatePosition, validateTier } from './input-validator'
import type { Database } from './database.types'

const supabase = createSupabaseBrowser()

// ============================================================================
// 팀 관련 API 함수들
// ============================================================================

export const getTeamById = async (teamId: string): Promise<Team | null> => {
  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error) {
      console.error('팀 조회 오류:', error)
      return null
    }

    return {
      id: team.id,
      name: team.name,
      leaderId: team.leader_id,
      description: team.description,
      isPublic: team.is_public,
      memberCount: team.member_count,
      createdAt: new Date(team.created_at)
    }
  } catch (error) {
    console.error('팀 조회 중 예외:', error)
    return null
  }
}

export const createTeam = async (
  name: string,
  leaderId: string,
  description?: string,
  isPublic: boolean = true
): Promise<Team | null> => {
  try {
    // 입력값 검증
    const validatedName = validateTeamName(name)
    const validatedLeaderId = validateUUID(leaderId)
    const validatedDescription = description ? validateString(description, 200, true) : null

    if (!validatedName || !validatedLeaderId) {
      console.error('팀 생성 실패: 입력값 검증 오류', { name, leaderId })
      return null
    }

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name: validatedName,
        leader_id: validatedLeaderId,
        description: validatedDescription,
        is_public: isPublic
      })
      .select('*')
      .single()

    if (error) {
      console.error('팀 생성 오류:', error)
      return null
    }

    return {
      id: team.id,
      name: team.name,
      leaderId: team.leader_id,
      description: team.description,
      isPublic: team.is_public,
      memberCount: team.member_count,
      createdAt: new Date(team.created_at)
    }
  } catch (error) {
    console.error('팀 생성 중 예외:', error)
    return null
  }
}

export const getPublicTeams = async (): Promise<Team[]> => {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('공개 팀 목록 조회 오류:', error)
      return []
    }

    return teams.map(team => ({
      id: team.id,
      name: team.name,
      leaderId: team.leader_id,
      description: team.description,
      isPublic: team.is_public,
      memberCount: team.member_count,
      createdAt: new Date(team.created_at)
    }))
  } catch (error) {
    console.error('공개 팀 목록 조회 중 예외:', error)
    return []
  }
}

export const searchPublicTeams = async (searchQuery: string): Promise<Team[]> => {
  try {
    // SQL Injection 방지: 전용 검증 함수 사용
    const validatedQuery = validateSearchQuery(searchQuery, 50)
    
    if (!validatedQuery) {
      return []
    }

    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_public', true)
      .ilike('name', `%${validatedQuery}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('공개 팀 검색 오류:', error)
      return []
    }

    return teams.map(team => ({
      id: team.id,
      name: team.name,
      leaderId: team.leader_id,
      description: team.description,
      isPublic: team.is_public,
      memberCount: team.member_count,
      createdAt: new Date(team.created_at)
    }))
  } catch (error) {
    console.error('공개 팀 검색 중 예외:', error)
    return []
  }
}

export const joinPublicTeam = async (
  teamId: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[]
): Promise<boolean> => {
  try {
    // 1. 이미 해당 팀의 활성 멤버인지 확인 (추방된 멤버는 재참가 가능)
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .in('status', ['active', 'pending'])
      .single()

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('멤버 중복 확인 오류:', memberCheckError)
      throw new Error('멤버 중복 확인 중 오류가 발생했습니다.')
    }

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('이미 해당 팀의 활성 멤버입니다.')
      } else if (existingMember.status === 'pending') {
        throw new Error('이미 해당 팀에 참가 신청이 진행 중입니다.')
      }
    }

    // 2. 팀이 공개 팀인지 확인
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('is_public')
      .eq('id', teamId)
      .single()

    if (teamError) {
      console.error('팀 확인 오류:', teamError)
      throw new Error('팀을 찾을 수 없습니다.')
    }

    if (!team.is_public) {
      throw new Error('비공개 팀입니다. 초대 코드를 사용해주세요.')
    }

    // 3. 추방된 멤버가 재참가하는지 확인
    const { data: kickedMember, error: kickedCheckError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'kicked')
      .single()

    if (kickedCheckError && kickedCheckError.code !== 'PGRST116') {
      console.error('추방 멤버 확인 오류:', kickedCheckError)
      throw new Error('멤버 상태 확인 중 오류가 발생했습니다.')
    }

    let result: TeamMember | null = null

    if (kickedMember) {
      // 추방된 멤버 재참가: 기존 레코드를 승인 대기 상태로 업데이트
      const tierScore = calculateTierScore(tier, {
        totalWins: 0,
        totalLosses: 0,
        mainPositionGames: 0,
        mainPositionWins: 0,
        subPositionGames: 0,
        subPositionWins: 0
      })

      const { data: updatedMember, error: updateError } = await supabase
        .from('team_members')
        .update({
          status: 'pending',  // 승인 대기 상태로 변경
          nickname,
          tier,
          main_position: mainPosition,
          sub_position: subPositions[0] || 'adc',
          tier_score: tierScore,
          joined_at: new Date().toISOString(),
          approved_at: null,  // 승인 시간 초기화
          rejected_at: null,  // 거절 시간 초기화
          rejection_reason: null  // 거절 사유 초기화
        })
        .eq('id', kickedMember.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('추방 멤버 재참가 처리 오류:', updateError)
        throw new Error('재참가 처리 중 오류가 발생했습니다.')
      }

      result = {
        id: updatedMember.id,
        teamId: updatedMember.team_id,
        userId: updatedMember.user_id,
        role: updatedMember.role as 'leader' | 'member',
        joinedAt: new Date(updatedMember.joined_at),
        nickname: updatedMember.nickname,
        tier: updatedMember.tier as TierType,
        mainPosition: updatedMember.main_position as Position,
        subPositions: [updatedMember.sub_position],
        stats: {
          totalWins: updatedMember.total_wins,
          totalLosses: updatedMember.total_losses,
          mainPositionGames: updatedMember.main_position_games,
          mainPositionWins: updatedMember.main_position_wins,
          subPositionGames: updatedMember.sub_position_games,
          subPositionWins: updatedMember.sub_position_wins,
          tierScore: updatedMember.tier_score,
          mvpCount: 0,
          currentStreak: 0
        },
        status: 'pending' as const,
        joinType: 'public' as const
      }
    } else {
      // 새 멤버 참가: 승인 대기 상태로 새 레코드 생성
      result = await addTeamMember(
        teamId,
        userId,
        nickname,
        tier,
        mainPosition,
        subPositions,
        'member',
        'pending'
      )
    }

    if (!result) {
      throw new Error('팀 참가에 실패했습니다.')
    }

    // 4. 승인 대기 상태에서는 멤버 수를 증가시키지 않음
    // 멤버 수는 승인 시에 approveJoinRequest에서 증가

    return true
  } catch (error: any) {
    console.error('공개 팀 참가 실패:', error)
    throw error
  }
}

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const uniqueTeams = new Map()
    
    // 1. 사용자가 활성 멤버로 속한 팀 조회 (추방된 멤버 제외)
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select(`
        teams!inner(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (memberError) {
      console.error('사용자 멤버 팀 목록 조회 오류:', memberError)
    } else {
      memberTeams?.forEach(item => {
        const team = (item as any).teams
        if (team && !uniqueTeams.has(team.id)) {
          uniqueTeams.set(team.id, {
            id: team.id,
            name: team.name,
            leaderId: team.leader_id,
            description: team.description,
            isPublic: team.is_public,
            memberCount: team.member_count,
            createdAt: new Date(team.created_at)
          })
        }
      })
    }

    // 2. 사용자가 리더인 팀도 별도로 조회 (리더는 항상 팀에 접근 가능)
    const { data: leaderTeams, error: leaderError } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', userId)
      .order('created_at', { ascending: false })

    if (leaderError) {
      console.error('사용자 리더 팀 목록 조회 오류:', leaderError)
    } else {
      leaderTeams?.forEach(team => {
        if (!uniqueTeams.has(team.id)) {
          uniqueTeams.set(team.id, {
            id: team.id,
            name: team.name,
            leaderId: team.leader_id,
            description: team.description,
            isPublic: team.is_public,
            memberCount: team.member_count,
            createdAt: new Date(team.created_at)
          })
        }
      })
    }

    return Array.from(uniqueTeams.values())
  } catch (error) {
    console.error('사용자 팀 목록 조회 중 예외:', error)
    return []
  }
}

// ============================================================================
// 팀 멤버 관련 API 함수들 (승인 시스템 포함)
// ============================================================================

// 팀 참가 요청 (하이브리드 방식)
export const requestToJoinTeam = async (
  teamId: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[],
  joinType: 'invite' | 'public' = 'public'
): Promise<{ success: boolean; status: 'active' | 'pending'; message: string }> => {
  try {
    // 이미 참가했거나 요청한 적이 있는지 확인
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error('멤버 확인 중 오류가 발생했습니다.')
    }

    if (existingMember) {
      if (existingMember.status === 'active') {
        return { success: false, status: 'active', message: '이미 팀에 참가했습니다.' }
      } else if (existingMember.status === 'pending') {
        return { success: false, status: 'pending', message: '이미 참가 요청을 보냈습니다. 승인을 기다리고 있습니다.' }
      } else if (existingMember.status === 'rejected') {
        return { success: false, status: 'pending', message: '이전에 참가 요청이 거절되었습니다.' }
      }
    }

    // 초기 통계 데이터
    const initialStats = {
      total_wins: 0,
      total_losses: 0,
      main_position_games: 0,
      main_position_wins: 0,
      sub_position_games: 0,
      sub_position_wins: 0,
      tier_score: 0
    }

    // 참가 방식에 따라 상태 결정
    const status = joinType === 'invite' ? 'active' : 'pending'
    const approvedAt = joinType === 'invite' ? new Date().toISOString() : null

    // 팀 멤버 추가
    const { data: newMember, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        nickname,
        tier,
        main_position: mainPosition,
        sub_positions: subPositions,
        role: 'member',
        stats: initialStats,
        status,
        join_type: joinType,
        approved_at: approvedAt
      })
      .select()
      .single()

    if (error) {
      throw new Error(`팀 참가 요청 실패: ${error.message}`)
    }

    // 활성 멤버인 경우에만 팀 멤버 수 업데이트
    if (status === 'active') {
      await updateTeamMemberCount(teamId)
    }

    const message = joinType === 'invite' 
      ? '팀 참가가 완료되었습니다!' 
      : '참가 요청을 보냈습니다. 팀 리더의 승인을 기다리고 있습니다.'

    return { success: true, status, message }
  } catch (error: any) {
    console.error('팀 참가 요청 오류:', error)
    return { success: false, status: 'pending', message: error.message || '팀 참가 요청에 실패했습니다.' }
  }
}

// 승인 대기 중인 요청 조회 (리더용)
export const getPendingJoinRequests = async (teamId: string): Promise<TeamMember[]> => {
  try {
    const { data: requests, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('승인 대기 요청 조회 오류:', error)
      return []
    }

    return requests.map(member => ({
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.nickname,
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: member.sub_positions as Position[],
      stats: member.stats as MemberStats,
      status: member.status as 'pending' | 'active' | 'rejected',
      joinType: member.join_type as 'invite' | 'public',
      approvedBy: member.approved_by,
      approvedAt: member.approved_at ? new Date(member.approved_at) : undefined,
      rejectedAt: member.rejected_at ? new Date(member.rejected_at) : undefined,
      rejectionReason: member.rejection_reason
    }))
  } catch (error) {
    console.error('승인 대기 요청 조회 중 예외:', error)
    return []
  }
}

// 참가 요청 승인
export const approveJoinRequest = async (
  teamId: string, 
  userId: string, 
  approverId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        status: 'active',
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) {
      throw new Error(`참가 승인 실패: ${error.message}`)
    }

    // 팀 멤버 수 업데이트
    await updateTeamMemberCount(teamId)

    return { success: true, message: '참가 요청을 승인했습니다.' }
  } catch (error: any) {
    console.error('참가 승인 오류:', error)
    return { success: false, message: error.message || '참가 승인에 실패했습니다.' }
  }
}

// 참가 요청 거절
export const rejectJoinRequest = async (
  teamId: string,
  userId: string,
  approverId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        status: 'rejected',
        approved_by: approverId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || '리더에 의해 거절됨'
      })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error) {
      throw new Error(`참가 거절 실패: ${error.message}`)
    }

    return { success: true, message: '참가 요청을 거절했습니다.' }
  } catch (error: any) {
    console.error('참가 거절 오류:', error)
    return { success: false, message: error.message || '참가 거절에 실패했습니다.' }
  }
}

// 팀 멤버 추방
export const kickTeamMember = async (
  teamId: string,
  userId: string,
  kickedBy: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 리더 자신을 추방하는 것 방지
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('leader_id')
      .eq('id', teamId)
      .single()

    if (teamError) {
      throw new Error('팀 정보를 찾을 수 없습니다.')
    }

    if (team.leader_id === userId) {
      return { success: false, message: '팀 리더는 추방할 수 없습니다.' }
    }

    // 추방 권한 확인 (리더만 추방 가능)
    if (team.leader_id !== kickedBy) {
      return { success: false, message: '팀 리더만 멤버를 추방할 수 있습니다.' }
    }

    // 멤버가 실제로 팀에 속해있는지 확인
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('nickname')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (memberError || !member) {
      return { success: false, message: '해당 멤버를 찾을 수 없습니다.' }
    }

    // 멤버 상태를 '추방됨'으로 변경 (완전 삭제 대신 기록 보존)
    const { error: kickError } = await supabase
      .from('team_members')
      .update({
        status: 'kicked',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || `팀 리더에 의해 추방됨`,
        approved_by: kickedBy
      })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')

    if (kickError) {
      throw new Error(`멤버 추방 실패: ${kickError.message}`)
    }

    // 팀 멤버 수 업데이트
    await updateTeamMemberCount(teamId)

    return { success: true, message: `${member.nickname}님을 팀에서 추방했습니다.` }
  } catch (error: any) {
    console.error('멤버 추방 오류:', error)
    return { success: false, message: error.message || '멤버 추방에 실패했습니다.' }
  }
}

// 팀 멤버 수 업데이트 헬퍼 함수
const updateTeamMemberCount = async (teamId: string): Promise<void> => {
  try {
    const { count, error } = await supabase
      .from('team_members')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (error) {
      console.error('활성 멤버 수 계산 오류:', error)
      return
    }

    await supabase
      .from('teams')
      .update({ member_count: count || 0 })
      .eq('id', teamId)
  } catch (error) {
    console.error('팀 멤버 수 업데이트 오류:', error)
  }
}

// ============================================================================
// 기존 팀 멤버 관련 API 함수들
// ============================================================================

export const getTeamMembers = async (
  teamId: string, 
  includeStatus: 'active' | 'all' = 'active'
): Promise<TeamMember[]> => {
  try {
    let query = supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)

    // 상태 필터링
    if (includeStatus === 'active') {
      query = query.eq('status', 'active')
    }

    const { data: members, error } = await query.order('joined_at', { ascending: true })

    if (error) {
      console.error('팀 멤버 조회 오류:', error)
      return []
    }

    return members.map(member => ({
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.nickname,
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: member.sub_positions || [member.sub_position], // 다중 또는 단일 서브 포지션 처리
      stats: member.stats || {
        // 새로운 stats 구조 또는 기존 구조 처리
        totalWins: member.total_wins || 0,
        totalLosses: member.total_losses || 0,
        mainPositionGames: member.main_position_games || 0,
        mainPositionWins: member.main_position_wins || 0,
        subPositionGames: member.sub_position_games || 0,
        subPositionWins: member.sub_position_wins || 0,
        tierScore: member.tier_score || 0
      },
      // 승인 시스템 필드
      status: member.status || 'active',
      joinType: member.join_type || 'invite',
      approvedBy: member.approved_by,
      approvedAt: member.approved_at ? new Date(member.approved_at) : undefined,
      rejectedAt: member.rejected_at ? new Date(member.rejected_at) : undefined,
      rejectionReason: member.rejection_reason
    }))
  } catch (error) {
    console.error('팀 멤버 조회 중 예외:', error)
    return []
  }
}

export const addTeamMember = async (
  teamId: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[],
  role: 'leader' | 'member' = 'member',
  status: 'active' | 'pending' = 'active'
): Promise<TeamMember | null> => {
  try {
    const tierScore = calculateTierScore(tier, {
      totalWins: 0,
      totalLosses: 0,
      mainPositionGames: 0,
      mainPositionWins: 0,
      subPositionGames: 0,
      subPositionWins: 0
    })

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        nickname,
        tier,
        main_position: mainPosition,
        sub_position: subPositions[0] || 'adc', // 첫 번째 서브 포지션만 저장
        tier_score: tierScore,
        status: status
      })
      .select('*')
      .single()

    if (error) {
      console.error('팀 멤버 추가 오류:', error)
      return null
    }

    return {
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.nickname,
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: [member.sub_position], // 단일 서브 포지션을 배열로 변환
      stats: {
        totalWins: member.total_wins,
        totalLosses: member.total_losses,
        mainPositionGames: member.main_position_games,
        mainPositionWins: member.main_position_wins,
        subPositionGames: member.sub_position_games,
        subPositionWins: member.sub_position_wins,
        tierScore: member.tier_score
      }
    }
  } catch (error) {
    console.error('팀 멤버 추가 중 예외:', error)
    return null
  }
}

export const updateMemberTier = async (memberId: string, newTier: TierType): Promise<boolean> => {
  try {
    // 현재 멤버 정보 가져오기
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      console.error('멤버 정보 조회 오류:', fetchError)
      return false
    }

    // 새 티어 점수 계산
    const stats: MemberStats = {
      totalWins: member.total_wins,
      totalLosses: member.total_losses,
      mainPositionGames: member.main_position_games,
      mainPositionWins: member.main_position_wins,
      subPositionGames: member.sub_position_games,
      subPositionWins: member.sub_position_wins,
      tierScore: member.tier_score
    }

    const newTierScore = calculateTierScore(newTier, stats)

    // 업데이트
    const { error: updateError } = await supabase
      .from('team_members')
      .update({
        tier: newTier,
        tier_score: newTierScore
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('멤버 티어 업데이트 오류:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('멤버 티어 업데이트 중 예외:', error)
    return false
  }
}

export const updateMemberPositions = async (
  memberId: string, 
  mainPosition: Position, 
  subPositions: Position[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        main_position: mainPosition,
        sub_position: subPositions[0] || 'adc' // 첫 번째 서브 포지션만 저장
      })
      .eq('id', memberId)

    if (error) {
      console.error('멤버 포지션 업데이트 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('멤버 포지션 업데이트 중 예외:', error)
    return false
  }
}

// ============================================================================
// 초대 관련 API 함수들
// ============================================================================

export const generateInviteCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const createTeamInvite = async (
  teamId: string,
  createdBy: string,
  maxUses?: number,
  expiresInHours: number = 24
): Promise<TeamInvite | null> => {
  try {
    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    const { data: invite, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        created_by: createdBy,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses
      })
      .select('*')
      .single()

    if (error) {
      console.error('팀 초대 생성 오류:', error)
      return null
    }

    return {
      id: invite.id,
      teamId: invite.team_id,
      createdBy: invite.created_by,
      inviteCode: invite.invite_code,
      expiresAt: new Date(invite.expires_at),
      createdAt: new Date(invite.created_at),
      maxUses: invite.max_uses,
      currentUses: invite.current_uses,
      isActive: invite.is_active
    }
  } catch (error) {
    console.error('팀 초대 생성 중 예외:', error)
    return null
  }
}

export const getTeamByInviteCode = async (inviteCode: string): Promise<InviteLink | null> => {
  try {
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select(`
        *,
        teams (id, name, description),
        profiles!team_invites_created_by_fkey (name)
      `)
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      console.error('초대 코드 조회 오류:', error)
      return null
    }

    // 만료 확인
    if (new Date() > new Date(invite.expires_at)) {
      return null
    }

    // 사용 횟수 확인
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      return null
    }

    const team = invite.teams as any
    const inviter = invite.profiles as any

    return {
      inviteCode: invite.invite_code,
      teamName: team.name,
      teamDescription: team.description,
      inviterName: inviter.name,
      expiresAt: new Date(invite.expires_at)
    }
  } catch (error) {
    console.error('초대 코드 확인 중 예외:', error)
    return null
  }
}

export const joinTeamByInviteCode = async (
  inviteCode: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[]
): Promise<boolean> => {
  try {
    // 초대 정보 조회
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      throw new Error('유효하지 않은 초대 코드입니다.')
    }

    // 만료 및 사용 횟수 확인
    if (new Date() > new Date(invite.expires_at)) {
      throw new Error('만료된 초대 링크입니다.')
    }
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      throw new Error('초대 링크 사용 한도를 초과했습니다.')
    }

    // 이미 팀에 속해있는지 확인
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', invite.team_id)
      .single()

    if (existingMember) {
      throw new Error('이미 이 팀의 멤버입니다.')
    }

    // 새 멤버 추가
    const newMember = await addTeamMember(
      invite.team_id,
      userId,
      nickname,
      tier,
      mainPosition,
      subPositions
    )

    if (!newMember) {
      throw new Error('팀 참가에 실패했습니다.')
    }

    // 초대 사용 횟수 증가
    await supabase
      .from('team_invites')
      .update({ current_uses: invite.current_uses + 1 })
      .eq('id', invite.id)

    console.log('팀 참가 성공:', nickname)
    return true
  } catch (error) {
    console.error('팀 참가 중 오류:', error)
    throw error
  }
}

export const getTeamInvites = async (teamId: string): Promise<TeamInvite[]> => {
  try {
    const { data: invites, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('팀 초대 목록 조회 오류:', error)
      return []
    }

    return invites.map(invite => ({
      id: invite.id,
      teamId: invite.team_id,
      createdBy: invite.created_by,
      inviteCode: invite.invite_code,
      expiresAt: new Date(invite.expires_at),
      createdAt: new Date(invite.created_at),
      maxUses: invite.max_uses,
      currentUses: invite.current_uses,
      isActive: invite.is_active
    }))
  } catch (error) {
    console.error('팀 초대 목록 조회 중 예외:', error)
    return []
  }
}

// ============================================================================
// 세션 관련 API 함수들
// ============================================================================

export const createSession = async (
  teamId: string,
  createdBy: string,
  selectedMembers: string[],
  team1Members?: any[],
  team2Members?: any[]
): Promise<string | null> => {
  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        team_id: teamId,
        created_by: createdBy,
        status: 'preparing',
        selected_members: selectedMembers,
        team1_members: team1Members || [],
        team2_members: team2Members || []
      })
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
    selectedMembers?: string[]
    team1Members?: any[]
    team2Members?: any[]
  }
): Promise<boolean> => {
  try {
    const updateData: any = {}
    
    if (updates.status) updateData.status = updates.status
    if (updates.selectedMembers) updateData.selected_members = updates.selectedMembers
    if (updates.team1Members) updateData.team1_members = updates.team1Members
    if (updates.team2Members) updateData.team2_members = updates.team2Members

    const { error } = await supabase
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

    return {
      id: session.id,
      teamId: session.team_id,
      createdBy: session.created_by,
      status: session.status as 'preparing' | 'in_progress' | 'completed',
      selectedMembers: session.selected_members as string[] || [],
      team1Members: session.team1_members as any[] || [],
      team2Members: session.team2_members as any[] || [],
      createdAt: new Date(session.created_at)
    }
  } catch (error) {
    console.error('세션 조회 중 예외:', error)
    return null
  }
}

// ============================================================================
// 경기 결과 관련 API 함수들
// ============================================================================

export const updateSessionResult = async (
  sessionId: string,
  resultData: {
    team1Members: Array<{
      memberId: string
      position: string
      champion: string
      kills: number
      deaths: number
      assists: number
    }>
    team2Members: Array<{
      memberId: string
      position: string
      champion: string
      kills: number
      deaths: number
      assists: number
    }>
    winner: 'team1' | 'team2'
  }
): Promise<boolean> => {
  try {
    console.log('경기 결과 업데이트 시작:', sessionId, resultData)

    // 세션 상태를 완료로 변경하고 경기 결과 저장 (승리 팀 정보는 team1_members, team2_members에 포함)
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        team1_members: resultData.team1Members.map(member => ({
          ...member,
          isWinner: resultData.winner === 'team1'
        })),
        team2_members: resultData.team2Members.map(member => ({
          ...member,
          isWinner: resultData.winner === 'team2'
        }))
      })
      .eq('id', sessionId)

    if (error) {
      console.error('세션 결과 업데이트 오류:', error)
      return false
    }

    console.log('경기 결과 업데이트 완료')
    return true
  } catch (error) {
    console.error('세션 결과 업데이트 중 예외:', error)
    return false
  }
}

export const saveMatchResult = async (matchData: {
  sessionId: string
  teamId: string
  team1Members: Array<{
    memberId: string
    position: Position
    champion: string
    kills: number
    deaths: number
    assists: number
  }>
  team2Members: Array<{
    memberId: string
    position: Position
    champion: string
    kills: number
    deaths: number
    assists: number
  }>
  winner: 'team1' | 'team2'
}): Promise<string | null> => {
  try {
    // Match 객체 구성 (MVP 계산용)
    const matchForMVP: Match = {
      id: 'temp', // 임시 ID
      sessionId: matchData.sessionId,
      team1: { members: matchData.team1Members },
      team2: { members: matchData.team2Members },
      winner: matchData.winner,
      createdAt: new Date()
    }

    // MVP 계산
    const mvpMemberId = calculateMatchMVP(matchForMVP)
    console.log('계산된 MVP:', mvpMemberId)

    // 매치 레코드 생성 (MVP 포함, 컬럼이 없을 경우 기본 데이터만)
    const matchInsertData: any = {
      session_id: matchData.sessionId,
      team_id: matchData.teamId,
      winner: matchData.winner
    }
    
    // mvp_member_id 컬럼이 존재할 때만 추가
    if (mvpMemberId) {
      matchInsertData.mvp_member_id = mvpMemberId
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert(matchInsertData)
      .select('id')
      .single()

    if (matchError || !match) {
      console.error('매치 생성 오류:', matchError)
      return null
    }

    // 각 팀 멤버들의 경기 데이터 저장
    const allMembersData = [
      ...matchData.team1Members.map(m => ({ ...m, teamSide: 'team1' as const })),
      ...matchData.team2Members.map(m => ({ ...m, teamSide: 'team2' as const }))
    ]

    const matchMembersPromises = allMembersData.map(async (memberData) => {
      // team_member_id 조회
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('id', memberData.memberId)
        .single()

      if (memberError || !teamMember) {
        console.error('팀 멤버 조회 오류:', memberError)
        return null
      }

      return supabase
        .from('match_members')
        .insert({
          match_id: match.id,
          team_member_id: teamMember.id,
          team_side: memberData.teamSide,
          position: memberData.position,
          champion: memberData.champion,
          kills: memberData.kills,
          deaths: memberData.deaths,
          assists: memberData.assists
        })
    })

    await Promise.all(matchMembersPromises)

    // 각 플레이어의 통계 업데이트
    const team1Won = matchData.winner === 'team1'
    const team2Won = matchData.winner === 'team2'

    const statsUpdatePromises = [
      ...matchData.team1Members.map(member => 
        updateMemberStats(member.memberId, member.position, team1Won)
      ),
      ...matchData.team2Members.map(member => 
        updateMemberStats(member.memberId, member.position, team2Won)
      )
    ]

    await Promise.all(statsUpdatePromises)

    console.log('경기 결과가 성공적으로 저장되었습니다:', match.id)
    return match.id

  } catch (error) {
    console.error('경기 결과 저장 중 예외:', error)
    return null
  }
}

// 멤버 통계 업데이트 함수
const updateMemberStats = async (
  memberId: string, 
  playedPosition: Position, 
  won: boolean
): Promise<boolean> => {
  try {
    // 현재 멤버 정보 조회
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      console.error('멤버 정보 조회 오류:', fetchError)
      return false
    }

    const isMainPosition = member.main_position === playedPosition
    const isSubPosition = member.sub_position === playedPosition

    // 새로운 통계 계산
    const updatedStats = {
      total_wins: member.total_wins + (won ? 1 : 0),
      total_losses: member.total_losses + (won ? 0 : 1),
      main_position_games: member.main_position_games + (isMainPosition ? 1 : 0),
      main_position_wins: member.main_position_wins + (isMainPosition && won ? 1 : 0),
      sub_position_games: member.sub_position_games + (isSubPosition ? 1 : 0),
      sub_position_wins: member.sub_position_wins + (isSubPosition && won ? 1 : 0)
    }

    // 티어 점수 재계산
    const newTierScore = calculateTierScore(member.tier as TierType, {
      totalWins: updatedStats.total_wins,
      totalLosses: updatedStats.total_losses,
      mainPositionGames: updatedStats.main_position_games,
      mainPositionWins: updatedStats.main_position_wins,
      subPositionGames: updatedStats.sub_position_games,
      subPositionWins: updatedStats.sub_position_wins,
      tierScore: member.tier_score
    })

    // 데이터베이스 업데이트
    const { error: updateError } = await supabase
      .from('team_members')
      .update({
        ...updatedStats,
        tier_score: newTierScore
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('멤버 통계 업데이트 오류:', updateError)
      return false
    }

    return isMainPosition
  } catch (error) {
    console.error('멤버 통계 업데이트 중 예외:', error)
    return false
  }
}

export const getMatchesByTeamId = async (teamId: string): Promise<Match[]> => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        sessions (id),
        match_members (
          *,
          team_members (id, nickname)
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('매치 목록 조회 오류:', error)
      return []
    }

    // 데이터 변환
    return matches.map(match => {
      const matchMembers = match.match_members as any[]
      
      const team1Members = matchMembers
        .filter(m => m.team_side === 'team1')
        .map(m => ({
          memberId: m.team_member_id,
          position: m.position as Position,
          champion: m.champion,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists
        }))

      const team2Members = matchMembers
        .filter(m => m.team_side === 'team2')
        .map(m => ({
          memberId: m.team_member_id,
          position: m.position as Position,
          champion: m.champion,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists
        }))

      return {
        id: match.id,
        sessionId: match.session_id,
        team1: { members: team1Members },
        team2: { members: team2Members },
        winner: match.winner as 'team1' | 'team2',
        mvpMemberId: match.mvp_member_id || undefined,
        createdAt: new Date(match.created_at)
      }
    })
  } catch (error) {
    console.error('매치 목록 조회 중 예외:', error)
    return []
  }
}

// ============================================================================
// 사용자 인증 및 닉네임 관련 API 함수들
// ============================================================================

// 이메일 중복 검사
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('이메일 중복 검사 오류:', error)
      return true // 안전을 위해 중복으로 처리
    }

    return !!data
  } catch (error) {
    console.error('이메일 중복 검사 중 예외:', error)
    return true // 안전을 위해 중복으로 처리
  }
}

// 닉네임 중복 검사
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    if (!username || username.length < 3) return false

    // single() 대신 limit(1) 사용하여 에러 방지
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .limit(1)

    if (error) {
      console.error('닉네임 중복 검사 오류:', error)
      // username 컬럼이 존재하지 않는 경우 (마이그레이션 미실행)
      if (error.message?.includes('column "username" does not exist')) {
        console.warn('데이터베이스 마이그레이션이 필요합니다. username 컬럼이 없습니다.')
        return false // 마이그레이션 전에는 중복 없음으로 처리
      }
      return true // 기타 오류 시 안전을 위해 중복으로 처리
    }

    return data && data.length > 0
  } catch (error) {
    console.error('닉네임 중복 검사 중 예외:', error)
    return true // 안전을 위해 중복으로 처리
  }
}

// 닉네임 유효성 검사
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username) {
    return { isValid: true } // 선택사항이므로 빈 값은 유효
  }

  // 길이 검사 (2-20자)
  if (username.length < 2 || username.length > 20) {
    return { 
      isValid: false, 
      error: '닉네임은 2-20자 사이여야 합니다.' 
    }
  }

  // 형식 검사 (영문, 한글, 숫자, _, - 만 허용)
  const usernameRegex = /^[a-zA-Z0-9가-힣_-]+$/
  if (!usernameRegex.test(username)) {
    return { 
      isValid: false, 
      error: '닉네임은 영문, 한글, 숫자, _, - 만 사용할 수 있습니다.' 
    }
  }

  return { isValid: true }
}

// 이메일 또는 닉네임으로 사용자 조회 (하이브리드 로그인용)
export const findUserByLoginId = async (loginId: string): Promise<User | null> => {
  try {
    // 이메일 형식인지 확인
    const isEmail = loginId.includes('@')
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq(isEmail ? 'email' : 'username', isEmail ? loginId.toLowerCase() : loginId)
      .limit(1)

    if (error || !profiles || profiles.length === 0) {
      // 로그인 실패는 보안상 상세한 로그를 남기지 않음
      return null
    }

    const profile = profiles[0]
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      username: profile.username || undefined,
      avatar: profile.avatar_url || undefined,
      provider: profile.provider as 'kakao' | 'naver' | 'google',
      createdAt: new Date(profile.created_at)
    }
  } catch (error) {
    console.error('하이브리드 사용자 조회 중 예외:', error)
    return null
  }
}

// 프로필 업데이트 (닉네임 설정/변경)
export const updateUserProfile = async (
  userId: string, 
  updates: { 
    name?: string
    username?: string | null
    avatar_url?: string | null 
  }
): Promise<boolean> => {
  try {
    // 닉네임 변경 시 중복 검사
    if (updates.username) {
      const validation = validateUsername(updates.username)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const exists = await checkUsernameExists(updates.username)
      if (exists) {
        // 현재 사용자의 닉네임인지 확인
        const currentUser = await getUserById(userId)
        if (currentUser?.username !== updates.username) {
          throw new Error('이미 사용 중인 닉네임입니다.')
        }
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('프로필 업데이트 오류:', error)
      throw new Error('프로필 업데이트에 실패했습니다.')
    }

    return true
  } catch (error) {
    console.error('프로필 업데이트 중 예외:', error)
    throw error
  }
}

// 닉네임 추천 (중복 시 대안 제안)
export const suggestUsernames = async (baseName: string): Promise<string[]> => {
  try {
    const suggestions: string[] = []
    const cleanName = baseName.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 15)
    
    if (cleanName.length < 3) {
      return ['Player001', 'Player002', 'Player003']
    }

    // 기본 닉네임
    suggestions.push(cleanName)
    
    // 숫자 조합
    for (let i = 1; i <= 5; i++) {
      const numberSuffix = String(i).padStart(2, '0')
      suggestions.push(`${cleanName}${numberSuffix}`)
      suggestions.push(`${cleanName}_${numberSuffix}`)
    }

    // 중복 검사 후 사용 가능한 것들만 반환
    const availableSuggestions: string[] = []
    for (const suggestion of suggestions) {
      if (suggestion.length >= 3 && suggestion.length <= 20) {
        const exists = await checkUsernameExists(suggestion)
        if (!exists) {
          availableSuggestions.push(suggestion)
        }
      }
      if (availableSuggestions.length >= 3) break
    }

    return availableSuggestions.slice(0, 3)
  } catch (error) {
    console.error('닉네임 추천 중 예외:', error)
    return ['Player001', 'Player002', 'Player003']
  }
}

// ============================================================================
// 유틸리티 함수들 (기존 호환성 유지)
// ============================================================================

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('사용자 조회 오류:', error)
      return null
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      username: profile.username || undefined,
      avatar: profile.avatar_url || undefined,
      provider: profile.provider as 'kakao' | 'naver' | 'google',
      createdAt: new Date(profile.created_at)
    }
  } catch (error) {
    console.error('사용자 조회 중 예외:', error)
    return null
  }
}

export const getMemberWithUser = async (member: TeamMember) => {
  const user = await getUserById(member.userId)
  return { ...member, user }
}

export const calculateWinRate = (wins: number, losses: number): number => {
  const total = wins + losses
  return total > 0 ? Math.round((wins / total) * 100) : 0
}

export const getMemberNickname = async (memberId: string): Promise<string> => {
  try {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('nickname')
      .eq('id', memberId)
      .single()

    if (error || !member) {
      return `Player ${memberId}`
    }

    return member.nickname
  } catch (error) {
    console.error('멤버 닉네임 조회 중 예외:', error)
    return `Player ${memberId}`
  }
}

// ============================================================================
// 최근 활동 관련 API 함수들
// ============================================================================

export interface RecentActivity {
  id: string
  type: 'match_completed'
  title: string
  description: string
  timestamp: Date
  mvpMemberId?: string
  mvpMemberName?: string
  winner?: 'team1' | 'team2'
  relatedId?: string
}

export const getRecentTeamActivities = async (
  teamId: string, 
  limit: number = 5
): Promise<RecentActivity[]> => {
  try {
    // 먼저 매치 기본 정보를 가져옴 (MVP 컬럼이 없을 수 있으므로 기본 정보만)
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
      console.error('최근 활동 조회 오류:', error)
      return []
    }

    // 활동 데이터 생성 (일단 MVP 정보 없이)
    const activities: RecentActivity[] = matches.map(match => {
      const isBlueTeamWin = match.winner === 'team1'
      
      return {
        id: match.id,
        type: 'match_completed' as const,
        title: `${isBlueTeamWin ? '블루팀' : '레드팀'} 승리`,
        description: '', // MVP 정보는 일단 비움
        timestamp: new Date(match.created_at),
        winner: match.winner,
        relatedId: match.id
      }
    })

    return activities
  } catch (error) {
    console.error('최근 활동 조회 중 예외:', error)
    return []
  }
}

// ============================================================================
// 경기 결과 삭제 관련 API 함수들
// ============================================================================

export const deleteMatchResult = async (matchId: string): Promise<boolean> => {
  try {
    console.log('경기 결과 삭제 시작:', matchId)
    
    // 1. 매치 정보 조회 (삭제 전 통계 롤백을 위해)
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select(`
        id,
        winner,
        match_members (
          team_member_id,
          team_side,
          position
        )
      `)
      .eq('id', matchId)
      .single()

    if (fetchError || !match) {
      console.error('매치 정보 조회 실패:', fetchError)
      return false
    }

    // 2. 각 플레이어의 통계 롤백
    const matchMembers = match.match_members as any[]
    const rollbackPromises = matchMembers.map(async (matchMember) => {
      const isWinner = (match.winner === 'team1' && matchMember.team_side === 'team1') ||
                      (match.winner === 'team2' && matchMember.team_side === 'team2')
      
      return rollbackMemberStats(matchMember.team_member_id, matchMember.position, isWinner)
    })

    await Promise.all(rollbackPromises)
    console.log('멤버 통계 롤백 완료')

    // 3. match_members 레코드 삭제
    const { error: deleteMembersError } = await supabase
      .from('match_members')
      .delete()
      .eq('match_id', matchId)

    if (deleteMembersError) {
      console.error('매치 멤버 레코드 삭제 실패:', deleteMembersError)
      return false
    }

    // 4. matches 레코드 삭제
    const { error: deleteMatchError } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (deleteMatchError) {
      console.error('매치 레코드 삭제 실패:', deleteMatchError)
      return false
    }

    console.log('경기 결과 삭제 완료:', matchId)
    return true

  } catch (error) {
    console.error('경기 결과 삭제 중 예외:', error)
    return false
  }
}

// 멤버 통계 롤백 함수
const rollbackMemberStats = async (
  memberId: string, 
  playedPosition: string, 
  won: boolean
): Promise<boolean> => {
  try {
    // 현재 멤버 정보 조회
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      console.error('멤버 정보 조회 오류:', fetchError)
      return false
    }

    const isMainPosition = member.main_position === playedPosition
    const isSubPosition = member.sub_position === playedPosition

    // 통계 롤백 계산 (경기 결과 반대로 적용)
    const updatedStats = {
      total_wins: member.total_wins - (won ? 1 : 0),
      total_losses: member.total_losses - (won ? 0 : 1),
      main_position_games: member.main_position_games - (isMainPosition ? 1 : 0),
      main_position_wins: member.main_position_wins - (isMainPosition && won ? 1 : 0),
      sub_position_games: member.sub_position_games - (isSubPosition ? 1 : 0),
      sub_position_wins: member.sub_position_wins - (isSubPosition && won ? 1 : 0)
    }

    // 음수 방지
    Object.keys(updatedStats).forEach(key => {
      if (updatedStats[key as keyof typeof updatedStats] < 0) {
        updatedStats[key as keyof typeof updatedStats] = 0
      }
    })

    // 티어 점수 재계산
    const newTierScore = calculateTierScore(member.tier as TierType, {
      totalWins: updatedStats.total_wins,
      totalLosses: updatedStats.total_losses,
      mainPositionGames: updatedStats.main_position_games,
      mainPositionWins: updatedStats.main_position_wins,
      subPositionGames: updatedStats.sub_position_games,
      subPositionWins: updatedStats.sub_position_wins,
      tierScore: member.tier_score
    })

    // 데이터베이스 업데이트
    const { error: updateError } = await supabase
      .from('team_members')
      .update({
        ...updatedStats,
        tier_score: newTierScore
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('멤버 통계 롤백 오류:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('멤버 통계 롤백 중 예외:', error)
    return false
  }
}

// ============================================================================
// MVP 통계 및 팀 정보 관련 API 함수들
// ============================================================================

// 개별 멤버 MVP 횟수 조회
export const getMemberMVPCount = async (memberId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .eq('mvp_member_id', memberId)

    if (error) {
      console.error('MVP 횟수 조회 오류:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('MVP 횟수 조회 중 예외:', error)
    return 0
  }
}

// 팀 내 MVP 순위 조회
export const getTeamMVPRanking = async (teamId: string): Promise<Array<{memberId: string, nickname: string, mvpCount: number}>> => {
  try {
    // 팀 멤버 목록 조회
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id, nickname')
      .eq('team_id', teamId)

    if (membersError || !members) {
      console.error('팀 멤버 조회 오류:', membersError)
      return []
    }

    // 각 멤버의 MVP 횟수 조회
    const mvpCounts = await Promise.all(
      members.map(async (member) => {
        const mvpCount = await getMemberMVPCount(member.id)
        return {
          memberId: member.id,
          nickname: member.nickname,
          mvpCount
        }
      })
    )

    // MVP 횟수순으로 정렬
    return mvpCounts.sort((a, b) => b.mvpCount - a.mvpCount)
  } catch (error) {
    console.error('팀 MVP 순위 조회 중 예외:', error)
    return []
  }
}

// 팀 상위 랭킹 (승률 기준) 조회
export const getTopRankings = async (teamId: string): Promise<Array<{nickname: string, winRate: number}>> => {
  try {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('nickname, total_wins, total_losses')
      .eq('team_id', teamId)

    if (error || !members) {
      console.error('상위 랭킹 조회 오류:', error)
      return []
    }

    // 승률 계산 및 정렬
    const rankings = members
      .map(member => {
        const totalGames = member.total_wins + member.total_losses
        const winRate = totalGames > 0 ? Math.round((member.total_wins / totalGames) * 100) : 0
        return {
          nickname: member.nickname,
          winRate
        }
      })
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3) // 상위 3명만

    return rankings
  } catch (error) {
    console.error('상위 랭킹 조회 중 예외:', error)
    return []
  }
}

// 현재 연승/연패 현황 조회
export const getCurrentStreaks = async (teamId: string): Promise<{nickname: string, streak: number} | null> => {
  try {
    // 팀 멤버 목록 조회
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id, nickname')
      .eq('team_id', teamId)

    if (membersError || !members) {
      console.error('팀 멤버 조회 오류:', membersError)
      return null
    }

    // 각 멤버의 현재 연승/연패 계산
    const streaks = await Promise.all(
      members.map(async (member) => {
        const streak = await calculateCurrentStreak(member.id, teamId)
        return {
          nickname: member.nickname,
          streak
        }
      })
    )

    // 절댓값이 가장 큰 스트릭 찾기
    const maxStreak = streaks.reduce((max, current) => 
      Math.abs(current.streak) > Math.abs(max.streak) ? current : max
    )

    // 스트릭이 0이 아닌 경우에만 반환
    return Math.abs(maxStreak.streak) > 0 ? maxStreak : null
  } catch (error) {
    console.error('현재 연승/연패 조회 중 예외:', error)
    return null
  }
}

// 개별 멤버의 현재 연승/연패 계산
const calculateCurrentStreak = async (memberId: string, teamId: string): Promise<number> => {
  try {
    // 해당 멤버의 최근 경기 결과를 시간순으로 조회
    const { data: matches, error } = await supabase
      .from('match_members')
      .select(`
        match_id,
        team_side,
        matches!inner (
          id,
          winner,
          created_at,
          team_id
        )
      `)
      .eq('team_member_id', memberId)
      .eq('matches.team_id', teamId)
      .order('matches(created_at)', { ascending: false })

    if (error || !matches) {
      console.error('경기 결과 조회 오류:', error)
      return 0
    }

    let streak = 0
    let lastResult: boolean | null = null

    // 최근 경기부터 역순으로 확인
    for (const match of matches) {
      const matchData = match.matches as any
      const isWinner = (matchData.winner === 'team1' && match.team_side === 'team1') ||
                      (matchData.winner === 'team2' && match.team_side === 'team2')

      if (lastResult === null) {
        // 첫 번째 경기
        lastResult = isWinner
        streak = isWinner ? 1 : -1
      } else if (lastResult === isWinner) {
        // 연속된 결과
        streak = isWinner ? streak + 1 : streak - 1
      } else {
        // 연속이 끊어짐
        break
      }
    }

    return streak
  } catch (error) {
    console.error('개별 연승/연패 계산 중 예외:', error)
    return 0
  }
}

// ============================================================================
// 티어 및 포지션 이름 매핑 (기존과 동일)
// ============================================================================

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

export const positionNames: Record<Position, string> = {
  top: '탑',
  jungle: '정글',
  mid: '미드',
  adc: '원딜',
  support: '서폿'
}