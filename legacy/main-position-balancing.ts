import { Position, TeamMember } from '../lib/types'
import { calculateMemberTierScore } from '../lib/stats'

// 포지션별 그룹 정보
export interface PositionGroup {
  position: Position
  mainPositionMembers: TeamMember[]  // 주포지션인 선수들
  subPositionMembers: TeamMember[]   // 부포지션으로 가능한 선수들
  totalCandidates: number
  avgTierScore: number
}

// 팀 배치 결과
export interface TeamAssignment {
  team1: AssignedMember[]
  team2: AssignedMember[]
  team1TotalScore: number
  team2TotalScore: number
  scoreDifference: number
  mainPositionRate: number  // 주포지션 비율 (0-1)
}

// 배치된 선수 정보
export interface AssignedMember extends TeamMember {
  assignedPosition: Position
  isMainPosition: boolean
  positionScore: number     // 해당 포지션에서의 실력 점수
}

// 주포지션별로 선수들을 그룹 분류
export function groupByMainPosition(members: TeamMember[]): Map<Position, PositionGroup> {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionGroups = new Map<Position, PositionGroup>()

  for (const position of positions) {
    // 주포지션인 선수들
    const mainPositionMembers = members.filter(m => m.mainPosition === position)
    
    // 부포지션으로 가능한 선수들 (주포지션 제외)
    const subPositionMembers = members.filter(m => 
      m.mainPosition !== position && m.subPositions && m.subPositions.includes(position)
    )

    // 평균 티어 점수 계산 (주포지션 선수들 기준)
    const avgTierScore = mainPositionMembers.length > 0 
      ? Math.round(mainPositionMembers.reduce((sum, m) => sum + calculateMemberTierScore(m), 0) / mainPositionMembers.length)
      : 0

    positionGroups.set(position, {
      position,
      mainPositionMembers,
      subPositionMembers,
      totalCandidates: mainPositionMembers.length + subPositionMembers.length,
      avgTierScore
    })
  }

  return positionGroups
}

// 포지션별 최적 배치 계산
export function calculateOptimalPositionAssignment(
  group: PositionGroup,
  team1Size: number,
  team2Size: number
): { team1Members: TeamMember[], team2Members: TeamMember[] } {
  const { mainPositionMembers } = group

  if (mainPositionMembers.length === 0) {
    // 주포지션 선수가 없으면 부포지션 선수 사용
    return { team1Members: [], team2Members: [] }
  }

  if (mainPositionMembers.length === 1) {
    // 1명뿐이면 랜덤하게 한 팀에 배치
    const randomTeam = Math.random() < 0.5 ? 1 : 2
    return randomTeam === 1 
      ? { team1Members: [mainPositionMembers[0]], team2Members: [] }
      : { team1Members: [], team2Members: [mainPositionMembers[0]] }
  }

  if (mainPositionMembers.length === 2) {
    // 2명이면 각 팀에 하나씩
    // 티어 점수가 비슷하게 배치하기 위해 정렬
    const sorted = [...mainPositionMembers].sort((a, b) => 
      calculateMemberTierScore(b) - calculateMemberTierScore(a)
    )
    return {
      team1Members: [sorted[0]],
      team2Members: [sorted[1]]
    }
  }

  // 3명 이상인 경우: 최적 균형 찾기
  return findBestBalanceForPosition(mainPositionMembers, team1Size, team2Size)
}

