import { Position, TeamMember } from './types'
import { canMemberPlay } from './types'
import { calculateMemberTierScore } from './stats'

// 포지션별 후보 정보
export interface PositionCandidates {
  [key: string]: TeamMember[]  // position -> candidates
}

// 포지션 할당 결과
export interface PositionAssignment {
  [memberId: string]: Position
}

// 팀 분할 결과
export interface TeamSplit {
  team1: TeamMember[]
  team2: TeamMember[]
  team1Score: number
  team2Score: number
  scoreDifference: number
}

// 최종 밸런싱 결과
export interface SimpleBalancingResult {
  success: boolean
  team1: TeamMember[]
  team2: TeamMember[]
  team1Assignments: Record<string, Position>
  team2Assignments: Record<string, Position>
  team1TotalScore: number
  team2TotalScore: number
  scoreDifference: number
  message: string
}

// 각 포지션별로 플레이 가능한 후보들 분석
export function getPositionCandidates(members: TeamMember[]): PositionCandidates {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const candidates: PositionCandidates = {}

  for (const position of positions) {
    candidates[position] = members.filter(member => canMemberPlay(member, position))
  }

  return candidates
}

// 포지션 할당의 유효성 검증
export function validatePositionCandidates(candidates: PositionCandidates): { valid: boolean, message: string } {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const missingPositions: Position[] = []

  for (const position of positions) {
    if (!candidates[position] || candidates[position].length === 0) {
      missingPositions.push(position)
    }
  }

  if (missingPositions.length > 0) {
    return {
      valid: false,
      message: `다음 포지션에 플레이 가능한 선수가 없습니다: ${missingPositions.join(', ')}`
    }
  }

  return { valid: true, message: '모든 포지션에 후보가 있습니다.' }
}

// 백트래킹으로 유효한 포지션 할당 생성 (10명 모두에게 할당)
export function generateValidAssignments(
  candidates: PositionCandidates, 
  maxAssignments: number = 300
): PositionAssignment[] {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const assignments: PositionAssignment[] = []
  
  function backtrack(
    positionIndex: number,
    currentAssignment: PositionAssignment,
    usedMembers: Set<string>
  ) {
    if (assignments.length >= maxAssignments) return // 성능 제한
    
    if (positionIndex === positions.length * 2) { 
      // 각 포지션마다 2명씩 총 10명 할당 완료
      assignments.push({ ...currentAssignment })
      return
    }

    const position = positions[Math.floor(positionIndex / 2)] // 각 포지션에 2명씩
    const positionCandidates = candidates[position]

    for (const member of positionCandidates) {
      if (!usedMembers.has(member.id)) {
        // 이 멤버를 현재 포지션에 할당
        currentAssignment[member.id] = position
        usedMembers.add(member.id)
        
        backtrack(positionIndex + 1, currentAssignment, usedMembers)
        
        // 백트래킹: 할당 해제
        delete currentAssignment[member.id]
        usedMembers.delete(member.id)
      }
    }
  }

  backtrack(0, {}, new Set())
  return assignments
}

// 특정 포지션 할당에서 최적 팀 분할 (10명 모두 포지션 할당됨)
export function optimizeTeamSplit(
  assignment: PositionAssignment,
  members: TeamMember[]
): TeamSplit {
  // 모든 10명이 포지션 할당되어야 함
  const assignedMembers = members.filter(member => assignment[member.id])
  
  if (assignedMembers.length !== 10) {
    throw new Error(`포지션 할당이 잘못됨: ${assignedMembers.length}명 (10명이어야 함)`)
  }

  // 포지션별로 그룹화
  const positionGroups: { [position: string]: TeamMember[] } = {}
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  
  for (const position of positions) {
    positionGroups[position] = assignedMembers.filter(member => assignment[member.id] === position)
  }

  // 각 포지션마다 한 명씩 각 팀에 배정
  let bestSplit: TeamSplit | null = null
  let bestScoreDifference = Infinity

  // 가능한 모든 팀 분할 시나리오 생성 (각 포지션에서 누가 team1, 누가 team2에 갈지)
  function generateTeamSplits(positionIndex: number, team1: TeamMember[], team2: TeamMember[]) {
    if (positionIndex === positions.length) {
      // 모든 포지션 배정 완료, 점수 계산
      if (team1.length === 5 && team2.length === 5) {
        const team1Score = team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
        const team2Score = team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
        const scoreDifference = Math.abs(team1Score - team2Score)

        if (scoreDifference < bestScoreDifference) {
          bestScoreDifference = scoreDifference
          bestSplit = {
            team1: [...team1],
            team2: [...team2],
            team1Score,
            team2Score,
            scoreDifference
          }
        }
      }
      return
    }

    const position = positions[positionIndex]
    const positionMembers = positionGroups[position]
    
    if (positionMembers.length === 1) {
      // 한 명뿐인 포지션 - team1에 배정
      team1.push(positionMembers[0])
      generateTeamSplits(positionIndex + 1, team1, team2)
      team1.pop()
      
      // team2에 배정
      team2.push(positionMembers[0])
      generateTeamSplits(positionIndex + 1, team1, team2)
      team2.pop()
      
    } else if (positionMembers.length === 2) {
      // 두 명인 포지션 - 각 팀에 하나씩
      team1.push(positionMembers[0])
      team2.push(positionMembers[1])
      generateTeamSplits(positionIndex + 1, team1, team2)
      team1.pop()
      team2.pop()
      
      // 순서 바꿔서
      team1.push(positionMembers[1])
      team2.push(positionMembers[0])
      generateTeamSplits(positionIndex + 1, team1, team2)
      team1.pop()
      team2.pop()
      
    } else {
      // 3명 이상인 포지션 - 가능한 조합들 시도
      for (let i = 0; i < positionMembers.length; i++) {
        for (let j = 0; j < positionMembers.length; j++) {
          if (i !== j) {
            team1.push(positionMembers[i])
            team2.push(positionMembers[j])
            generateTeamSplits(positionIndex + 1, team1, team2)
            team1.pop()
            team2.pop()
          }
        }
      }
    }
  }

  generateTeamSplits(0, [], [])

  if (!bestSplit) {
    throw new Error('유효한 팀 분할을 찾을 수 없습니다.')
  }

  return bestSplit
}

