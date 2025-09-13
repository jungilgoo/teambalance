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