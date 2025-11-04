import { createSupabaseBrowser } from '../supabase'
import { Team, TeamMember, User, TierType, Position, MemberStats, TeamInvite } from '../types'
import { calculateTierScore } from '../stats'
import { validateUUID, validateString, validatePosition, validateTier } from '../input-validator'
import type { Database } from '../database.types'

const supabase = createSupabaseBrowser()

// ============================================================================
// 팀 멤버 관리 API 함수들
// ============================================================================

/**
 * 멤버가 승인 권한을 가지고 있는지 확인
 * @param teamId - 팀 ID
 * @param userId - 확인할 사용자 ID
 * @returns 리더 또는 부리더면 true, 아니면 false
 */
export const canApproveMember = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !member) {
      return false
    }

    // 리더 또는 부리더만 승인 권한 있음
    return (member as any).role === 'leader' || (member as any).role === 'vice_leader'
  } catch (error) {
    console.error('권한 확인 오류:', error)
    return false
  }
}

export const getTeamMembers = async (
  teamId: string,
  includeKicked: boolean = false
): Promise<TeamMember[]> => {
  try {
    let statusFilter = ['active']
    if (includeKicked) {
      statusFilter.push('kicked')
    }

    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles(username)
      `)
      .eq('team_id', teamId)
      .in('status', statusFilter)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('팀 멤버 조회 오류:', error)
      return []
    }

    return members.map((member: any) => ({
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'vice_leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.profiles?.username || member.nickname, // profiles.username 우선 사용, fallback으로 기존 nickname
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: member.sub_positions || [],
      stats: {
        totalWins: member.total_wins,
        totalLosses: member.total_losses,
        mainPositionGames: member.main_position_games,
        mainPositionWins: member.main_position_wins,
        subPositionGames: member.sub_position_games,
        subPositionWins: member.sub_position_wins,
        tierScore: member.tier_score,
        mvpCount: 0,
        currentStreak: 0
      },
      status: member.status as 'active' | 'pending' | 'kicked',
      joinType: (member.join_type || 'public') as 'public' | 'invite'
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
  subPositions: Position[] = [],
  role: 'leader' | 'member' = 'member',
  status: 'active' | 'pending' = 'active'
): Promise<TeamMember | null> => {
  try {
    // 입력값 검증
    const validatedTeamId = validateUUID(teamId)
    const validatedUserId = validateUUID(userId)
    const validatedNickname = validateString(nickname, 20, false)
    const validatedMainPosition = validatePosition(mainPosition)
    const validatedTier = validateTier(tier)

    if (!validatedTeamId || !validatedUserId || !validatedNickname || 
        !validatedMainPosition || !validatedTier) {
      console.error('팀 멤버 추가 입력값 검증 실패')
      return null
    }

    const tierScore = calculateTierScore(tier, {
      totalWins: 0,
      totalLosses: 0,
      mainPositionGames: 0,
      mainPositionWins: 0,
      subPositionGames: 0,
      subPositionWins: 0
    })

    const { data: member, error } = await (supabase as any)
      .from('team_members')
      .insert({
        team_id: validatedTeamId,
        user_id: validatedUserId,
        role,
        nickname: validatedNickname,
        tier: validatedTier,
        main_position: validatedMainPosition,
        sub_positions: subPositions,
        tier_score: tierScore,
        status,
        join_type: 'public',
        joined_at: new Date().toISOString(),
        approved_at: status === 'active' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      console.error('팀 멤버 추가 오류:', error)
      return null
    }

    return {
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'vice_leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.nickname,
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: member.sub_positions || [],
      stats: {
        totalWins: member.total_wins,
        totalLosses: member.total_losses,
        mainPositionGames: member.main_position_games,
        mainPositionWins: member.main_position_wins,
        subPositionGames: member.sub_position_games,
        subPositionWins: member.sub_position_wins,
        tierScore: member.tier_score,
        mvpCount: 0,
        currentStreak: 0
      },
      status: member.status as 'active' | 'pending' | 'kicked',
      joinType: (member.join_type || 'public') as 'public' | 'invite'
    }
  } catch (error) {
    console.error('팀 멤버 추가 중 예외:', error)
    return null
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
      const memberData = existingMember as any
      if (memberData.status === 'active') {
        throw new Error('이미 해당 팀의 활성 멤버입니다.')
      } else if (memberData.status === 'pending') {
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

    if (!(team as any).is_public) {
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

      const { data: updatedMember, error: updateError } = await (supabase as any)
        .from('team_members')
        .update({
          status: 'pending',  // 승인 대기 상태로 변경
          nickname,
          tier,
          main_position: mainPosition,
          sub_positions: subPositions,
          tier_score: tierScore,
          joined_at: new Date().toISOString(),
          approved_at: null,  // 승인 시간 초기화
          rejected_at: null,  // 거절 시간 초기화
          rejection_reason: null  // 거절 사유 초기화
        })
        .eq('id', (kickedMember as any).id)
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
        role: updatedMember.role as 'leader' | 'vice_leader' | 'member',
        joinedAt: new Date(updatedMember.joined_at),
        nickname: updatedMember.nickname,
        tier: updatedMember.tier as TierType,
        mainPosition: updatedMember.main_position as Position,
        subPositions: updatedMember.sub_positions || [],
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

    return true
  } catch (error: unknown) {
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
      memberTeams?.forEach((item: { teams?: Database['public']['Tables']['teams']['Row'] }) => {
        const team = item.teams
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
      leaderTeams?.forEach((team: any) => {
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
// 팀 가입 관리 시스템
// ============================================================================

export const requestToJoinTeam = async (
  teamId: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[]
): Promise<{ success: boolean; message: string; member?: TeamMember }> => {
  try {
    // 1. 이미 해당 팀의 멤버인지 확인 (활성, 대기, 추방 모두 확인)
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('멤버 중복 확인 오류:', memberCheckError)
      return { success: false, message: '멤버 상태 확인 중 오류가 발생했습니다.' }
    }

    if (existingMember) {
      switch ((existingMember as any).status) {
        case 'active':
          return { success: false, message: '이미 해당 팀의 활성 멤버입니다.' }
        case 'pending':
          return { success: false, message: '이미 참가 요청이 대기 중입니다.' }
        case 'kicked':
          // 추방된 멤버는 재참가 가능하지만 승인이 필요
          break
        default:
          return { success: false, message: '알 수 없는 멤버 상태입니다.' }
      }
    }

    // 2. 새 멤버 참가 또는 추방된 멤버 재참가 처리
    const member = await addTeamMember(
      teamId,
      userId,
      nickname,
      tier,
      mainPosition,
      subPositions,
      'member',
      'pending'  // 항상 승인 대기 상태로 시작
    )

    if (!member) {
      return { success: false, message: '팀 참가 요청 처리에 실패했습니다.' }
    }

    return { 
      success: true, 
      message: '팀 참가 요청이 전송되었습니다. 팀 리더의 승인을 기다려주세요.',
      member
    }
  } catch (error) {
    console.error('팀 참가 요청 실패:', error)
    return { success: false, message: '팀 참가 요청 중 오류가 발생했습니다.' }
  }
}

export const getPendingJoinRequests = async (teamId: string): Promise<TeamMember[]> => {
  try {
    const { data: pendingMembers, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles(username)
      `)
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true }) // 먼저 신청한 순서대로

    if (error) {
      console.error('승인 대기 요청 조회 오류:', error)
      return []
    }

    return pendingMembers.map((member: any) => ({
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role as 'leader' | 'vice_leader' | 'member',
      joinedAt: new Date(member.joined_at),
      nickname: member.profiles?.username || member.nickname, // profiles.username 우선 사용
      tier: member.tier as TierType,
      mainPosition: member.main_position as Position,
      subPositions: member.sub_positions || [],
      stats: {
        totalWins: member.total_wins,
        totalLosses: member.total_losses,
        mainPositionGames: member.main_position_games,
        mainPositionWins: member.main_position_wins,
        subPositionGames: member.sub_position_games,
        subPositionWins: member.sub_position_wins,
        tierScore: member.tier_score,
        mvpCount: 0,
        currentStreak: 0
      },
      status: 'pending' as const,
      joinType: (member.join_type || 'public') as 'public' | 'invite'
    }))
  } catch (error) {
    console.error('승인 대기 요청 조회 중 예외:', error)
    return []
  }
}