// 메인 단순 밸런싱 알고리즘
export function simpleBalancingAlgorithm(members: TeamMember[]): SimpleBalancingResult {
  console.log('단순 밸런싱 알고리즘 시작')

  if (members.length !== 10) {
    return {
      success: false,
      team1: [],
      team2: [],
      team1Assignments: {},
      team2Assignments: {},
      team1TotalScore: 0,
      team2TotalScore: 0,
      scoreDifference: 0,
      message: `정확히 10명이 필요합니다. 현재: ${members.length}명`
    }
  }

  try {
    // 1단계: 포지션별 후보 분석
    const candidates = getPositionCandidates(members)
    console.log('포지션 후보 분석:', Object.entries(candidates).map(([pos, cands]) => `${pos}: ${cands.length}명`))

    // 2단계: 유효성 검증
    const validation = validatePositionCandidates(candidates)
    if (!validation.valid) {
      return {
        success: false,
        team1: [],
        team2: [],
        team1Assignments: {},
        team2Assignments: {},
        team1TotalScore: 0,
        team2TotalScore: 0,
        scoreDifference: 0,
        message: validation.message
      }
    }

    // 3단계: 유효한 포지션 할당 생성
    console.log('포지션 할당 생성 중...')
    const assignments = generateValidAssignments(candidates, 500)
    console.log(`생성된 할당 수: ${assignments.length}개`)

    if (assignments.length === 0) {
      return {
        success: false,
        team1: [],
        team2: [],
        team1Assignments: {},
        team2Assignments: {},
        team1TotalScore: 0,
        team2TotalScore: 0,
        scoreDifference: 0,
        message: '유효한 포지션 할당을 생성할 수 없습니다.'
      }
    }

    // 4단계: 각 할당에서 최적 팀 분할 찾기
    let bestResult: SimpleBalancingResult | null = null
    let bestScoreDifference = Infinity

    console.log('최적 팀 분할 탐색 중...')
    for (let i = 0; i < Math.min(assignments.length, 100); i++) { // 성능을 위해 최대 100개만 검토
      const assignment = assignments[i]
      
      try {
        const teamSplit = optimizeTeamSplit(assignment, members)
        
        if (teamSplit.scoreDifference < bestScoreDifference) {
          bestScoreDifference = teamSplit.scoreDifference
          
          // 팀별 포지션 할당 매핑 (모든 10명에게 포지션 할당됨)
          const team1Assignments: Record<string, Position> = {}
          const team2Assignments: Record<string, Position> = {}
          
          for (const member of teamSplit.team1) {
            team1Assignments[member.id] = assignment[member.id]
          }
          
          for (const member of teamSplit.team2) {
            team2Assignments[member.id] = assignment[member.id]
          }

          bestResult = {
            success: true,
            team1: teamSplit.team1,
            team2: teamSplit.team2,
            team1Assignments,
            team2Assignments,
            team1TotalScore: teamSplit.team1Score,
            team2TotalScore: teamSplit.team2Score,
            scoreDifference: teamSplit.scoreDifference,
            message: `단순 밸런싱 완료! 점수 차이: ${teamSplit.scoreDifference}점`
          }
        }
      } catch (error) {
        console.warn(`할당 ${i} 처리 중 오류:`, error)
        continue
      }
    }

    if (!bestResult) {
      return {
        success: false,
        team1: [],
        team2: [],
        team1Assignments: {},
        team2Assignments: {},
        team1TotalScore: 0,
        team2TotalScore: 0,
        scoreDifference: 0,
        message: '최적 팀 분할을 찾을 수 없습니다.'
      }
    }

    console.log(`단순 밸런싱 완료: 점수 차이 ${bestResult.scoreDifference}점`)
    return bestResult

  } catch (error) {
    console.error('단순 밸런싱 알고리즘 오류:', error)
    return {
      success: false,
      team1: [],
      team2: [],
      team1Assignments: {},
      team2Assignments: {},
      team1TotalScore: 0,
      team2TotalScore: 0,
      scoreDifference: 0,
      message: `알고리즘 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}