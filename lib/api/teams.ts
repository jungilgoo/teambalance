import { createSupabaseBrowser } from '../supabase'
import { Team, TeamInvite } from '../types'
import { validateTeamName, validateUUID, validateSearchQuery } from '../input-validator'
import { handleError, normalizeSupabaseError, ValidationError, NotFoundError } from '../errors'
import { logger } from '../logger'
import type { Database } from '../database.types'

const supabase = createSupabaseBrowser()

// ============================================================================
// 팀 관련 API 함수들
// ============================================================================

export const getTeamById = async (teamId: string): Promise<Team | null> => {
  const context = { teamId, action: 'getTeamById', component: 'teams' }
  
  try {
    logger.dbQuery(`teams.select(*).eq(id, ${teamId})`, undefined, context)

    const { data: team, error } = await (supabase as any)
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error) {
      throw normalizeSupabaseError(error, context)
    }

    const result = {
      id: (team as any).id,
      name: (team as any).name,
      leaderId: (team as any).leader_id,
      description: (team as any).description,
      isPublic: (team as any).is_public,
      memberCount: (team as any).member_count,
      createdAt: new Date((team as any).created_at)
    }

    logger.debug('팀 조회 완료', { ...context, teamName: result.name })
    return result
  } catch (error) {
    handleError(error, context)
    return null
  }
}

export const createTeam = async (
  name: string,
  leaderId: string,
  description?: string,
  isPublic: boolean = true
): Promise<Team | null> => {
  const context = { leaderId, action: 'createTeam', component: 'teams' }
  
  try {
    logger.userAction('팀 생성 시도', leaderId, { ...context, teamName: name })

    // 입력값 검증
    const validatedName = validateTeamName(name)
    const validatedLeaderId = validateUUID(leaderId)

    if (!validatedName || !validatedLeaderId) {
      throw new ValidationError('팀 생성 입력값이 유효하지 않습니다.', context)
    }

    logger.dbQuery('teams.insert()', undefined, context)

    const { data: team, error } = await (supabase as any)
      .from('teams')
      .insert({
        name: validatedName,
        leader_id: validatedLeaderId,
        description: description || null,
        is_public: isPublic,
        member_count: 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw normalizeSupabaseError(error, context)
    }

    const result = {
      id: (team as any).id,
      name: (team as any).name,
      leaderId: (team as any).leader_id,
      description: (team as any).description,
      isPublic: (team as any).is_public,
      memberCount: (team as any).member_count,
      createdAt: new Date((team as any).created_at)
    }

    logger.info('팀 생성 완료', { ...context, teamId: result.id, teamName: result.name })
    return result
  } catch (error) {
    handleError(error, context)
    return null
  }
}

export const getPublicTeams = async (): Promise<Team[]> => {
  try {
    const { data: teams, error } = await (supabase as any)
      .from('teams')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('공개 팀 조회 오류:', error)
      return []
    }

    return teams.map((team: any) => ({
      id: (team as any).id,
      name: (team as any).name,
      leaderId: (team as any).leader_id,
      description: (team as any).description,
      isPublic: (team as any).is_public,
      memberCount: (team as any).member_count,
      createdAt: new Date((team as any).created_at)
    }))
  } catch (error) {
    console.error('공개 팀 조회 중 예외:', error)
    return []
  }
}

export const searchPublicTeams = async (searchQuery: string): Promise<Team[]> => {
  try {
    // 입력값 검증
    const validatedQuery = validateSearchQuery(searchQuery)
    if (!validatedQuery) {
      return []
    }

    const { data: teams, error } = await (supabase as any)
      .from('teams')
      .select('*')
      .eq('is_public', true)
      .or(`name.ilike.%${validatedQuery}%,description.ilike.%${validatedQuery}%`)
      .order('member_count', { ascending: false })
      .limit(20)

    if (error) {
      console.error('팀 검색 오류:', error)
      return []
    }

    return teams.map((team: any) => ({
      id: (team as any).id,
      name: (team as any).name,
      leaderId: (team as any).leader_id,
      description: (team as any).description,
      isPublic: (team as any).is_public,
      memberCount: (team as any).member_count,
      createdAt: new Date((team as any).created_at)
    }))
  } catch (error) {
    console.error('팀 검색 중 예외:', error)
    return []
  }
}

// ============================================================================
// 팀 초대 시스템
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
  createdById: string,
  expiresInDays: number = 7
): Promise<TeamInvite | null> => {
  try {
    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data: invite, error } = await (supabase as any)
      .from('team_invites')
      .insert({
        team_id: teamId,
        invite_code: inviteCode,
        created_by: createdById,
        expires_at: expiresAt.toISOString(),
        uses_count: 0,
        max_uses: null,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('팀 초대 생성 오류:', error)
      return null
    }

    return {
      id: invite.id,
      teamId: invite.team_id,
      inviteCode: invite.invite_code,
      createdBy: invite.created_by,
      expiresAt: new Date(invite.expires_at),
      currentUses: invite.uses_count,
      maxUses: invite.max_uses,
      isActive: invite.is_active,
      createdAt: new Date(invite.created_at)
    }
  } catch (error) {
    console.error('팀 초대 생성 중 예외:', error)
    return null
  }
}

