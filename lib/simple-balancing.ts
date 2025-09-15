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

// 간단한 포지션 커버리지 밸런싱 알고리즘 (포지션 할당 없음)
export function generateSimplePositionCoverageBalancing(
  members: TeamMember[]
): SimpleBalancingResult {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  console.log('🎯 간단한 포지션 커버리지 밸런싱 시작')
  
  // 모든 가능한 5명 팀 조합 생성
  const combinations = getCombinations(members, 5)
  console.log(`💭 ${combinations.length}개의 팀 조합 검토 중...`)
  
  const validSplits: Array<{
    team1: TeamMember[]
    team2: TeamMember[]
    team1Score: number
    team2Score: number
    scoreDifference: number
  }> = []
  
  // 성능을 위해 최대 2000개 조합만 검토
  const maxCombinations = Math.min(combinations.length, 2000)
  
  for (let i = 0; i < maxCombinations; i++) {
    const team1 = combinations[i]
    const team2 = members.filter(m => !team1.find(t1 => t1.id === m.id))
    
    // 각 팀이 모든 포지션을 최소 2명씩 커버할 수 있는지 확인
    const team1Valid = checkMinimumPositionCoverage(team1, positions)
    const team2Valid = checkMinimumPositionCoverage(team2, positions)
    
    if (team1Valid && team2Valid) {
      const team1Score = team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
      const team2Score = team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
      const scoreDifference = Math.abs(team1Score - team2Score)
      
      validSplits.push({
        team1,
        team2,
        team1Score,
        team2Score,
        scoreDifference
      })
    }
  }
  
  console.log(`✅ ${validSplits.length}개의 유효한 포지션 커버리지 조합 발견`)
  
  if (validSplits.length === 0) {
    return {
      success: false,
      team1: [],
      team2: [],
      team1Assignments: {},
      team2Assignments: {},
      team1TotalScore: 0,
      team2TotalScore: 0,
      scoreDifference: 0,
      message: '각 포지션에 최소 2명씩 배정할 수 있는 팀 조합이 없습니다.'
    }
  }
  
  // 점수 차이가 가장 적은 조합 선택
  const bestSplit = validSplits.sort((a, b) => a.scoreDifference - b.scoreDifference)[0]
  
  console.log(`🎉 간단한 포지션 커버리지 밸런싱 성공! 점수차: ${bestSplit.scoreDifference}`)
  
  return {
    success: true,
    team1: bestSplit.team1,
    team2: bestSplit.team2,
    team1Assignments: {}, // 포지션 할당 없음
    team2Assignments: {}, // 포지션 할당 없음
    team1TotalScore: bestSplit.team1Score,
    team2TotalScore: bestSplit.team2Score,
    scoreDifference: bestSplit.scoreDifference,
    message: `포지션 커버리지 밸런싱 완료 (점수차: ${bestSplit.scoreDifference}점)`
  }
}

// 포지션 커버리지를 보장하는 팀 분할 생성
function generateTeamSplitsWithPositionCoverage(
  members: TeamMember[],
  candidates: PositionCandidates
): Array<{
  team1: TeamMember[]
  team2: TeamMember[]
  team1Assignments: Record<string, Position>
  team2Assignments: Record<string, Position>
  team1Score: number
  team2Score: number
  scoreDifference: number
}> {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const validSplits: any[] = []
  
  // 모든 가능한 5명 조합 생성
  const combinations = getCombinations(members, 5)
  
  console.log(`💭 ${combinations.length}개의 팀 조합 검토 중...`)
  
  for (let i = 0; i < Math.min(combinations.length, 1000); i++) { // 성능을 위해 1000개로 제한
    const team1 = combinations[i]
    const team2 = members.filter(m => !team1.find(t1 => t1.id === m.id))
    
    // 각 팀이 모든 포지션을 커버할 수 있는지 확인
    const team1Coverage = checkPositionCoverage(team1, positions)
    const team2Coverage = checkPositionCoverage(team2, positions)
    
    if (team1Coverage.canCoverAll && team2Coverage.canCoverAll) {
      // 최적 포지션 할당
      const team1Assignments = assignOptimalPositions(team1, positions)
      const team2Assignments = assignOptimalPositions(team2, positions)
      
      if (team1Assignments && team2Assignments) {
        const team1Score = team1.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
        const team2Score = team2.reduce((sum, member) => sum + calculateMemberTierScore(member), 0)
        const scoreDifference = Math.abs(team1Score - team2Score)
        
        validSplits.push({
          team1,
          team2,
          team1Assignments,
          team2Assignments,
          team1Score,
          team2Score,
          scoreDifference
        })
      }
    }
  }
  
  console.log(`✅ ${validSplits.length}개의 유효한 포지션 커버리지 조합 발견`)
  
  return validSplits.sort((a, b) => a.scoreDifference - b.scoreDifference)
}