// 포지션별 최적 균형 찾기 (3명 이상일 때)
function findBestBalanceForPosition(
  members: TeamMember[],
  team1Size: number,
  team2Size: number
): { team1Members: TeamMember[], team2Members: TeamMember[] } {
  const tierScores = members.map(m => calculateMemberTierScore(m))
  const totalMembers = members.length
  
  // 각 팀에 몇 명씩 배치할지 결정
  const team1Count = Math.min(team1Size, Math.floor(totalMembers / 2))
  const team2Count = Math.min(team2Size, totalMembers - team1Count)

  if (team1Count + team2Count > totalMembers) {
    // 배치할 수 있는 최대 인원 조정
    const maxTeam1 = Math.min(team1Size, totalMembers - 1)
    const maxTeam2 = totalMembers - maxTeam1
    return findBestBalanceForPosition(members, maxTeam1, maxTeam2)
  }

  // 티어 점수 기준으로 정렬 (높은 점수부터)
  const sortedMembers = [...members].sort((a, b) => 
    calculateMemberTierScore(b) - calculateMemberTierScore(a)
  )

  // 가능한 모든 조합 중 가장 균형잡힌 것 찾기
  let bestDifference = Infinity
  let bestTeam1: TeamMember[] = []
  let bestTeam2: TeamMember[] = []

  // 조합 생성 (비트마스크 사용)
  const maxCombinations = Math.min(1000, Math.pow(2, totalMembers)) // 성능 제한
  
  for (let mask = 0; mask < maxCombinations; mask++) {
    const team1: TeamMember[] = []
    const team2: TeamMember[] = []
    
    for (let i = 0; i < totalMembers; i++) {
      if (mask & (1 << i)) {
        team1.push(sortedMembers[i])
      } else {
        team2.push(sortedMembers[i])
      }
    }

    if (team1.length === team1Count && team2.length === team2Count) {
      const team1Score = team1.reduce((sum, m) => sum + calculateMemberTierScore(m), 0)
      const team2Score = team2.reduce((sum, m) => sum + calculateMemberTierScore(m), 0)
      const difference = Math.abs(team1Score - team2Score)

      if (difference < bestDifference) {
        bestDifference = difference
        bestTeam1 = team1
        bestTeam2 = team2
      }
    }
  }

  return {
    team1Members: bestTeam1,
    team2Members: bestTeam2
  }
}

// 빈 포지션을 부포지션 선수들로 보완
export function fillMissingPositions(
  currentAssignment: Partial<Record<Position, { team1Members: TeamMember[], team2Members: TeamMember[] }>>,
  positionGroups: Map<Position, PositionGroup>,
  unusedMembers: TeamMember[]
): TeamAssignment {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const team1: AssignedMember[] = []
  const team2: AssignedMember[] = []

  // 1단계: 주포지션으로 배치된 선수들 추가
  for (const position of positions) {
    const assignment = currentAssignment[position]
    if (assignment) {
      // Team1 추가
      for (const member of assignment.team1Members) {
        team1.push({
          ...member,
          assignedPosition: position,
          isMainPosition: true,
          positionScore: calculateMemberTierScore(member)
        })
      }
      
      // Team2 추가
      for (const member of assignment.team2Members) {
        team2.push({
          ...member,
          assignedPosition: position,
          isMainPosition: true,
          positionScore: calculateMemberTierScore(member)
        })
      }
    }
  }

  // 2단계: 빈 포지션 확인 및 보완
  const team1Positions = new Set(team1.map(m => m.assignedPosition))
  const team2Positions = new Set(team2.map(m => m.assignedPosition))
  
  for (const position of positions) {
    const needsTeam1 = !team1Positions.has(position)
    const needsTeam2 = !team2Positions.has(position)
    
    if (needsTeam1 || needsTeam2) {
      // 부포지션으로 가능한 미사용 선수들 찾기
      const availableMembers = unusedMembers.filter(m => m.subPositions && m.subPositions.includes(position))
      
      if (availableMembers.length === 0) {
        console.warn(`${position} 포지션을 채울 선수가 없습니다.`)
        continue
      }

      // 티어 점수 기준으로 정렬
      const sortedAvailable = availableMembers.sort((a, b) => 
        calculateMemberTierScore(b) - calculateMemberTierScore(a)
      )

      if (needsTeam1 && needsTeam2) {
        // 양쪽 팀 모두 필요한 경우
        if (sortedAvailable.length >= 2) {
          team1.push({
            ...sortedAvailable[0],
            assignedPosition: position,
            isMainPosition: false,
            positionScore: Math.round(calculateMemberTierScore(sortedAvailable[0]) * 0.95) // 95% 가중치
          })
          
          team2.push({
            ...sortedAvailable[1],
            assignedPosition: position,
            isMainPosition: false,
            positionScore: Math.round(calculateMemberTierScore(sortedAvailable[1]) * 0.95)
          })
          
          // 사용된 선수들 제거
          const usedIds = [sortedAvailable[0].id, sortedAvailable[1].id]
          unusedMembers = unusedMembers.filter(m => !usedIds.includes(m.id))
        }
      } else {
        // 한쪽 팀만 필요한 경우
        const targetTeam = needsTeam1 ? team1 : team2
        targetTeam.push({
          ...sortedAvailable[0],
          assignedPosition: position,
          isMainPosition: false,
          positionScore: Math.round(calculateMemberTierScore(sortedAvailable[0]) * 0.95)
        })
        
        unusedMembers = unusedMembers.filter(m => m.id !== sortedAvailable[0].id)
      }
    }
  }

  // 3단계: 점수 계산
  const team1TotalScore = team1.reduce((sum, m) => sum + m.positionScore, 0)
  const team2TotalScore = team2.reduce((sum, m) => sum + m.positionScore, 0)
  const scoreDifference = Math.abs(team1TotalScore - team2TotalScore)
  
  const mainPositionCount = [...team1, ...team2].filter(m => m.isMainPosition).length
  const mainPositionRate = mainPositionCount / (team1.length + team2.length)

  return {
    team1,
    team2,
    team1TotalScore,
    team2TotalScore,
    scoreDifference,
    mainPositionRate
  }
}