export const getTeamByInviteCode = async (inviteCode: string): Promise<any | null> => {
  try {
    // 초대 코드 유효성 검사 및 팀 정보 조회
    const { data: invite, error } = await (supabase as any)
      .from('team_invites')
      .select(`
        *,
        teams (
          id,
          name,
          description,
          is_public,
          member_count
        )
      `)
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !invite || !invite.teams) {
      console.error('초대 코드 조회 오류:', error)
      return null
    }

    return {
      inviteCode: invite.invite_code,
      team: {
        id: invite.teams.id,
        name: invite.teams.name,
        description: invite.teams.description,
        memberCount: invite.teams.member_count,
        isPublic: invite.teams.is_public
      },
      expiresAt: new Date(invite.expires_at),
      currentUses: invite.uses_count,
      maxUses: invite.max_uses
    }
  } catch (error) {
    console.error('초대 코드 조회 중 예외:', error)
    return null
  }
}

export const getTeamInvites = async (teamId: string): Promise<TeamInvite[]> => {
  try {
    const { data: invites, error } = await (supabase as any)
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('팀 초대 목록 조회 오류:', error)
      return []
    }

    return invites.map((invite: any) => ({
      id: invite.id,
      teamId: invite.team_id,
      inviteCode: invite.invite_code,
      createdBy: invite.created_by,
      expiresAt: new Date(invite.expires_at),
      currentUses: invite.uses_count,
      maxUses: invite.max_uses,
      isActive: invite.is_active,
      createdAt: new Date(invite.created_at)
    }))
  } catch (error) {
    console.error('팀 초대 목록 조회 중 예외:', error)
    return []
  }
}

// ============================================================================
// 팀 삭제/해체 시스템
// ============================================================================

export const deleteTeam = async (
  teamId: string,
  leaderId: string
): Promise<{ success: boolean; message: string }> => {
  const context = { teamId, leaderId, action: 'deleteTeam', component: 'teams' }
  
  try {
    logger.userAction('팀 삭제 시도', leaderId, context)

    // 입력값 검증
    const validatedTeamId = validateUUID(teamId)
    const validatedLeaderId = validateUUID(leaderId)

    if (!validatedTeamId || !validatedLeaderId) {
      throw new ValidationError('팀 삭제 입력값이 유효하지 않습니다.', context)
    }

    // 1. 팀 존재 여부 및 리더 권한 확인
    const { data: team, error: teamError } = await (supabase as any)
      .from('teams')
      .select('id, name, leader_id, member_count')
      .eq('id', validatedTeamId)
      .single()

    if (teamError) {
      throw normalizeSupabaseError(teamError, context)
    }

    if (!team) {
      return { success: false, message: '팀을 찾을 수 없습니다.' }
    }

    // 리더 권한 확인
    if (team.leader_id !== validatedLeaderId) {
      return { success: false, message: '팀을 삭제할 권한이 없습니다.' }
    }

    logger.dbQuery('teams.delete()', undefined, { ...context, teamName: team.name })

    // 2. 팀 삭제 (CASCADE로 관련 데이터 자동 삭제됨)
    // team_members, team_invites, sessions, matches 등이 ON DELETE CASCADE로 자동 삭제
    const { error: deleteError } = await (supabase as any)
      .from('teams')
      .delete()
      .eq('id', validatedTeamId)
      .eq('leader_id', validatedLeaderId) // 추가 보안 검증

    if (deleteError) {
      throw normalizeSupabaseError(deleteError, context)
    }

    logger.info('팀 삭제 완료', { ...context, teamName: team.name, memberCount: team.member_count })
    
    return { 
      success: true, 
      message: `"${team.name}" 팀이 성공적으로 삭제되었습니다.` 
    }
  } catch (error) {
    handleError(error, context)
    
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    
    return { 
      success: false, 
      message: '팀 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    }
  }
}

export const canDeleteTeam = async (
  teamId: string,
  userId: string
): Promise<{ canDelete: boolean; reason?: string }> => {
  try {
    // 입력값 검증
    const validatedTeamId = validateUUID(teamId)
    const validatedUserId = validateUUID(userId)

    if (!validatedTeamId || !validatedUserId) {
      return { canDelete: false, reason: '유효하지 않은 요청입니다.' }
    }

    // 팀 정보 조회
    const { data: team, error } = await (supabase as any)
      .from('teams')
      .select('id, leader_id, member_count')
      .eq('id', validatedTeamId)
      .single()

    if (error || !team) {
      return { canDelete: false, reason: '팀을 찾을 수 없습니다.' }
    }

    // 리더 권한 확인
    if (team.leader_id !== validatedUserId) {
      return { canDelete: false, reason: '팀 리더만 팀을 삭제할 수 있습니다.' }
    }

    // 활성 세션이 있는지 확인
    const { data: activeSessions, error: sessionError } = await (supabase as any)
      .from('sessions')
      .select('id')
      .eq('team_id', validatedTeamId)
      .in('status', ['preparing', 'in_progress'])
      .limit(1)

    if (sessionError) {
      console.error('활성 세션 확인 오류:', sessionError)
    }

    if (activeSessions && activeSessions.length > 0) {
      return { 
        canDelete: false, 
        reason: '진행 중인 세션이 있어 팀을 삭제할 수 없습니다. 세션을 먼저 완료해주세요.' 
      }
    }

    return { canDelete: true }
  } catch (error) {
    console.error('팀 삭제 가능 여부 확인 중 예외:', error)
    return { canDelete: false, reason: '권한 확인 중 오류가 발생했습니다.' }
  }
}