export const approveJoinRequest = async (
  memberId: string,
  approverId: string
): Promise<{ success: boolean; member?: TeamMember }> => {
  try {
    // 입력값 검증
    const validatedMemberId = validateUUID(memberId)
    const validatedApproverId = validateUUID(approverId)

    if (!validatedMemberId || !validatedApproverId) {
      console.error('승인 요청 입력값 검증 실패')
      return { success: false }
    }

    // 먼저 해당 멤버가 존재하고 pending 상태인지 확인
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('*, team_id')
      .eq('id', memberId)
      .single()

    if (checkError || !existingMember) {
      console.error('승인할 멤버를 찾을 수 없음:', checkError)
      return { success: false }
    }

    if ((existingMember as any).status !== 'pending') {
      console.error('승인할 수 없는 상태:', (existingMember as any).status)
      return { success: false }
    }

    // 권한 확인: 리더 또는 부리더만 승인 가능
    const hasPermission = await canApproveMember(
      (existingMember as any).team_id,
      approverId
    )

    if (!hasPermission) {
      console.error('승인 권한 없음:', approverId)
      return { success: false }
    }

    // 승인 처리 - 컬럼이 존재하는지 확인하고 업데이트
    const updateData: any = {}
    
    // status 컬럼은 필수
    updateData.status = 'active'
    
    // approved_at과 approved_by 컬럼이 있다면 추가
    if ((existingMember as any).hasOwnProperty('approved_at')) {
      updateData.approved_at = new Date().toISOString()
    }
    if ((existingMember as any).hasOwnProperty('approved_by')) {
      updateData.approved_by = approverId
    }

    const { data: updatedMember, error } = await (supabase as any)
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .select('*, teams!inner(*)')
      .single()

    if (error) {
      console.error('참가 요청 승인 오류:', error)
      return { success: false }
    }

    // 팀 멤버 수 증가 - 현재 활성 멤버 수로 업데이트
    const { count: activeMemberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', updatedMember.team_id)
      .eq('status', 'active')

    if (activeMemberCount !== null) {
      await (supabase as any)
        .from('teams')
        .update({ member_count: activeMemberCount })
        .eq('id', (updatedMember as any).team_id)
    }

    return {
      success: true,
      member: {
        id: updatedMember.id,
        teamId: updatedMember.team_id,
        userId: updatedMember.user_id,
        role: updatedMember.role as 'leader' | 'vice_leader' | 'member',
        joinedAt: new Date(updatedMember.joined_at),
        nickname: updatedMember.nickname,
        tier: updatedMember.tier as TierType,
        mainPosition: updatedMember.main_position as Position,
        subPositions: updatedMember.sub_positions || [],
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
        status: 'active' as const,
        joinType: (updatedMember.join_type || 'public') as 'public' | 'invite'
      }
    }
  } catch (error) {
    console.error('참가 요청 승인 중 예외:', error)
    return { success: false }
  }
}

export const rejectJoinRequest = async (
  memberId: string,
  rejecterId: string,
  reason?: string
): Promise<{ success: boolean }> => {
  try {
    // 입력값 검증
    const validatedMemberId = validateUUID(memberId)
    const validatedRejecterId = validateUUID(rejecterId)

    if (!validatedMemberId || !validatedRejecterId) {
      console.error('거절 요청 입력값 검증 실패')
      return { success: false }
    }

    // 먼저 해당 멤버가 존재하고 pending 상태인지 확인
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('*, team_id')
      .eq('id', memberId)
      .single()

    if (checkError || !existingMember) {
      console.error('거절할 멤버를 찾을 수 없음:', checkError)
      return { success: false }
    }

    if ((existingMember as any).status !== 'pending') {
      console.error('거절할 수 없는 상태:', (existingMember as any).status)
      return { success: false }
    }

    // 권한 확인: 리더 또는 부리더만 거절 가능
    const hasPermission = await canApproveMember(
      (existingMember as any).team_id,
      rejecterId
    )

    if (!hasPermission) {
      console.error('거절 권한 없음:', rejecterId)
      return { success: false }
    }

    // 거절 처리 - 컬럼이 존재하는지 확인하고 업데이트
    const updateData: any = {
      status: 'kicked' // 거절된 멤버는 kicked 상태로 처리
    }
    
    // rejected_at과 rejection_reason 컬럼이 있다면 추가
    if ((existingMember as any).hasOwnProperty('rejected_at')) {
      updateData.rejected_at = new Date().toISOString()
    }
    if ((existingMember as any).hasOwnProperty('rejection_reason')) {
      updateData.rejection_reason = reason || '팀 리더에 의해 거절됨'
    }

    const { error } = await (supabase as any)
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)

    if (error) {
      console.error('참가 요청 거절 오류:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('참가 요청 거절 중 예외:', error)
    return { success: false }
  }
}

export const kickTeamMember = async (
  memberId: string,
  kickerId: string,
  reason?: string
): Promise<boolean> => {
  try {
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      console.error('멤버 정보 조회 오류:', memberError)
      return false
    }

    // 리더는 추방할 수 없음
    if ((member as any).role === 'leader') {
      console.error('팀 리더는 추방할 수 없습니다.')
      return false
    }

    // 자기 자신을 추방할 수 없음 (자진 탈퇴는 별도 기능)
    if ((member as any).user_id === kickerId) {
      console.error('자기 자신을 추방할 수 없습니다.')
      return false
    }

    // 멤버 상태를 'kicked'로 변경
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update({
        status: 'kicked',
        kicked_at: new Date().toISOString(),
        kicked_by: kickerId,
        kick_reason: reason || '팀 리더에 의해 추방됨'
      })
      .eq('id', memberId)
      .eq('status', 'active') // 활성 멤버만 추방 가능

    if (updateError) {
      console.error('멤버 추방 오류:', updateError)
      return false
    }

    // 팀 멤버 수 감소 - 현재 활성 멤버 수로 업데이트
    const { count: activeMemberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', (member as any).team_id)
      .eq('status', 'active')

    const { error: teamUpdateError } = await (supabase as any)
      .from('teams')
      .update({ 
        member_count: Math.max(0, (activeMemberCount || 0))
      })
      .eq('id', (member as any).team_id)

    if (teamUpdateError) {
      console.error('팀 멤버 수 업데이트 오류:', teamUpdateError)
      // 멤버 수 업데이트 실패는 치명적이지 않음
    }

    return true
  } catch (error) {
    console.error('멤버 추방 중 예외:', error)
    return false
  }
}

export const updateMemberTier = async (memberId: string, newTier: TierType): Promise<boolean> => {
  try {
    const validatedTier = validateTier(newTier)
    if (!validatedTier) {
      console.error('유효하지 않은 티어:', newTier)
      return false
    }

    // 멤버의 현재 통계 정보 가져오기
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('total_wins, total_losses, main_position_games, main_position_wins, sub_position_games, sub_position_wins')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      console.error('멤버 정보 조회 오류:', memberError)
      return false
    }

    // 새로운 티어 점수 계산
    const memberData = member as any
    const newTierScore = calculateTierScore(validatedTier as TierType, {
      totalWins: memberData.total_wins,
      totalLosses: memberData.total_losses,
      mainPositionGames: memberData.main_position_games,
      mainPositionWins: memberData.main_position_wins,
      subPositionGames: memberData.sub_position_games,
      subPositionWins: memberData.sub_position_wins
    })

    const { error } = await (supabase as any)
      .from('team_members')
      .update({
        tier: validatedTier,
        tier_score: newTierScore
      })
      .eq('id', memberId)

    if (error) {
      console.error('멤버 티어 업데이트 오류:', error)
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
  subPositions?: Position[]
): Promise<boolean> => {
  try {
    console.log(`포지션 업데이트 시도 - 멤버ID: ${memberId}, 메인: ${mainPosition}, 서브: ${subPositions}`)

    // 먼저 현재 멤버 정보를 조회
    const { data: currentMember, error: selectError } = await supabase
      .from('team_members')
      .select('id, main_position, sub_positions')
      .eq('id', memberId)
      .single()

    if (selectError || !currentMember) {
      console.error('멤버 정보 조회 오류:', selectError)
      return false
    }

    console.log('현재 멤버 정보:', currentMember)

    // 서브 포지션 배열 처리
    let finalSubPositions = subPositions || []
    
    // 메인 포지션과 같은 포지션은 서브 포지션에서 제거
    finalSubPositions = finalSubPositions.filter(pos => pos !== mainPosition)
    
    // 중복 제거
    finalSubPositions = [...new Set(finalSubPositions)]
    
    // 최소 1개 서브 포지션 보장
    if (finalSubPositions.length === 0) {
      const availablePositions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
      finalSubPositions = [availablePositions.find(pos => pos !== mainPosition) || 'support']
    }

    const updateData = {
      main_position: mainPosition,
      sub_positions: finalSubPositions
    }

    console.log('업데이트할 데이터:', updateData)
    
    const { error } = await (supabase as any)
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)

    if (error) {
      console.error('멤버 포지션 업데이트 오류:', error)
      console.error('업데이트 시도한 값:', updateData)
      return false
    }

    console.log(`포지션 업데이트 성공 - 메인: ${mainPosition}, 서브: ${finalSubPositions}`)
    return true
  } catch (error) {
    console.error('멤버 포지션 업데이트 중 예외:', error)
    return false
  }
}

export const joinTeamByInviteCode = async (
  inviteCode: string,
  userId: string,
  nickname: string,
  tier: TierType,
  mainPosition: Position,
  subPositions: Position[]
): Promise<{ success: boolean; message: string; team?: { id: string; name: string } }> => {
  try {
    // 1. 초대 코드 유효성 확인
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select(`
        *,
        teams (
          id,
          name,
          is_public
        )
      `)
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite || !(invite as any).teams) {
      console.error('초대 코드 확인 오류:', inviteError)
      return { success: false, message: '유효하지 않거나 만료된 초대 코드입니다.' }
    }

    const inviteData = invite as any
    const teamId = inviteData.team_id
    const team = inviteData.teams as { id: string; name: string; is_public: boolean }

    // 2. 이미 해당 팀의 멤버인지 확인
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('멤버 중복 확인 오류:', memberCheckError)
      return { success: false, message: '멤버 상태 확인 중 오류가 발생했습니다.' }
    }

    if (existingMember) {
      switch ((existingMember as any).status) {
        case 'active':
          return { success: false, message: '이미 해당 팀의 활성 멤버입니다.' }
        case 'pending':
          return { success: false, message: '이미 참가 요청이 대기 중입니다.' }
        case 'kicked':
          // 추방된 멤버는 초대 코드로 재참가 가능
          break
      }
    }

    // 3. 팀에 멤버 추가 (초대 코드로는 즉시 승인)
    const newMember = await addTeamMember(
      teamId,
      userId,
      nickname,
      tier,
      mainPosition,
      subPositions,
      'member',
      'active'  // 초대 코드로는 즉시 활성 상태
    )

    if (!newMember) {
      return { success: false, message: '팀 참가 처리에 실패했습니다.' }
    }

    // 4. 팀 멤버 수 증가 - 현재 활성 멤버 수로 업데이트
    const { count: activeMemberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active')

    await (supabase as any)
      .from('teams')
      .update({ 
        member_count: (activeMemberCount || 0)
      })
      .eq('id', teamId)

    // 5. 초대 코드 사용 횟수 증가
    await (supabase as any)
      .from('team_invites')
      .update({ 
        current_uses: (inviteData.current_uses || 0) + 1
      })
      .eq('id', inviteData.id)

    return { 
      success: true, 
      message: '팀에 성공적으로 참가했습니다!',
      team: { id: team.id, name: team.name }
    }
  } catch (error) {
    console.error('초대 코드로 팀 참가 실패:', error)
    return { success: false, message: '팀 참가 중 오류가 발생했습니다.' }
  }
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const getMemberWithUser = async (member: TeamMember): Promise<TeamMember & { user?: User }> => {
  // 이 함수는 사용자 정보가 필요할 때 auth.ts에서 가져오도록 구현될 예정
  return member
}

export const getMemberNickname = async (memberId: string): Promise<string> => {
  try {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('nickname')
      .eq('id', memberId)
      .single()

    if (error || !member) {
      console.error('멤버 닉네임 조회 오류:', error)
      return '알 수 없는 사용자'
    }

    return (member as any).nickname
  } catch (error) {
    console.error('멤버 닉네임 조회 중 예외:', error)
    return '알 수 없는 사용자'
  }
}

export const calculateWinRate = (wins: number, losses: number): number => {
  if (wins + losses === 0) return 0
  return Math.round((wins / (wins + losses)) * 100)
}

// ============================================================================
// 부리더 관리 API 함수들
// ============================================================================

/**
 * 부리더 임명
 * @param teamId - 팀 ID
 * @param targetUserId - 부리더로 임명할 사용자 ID
 * @param leaderId - 리더 ID (권한 검증용)
 */
export const promoteToViceLeader = async (
  teamId: string,
  targetUserId: string,
  leaderId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 입력값 검증
    const validatedTeamId = validateUUID(teamId)
    const validatedTargetUserId = validateUUID(targetUserId)
    const validatedLeaderId = validateUUID(leaderId)

    if (!validatedTeamId || !validatedTargetUserId || !validatedLeaderId) {
      return { success: false, message: '유효하지 않은 요청입니다.' }
    }

    // 1. 요청자가 리더인지 확인
    const { data: leaderMember, error: leaderError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', validatedTeamId)
      .eq('user_id', validatedLeaderId)
      .eq('status', 'active')
      .single()

    if (leaderError || !leaderMember || (leaderMember as any).role !== 'leader') {
      return { success: false, message: '리더만 부리더를 임명할 수 있습니다.' }
    }

    // 2. 대상 멤버가 활성 멤버인지 확인
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('id, role, nickname')
      .eq('team_id', validatedTeamId)
      .eq('user_id', validatedTargetUserId)
      .eq('status', 'active')
      .single()

    if (targetError || !targetMember) {
      return { success: false, message: '대상 멤버를 찾을 수 없습니다.' }
    }

    if ((targetMember as any).role === 'leader') {
      return { success: false, message: '리더는 부리더로 변경할 수 없습니다.' }
    }

    if ((targetMember as any).role === 'vice_leader') {
      return { success: false, message: '이미 부리더입니다.' }
    }

    // 3. 부리더로 역할 변경
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update({ role: 'vice_leader' })
      .eq('id', (targetMember as any).id)

    if (updateError) {
      console.error('부리더 임명 오류:', updateError)
      return { success: false, message: '부리더 임명에 실패했습니다.' }
    }

    return {
      success: true,
      message: `${(targetMember as any).nickname}님을 부리더로 임명했습니다.`
    }
  } catch (error) {
    console.error('부리더 임명 중 예외:', error)
    return { success: false, message: '부리더 임명 중 오류가 발생했습니다.' }
  }
}

/**
 * 부리더 해임
 * @param teamId - 팀 ID
 * @param targetUserId - 부리더 해임할 사용자 ID
 * @param leaderId - 리더 ID (권한 검증용)
 */
export const demoteFromViceLeader = async (
  teamId: string,
  targetUserId: string,
  leaderId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 입력값 검증
    const validatedTeamId = validateUUID(teamId)
    const validatedTargetUserId = validateUUID(targetUserId)
    const validatedLeaderId = validateUUID(leaderId)

    if (!validatedTeamId || !validatedTargetUserId || !validatedLeaderId) {
      return { success: false, message: '유효하지 않은 요청입니다.' }
    }

    // 1. 요청자가 리더인지 확인
    const { data: leaderMember, error: leaderError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', validatedTeamId)
      .eq('user_id', validatedLeaderId)
      .eq('status', 'active')
      .single()

    if (leaderError || !leaderMember || (leaderMember as any).role !== 'leader') {
      return { success: false, message: '리더만 부리더를 해임할 수 있습니다.' }
    }

    // 2. 대상이 부리더인지 확인
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('id, role, nickname')
      .eq('team_id', validatedTeamId)
      .eq('user_id', validatedTargetUserId)
      .eq('status', 'active')
      .single()

    if (targetError || !targetMember) {
      return { success: false, message: '대상 멤버를 찾을 수 없습니다.' }
    }

    if ((targetMember as any).role !== 'vice_leader') {
      return { success: false, message: '부리더가 아닙니다.' }
    }

    // 3. 일반 멤버로 역할 변경
    const { error: updateError } = await (supabase as any)
      .from('team_members')
      .update({ role: 'member' })
      .eq('id', (targetMember as any).id)

    if (updateError) {
      console.error('부리더 해임 오류:', updateError)
      return { success: false, message: '부리더 해임에 실패했습니다.' }
    }

    return {
      success: true,
      message: `${(targetMember as any).nickname}님을 일반 멤버로 변경했습니다.`
    }
  } catch (error) {
    console.error('부리더 해임 중 예외:', error)
    return { success: false, message: '부리더 해임 중 오류가 발생했습니다.' }
  }
}