// 메인 알고리즘: 주포지션 우선 팀 밸런싱
export function mainPositionFirstBalancing(members: TeamMember[]): TeamAssignment | null {
  if (members.length !== 10) {
    console.error(`정확히 10명이 필요합니다. 현재: ${members.length}명`)
    return null
  }

  console.log('주포지션 우선 팀 밸런싱 시작')

  // 1단계: 포지션별 그룹 분류
  const positionGroups = groupByMainPosition(members)
  console.log('포지션 분석:', 
    Array.from(positionGroups.entries()).map(([pos, group]) => 
      `${pos}: 주포지션 ${group.mainPositionMembers.length}명, 부포지션 ${group.subPositionMembers.length}명`
    )
  )

  // 2단계: 각 포지션별로 최적 배치 계산
  const positionAssignments: Partial<Record<Position, { team1Members: TeamMember[], team2Members: TeamMember[] }>> = {}
  const usedMembers = new Set<string>()

  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  
  for (const position of positions) {
    const group = positionGroups.get(position)!
    
    if (group.mainPositionMembers.length >= 2) {
      // 주포지션 선수가 2명 이상이면 배치 계산
      const remainingTeam1Size = 5 - Array.from(usedMembers).filter(id => 
        members.find(m => m.id === id && positionAssignments[m.mainPosition]?.team1Members.some(tm => tm.id === id))
      ).length
      
      const remainingTeam2Size = 5 - Array.from(usedMembers).filter(id => 
        members.find(m => m.id === id && positionAssignments[m.mainPosition]?.team2Members.some(tm => tm.id === id))
      ).length

      const assignment = calculateOptimalPositionAssignment(group, remainingTeam1Size, remainingTeam2Size)
      positionAssignments[position] = assignment
      
      // 사용된 선수들 추적
      assignment.team1Members.forEach(m => usedMembers.add(m.id))
      assignment.team2Members.forEach(m => usedMembers.add(m.id))
      
      console.log(`${position} 배치: Team1 ${assignment.team1Members.length}명, Team2 ${assignment.team2Members.length}명`)
    }
  }

  // 3단계: 빈 포지션 보완 및 최종 팀 구성
  const unusedMembers = members.filter(m => !usedMembers.has(m.id))
  const finalAssignment = fillMissingPositions(positionAssignments, positionGroups, unusedMembers)

  console.log(`밸런싱 완료: 점수 차이 ${finalAssignment.scoreDifference}점, 주포지션 비율 ${Math.round(finalAssignment.mainPositionRate * 100)}%`)

  return finalAssignment
}