// 각 포지션에 최소 2명씩 있는지 확인
function checkMinimumPositionCoverage(
  team: TeamMember[], 
  positions: Position[]
): boolean {
  const coverage: Record<Position, number> = {
    top: 0, jungle: 0, mid: 0, adc: 0, support: 0
  }
  
  for (const member of team) {
    for (const position of positions) {
      if (canMemberPlay(member, position)) {
        coverage[position]++
      }
    }
  }
  
  // 모든 포지션에 최소 2명씩 있어야 함
  return positions.every(pos => coverage[pos] >= 2)
}

// 포지션 커버리지 확인 (기존 함수 유지 - 호환성)
function checkPositionCoverage(
  team: TeamMember[], 
  positions: Position[]
): { canCoverAll: boolean, coverage: Record<Position, number> } {
  const coverage: Record<Position, number> = {
    top: 0, jungle: 0, mid: 0, adc: 0, support: 0
  }
  
  for (const member of team) {
    for (const position of positions) {
      if (canMemberPlay(member, position)) {
        coverage[position]++
      }
    }
  }
  
  const canCoverAll = positions.every(pos => coverage[pos] >= 1) // 각 포지션에 최소 1명
  return { canCoverAll, coverage }
}

// 최적 포지션 할당
function assignOptimalPositions(
  team: TeamMember[], 
  positions: Position[]
): Record<string, Position> | null {
  const assignments: Record<string, Position> = {}
  const usedPositions = new Set<Position>()
  const usedMembers = new Set<string>()
  
  // 1단계: 해당 포지션만 할 수 있는 멤버들 우선 배정
  for (const position of positions) {
    const exclusiveMembers = team.filter(member =>
      !usedMembers.has(member.id) &&
      canMemberPlay(member, position) &&
      (member.mainPosition === position && member.subPositions.length === 0) // 해당 포지션만 가능한 멤버
    )
    
    if (exclusiveMembers.length > 0) {
      const bestMember = exclusiveMembers.reduce((best, member) =>
        calculateMemberTierScore(member) > calculateMemberTierScore(best) ? member : best
      )
      assignments[bestMember.id] = position
      usedPositions.add(position)
      usedMembers.add(bestMember.id)
    }
  }
  
  // 2단계: 남은 포지션에 대해 최적 멤버 배정
  for (const position of positions) {
    if (usedPositions.has(position)) continue
    
    const availableMembers = team.filter(member =>
      !usedMembers.has(member.id) &&
      canMemberPlay(member, position)
    )
    
    if (availableMembers.length === 0) {
      return null // 할당 불가능
    }
    
    // 주포지션 우선, 그 다음 티어점수 순으로 정렬
    availableMembers.sort((a, b) => {
      const aIsMain = a.mainPosition === position ? 1 : 0
      const bIsMain = b.mainPosition === position ? 1 : 0
      if (aIsMain !== bIsMain) return bIsMain - aIsMain // 주포지션 우선
      return calculateMemberTierScore(b) - calculateMemberTierScore(a) // 점수 높은 순
    })
    
    const bestMember = availableMembers[0]
    assignments[bestMember.id] = position
    usedPositions.add(position)
    usedMembers.add(bestMember.id)
  }
  
  return assignments
}

// 조합 생성 헬퍼 함수
function getCombinations<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (array.length === 0) return []
  
  const [head, ...tail] = array
  const withHead = getCombinations(tail, size - 1).map(combo => [head, ...combo])
  const withoutHead = getCombinations(tail, size)
  
  return [...withHead, ...withoutHead]
}

// 기존 함수는 유지 (호환성을 위해)
export function generateValidAssignments(
  candidates: PositionCandidates, 
  maxAssignments: number = 300
): PositionAssignment[] {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  console.log('🎯 탐욕적 할당 알고리즘 시작')
  
  // 각 포지션별 후보 수로 정렬 (적은 후보부터 우선 할당)
  const sortedPositions = positions.sort((a, b) => 
    candidates[a].length - candidates[b].length
  )
  
  console.log('📊 포지션별 우선순위:', sortedPositions.map(pos => 
    `${pos}: ${candidates[pos].length}명`).join(', '))

  const assignment: PositionAssignment = {}
  const usedMembers = new Set<string>()

  // 각 포지션에 2명씩 할당
  for (const position of sortedPositions) {
    const availableCandidates = candidates[position].filter(member => 
      !usedMembers.has(member.id)
    )
    
    console.log(`🔄 ${position} 포지션: ${availableCandidates.length}명 후보 중 2명 선택`)
    
    if (availableCandidates.length < 2) {
      console.log(`❌ ${position} 포지션에 충분한 후보 없음 (${availableCandidates.length}/2)`)
      console.log(`📋 ${position} 포지션 전체 후보:`, candidates[position].map(m => `${m.nickname}(${usedMembers.has(m.id) ? '사용됨' : '사용가능'})`))
      return [] // 할당 실패
    }
    
    // 상위 2명 선택 (티어 점수 기준)
    const topCandidates = availableCandidates
      .sort((a, b) => b.stats.tierScore - a.stats.tierScore)
      .slice(0, 2)
    
    for (const member of topCandidates) {
      assignment[member.id] = position
      usedMembers.add(member.id)
    }
    
    console.log(`✅ ${position} 할당 완료: ${topCandidates.map(m => m.nickname).join(', ')}`)
  }

  if (Object.keys(assignment).length === 10) {
    console.log('🎉 탐욕적 할당 성공: 10명 모두 할당됨')
    return [assignment]
  } else {
    console.log(`❌ 할당 실패: ${Object.keys(assignment).length}/10명만 할당됨`)
    return []
  }
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
    
    if (positionMembers.length < 2) {
      // 해당 포지션에 2명 미만인 경우 밸런싱 불가능
      console.log(`❌ ${position} 포지션에 ${positionMembers.length}명만 있어서 팀 분할 불가능`)
      return
      
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

    // 3단계: 간단한 포지션 커버리지 밸런싱 실행
    console.log('🎯 간단한 포지션 커버리지 밸런싱 실행...')
    const result = generateSimplePositionCoverageBalancing(members)
    
    if (result.success) {
      console.log(`🎉 포지션 커버리지 우선 밸런싱 완료! 점수 차이: ${result.scoreDifference}`)
      return result
    } else {
      console.log('❌ 포지션 커버리지 우선 밸런싱 실패, 기존 방식으로 시도...')
      
      // 4단계: 기존 방식으로 폴백
      const assignments = generateValidAssignments(candidates, 500)
      console.log(`생성된 할당 수: ${assignments.length}개`)

      if (assignments.length === 0) {
        // 각 포지션별 후보 수 분석
        const allPositions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
        const positionAnalysis = allPositions.map((pos: Position) => {
          const canPlay = members.filter(member => canMemberPlay(member, pos))
          return `${pos}: ${canPlay.length}명 (${canPlay.map(m => m.nickname).join(', ')})`
        }).join('\n')
        
        return {
          success: false,
          team1: [],
          team2: [],
          team1Assignments: {},
          team2Assignments: {},
          team1TotalScore: 0,
          team2TotalScore: 0,
          scoreDifference: 0,
          message: `포지션별 후보 부족으로 밸런싱 불가능:\n${positionAnalysis}\n\n각 포지션에 최소 2명씩 필요합니다.`
        }
      }

      // 5단계: 기존 방식으로 최적 팀 분할 찾기
      let bestResult: SimpleBalancingResult | null = null
      let bestScoreDifference = Infinity

      console.log('기존 방식으로 최적 팀 분할 탐색 중...')
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
              message: `기존 방식 밸런싱 완료! 점수 차이: ${teamSplit.scoreDifference}점`
            }
          }
        } catch (error) {
          console.warn(`할당 ${i} 처리 중 오류:`, error)
          continue
        }
      }

      if (!bestResult) {
        return result // 포지션 커버리지 밸런싱 실패 메시지 반환
      }

      console.log(`기존 방식 밸런싱 완료: 점수 차이 ${bestResult.scoreDifference}점`)
      return bestResult
    }

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