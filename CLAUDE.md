# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**한국어 프로젝트**: 모든 설명과 응답은 한국어로 작성하며, 코드 수정 후 변경된 파일 목록을 제공합니다.

## 프로젝트 개요

**TeamBalance (롤내전매니저)** - 리그 오브 레전드 내전 관리 시스템
- **목적**: 친구들끼리 LoL 내전 시 공정한 팀 구성과 전적 관리
- **타겟**: 정기적으로 내전하는 100-200명 규모 그룹 (1인 개발자 관리)
- **기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, shadcn/ui

## 개발 명령어

```bash
# 개발 및 빌드
npm run dev          # 개발 서버 시작 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작
npm run lint         # ESLint 코드 검사
npm run type-check   # TypeScript 타입 검사 (tsc --noEmit)

# 테스트 (Jest + Testing Library)
npm run test         # 테스트 실행
npm run test:watch   # 감시 모드
npm run test:coverage # 커버리지 리포트
npm run test:ci      # CI 환경용 테스트
npm run test:debug   # 디버그 모드 (상세한 출력)

# 패키지 관리
npm install          # 의존성 설치

# shadcn/ui 컴포넌트 추가
npx shadcn@latest add <component-name>
```

## 아키텍처 개요

### 핵심 기술 스택
- **프론트엔드**: Next.js 15 (App Router), React 19, TypeScript
- **UI 컴포넌트**: shadcn/ui (new-york 스타일) + Lucide 아이콘
- **스타일링**: Tailwind CSS + class-variance-authority (CVA)
- **폼 관리**: React Hook Form + Zod 검증
- **백엔드**: Supabase (PostgreSQL, 인증, 실시간)
- **테스트**: Jest + Testing Library (70% 실용적 커버리지)

### 주요 시스템 컴포넌트

**인증 시스템** (`lib/auth.ts`, `lib/auth-cookie.ts`)
- HTTPOnly 쿠키 기반 인증
- 하이브리드 로그인 (이메일 또는 닉네임)
- Supabase Auth 연동 및 소셜 로그인 준비 완료

**보안 계층** (`middleware.ts`, `lib/input-validator.ts`)
- SQL 인젝션 방지를 위한 핵심 입력 검증 함수
- CSRF 보호 및 필수 보안 헤더 설정
- Row Level Security (RLS) 기본 정책

**데이터 계층** (`lib/api/`, `lib/supabase-api.ts`)
- `lib/api/`의 모듈화된 API 구조
- `lib/supabase-api.ts`의 레거시 호환성 래퍼
- Supabase Realtime을 통한 실시간 구독

### 프로젝트 구조

```
TeamBalance/
├── app/                     # Next.js 15 App Router pages
│   ├── api/auth/           # Authentication API routes
│   ├── dashboard/          # Main dashboard
│   ├── team/[teamId]/      # Team management pages
│   └── session/[id]/       # Match session pages
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── auth/               # Authentication forms
│   ├── session/            # Session management
│   └── team/               # Team management
├── lib/
│   ├── api/                # Modular API functions
│   ├── hooks/              # Custom React hooks
│   ├── auth.ts             # Authentication system
│   ├── types.ts            # TypeScript interfaces
│   └── supabase-*.ts       # Supabase integration files
├── __tests__/              # Jest test files
├── sql/                    # Database migrations
└── middleware.ts           # Security middleware
```

## 핵심 데이터 모델

### 사용자 및 팀 시스템
- **User**: 이메일/닉네임 하이브리드 인증, 소셜 로그인 지원
- **Team**: 공개/비공개 팀, 리더/멤버 역할
- **TeamMember**: 티어, 포지션, 통계, 승인 시스템
- **Session**: 스마트 팀 밸런싱을 통한 세션 관리

### 게임 데이터
- **Match**: 챔피언 픽과 KDA가 포함된 5v5 경기 결과
- **MemberStats**: 승률, 티어 점수, 포지션별 성과
- **TierSystem**: 아이언 IV → 챌린저 티어별 점수 계산

## 팀 밸런싱 알고리즘

**스마트 밸런싱 시스템** (`lib/simple-balancing.ts`, `lib/stats.ts`)
1. **티어 점수 계산**: 티어 랭크와 승률을 종합한 점수 산출
   - 0-5경기: 티어 점수 100%
   - 6-20경기: 티어 70% + 승률 30%
   - 20경기 이상: 티어 50% + 승률 50%
2. **스네이크 드래프트**: 점수 기반 1-2-2-1 패턴 팀 배정
3. **포지션 자동 배치**: 탑 → 정글 → 미드 → 원딜 → 서포터 순서

## 보안 및 품질 기준

### 보안 기능 (프로덕션 수준)
- HTTPOnly 쿠키 인증
- 핵심 입력 검증 (이메일, 패스워드, 사용자 입력)
- Supabase 내장 보안 + 기본 RLS 정책
- Origin 검증을 통한 기본 CSRF 보호
- 필수 보안 헤더 설정

### 테스트 커버리지 (실용적 수준)
- **핵심 비즈니스 로직**: 85% 커버리지 (팀 밸런싱, 인증)
- **API 경로**: 75% 커버리지 (주요 엔드포인트)
- **UI 컴포넌트**: 50% 커버리지 (기본 기능)
- **전체 목표**: 70% 커버리지 (1인 개발자 관리 가능한 수준)

## 개발 가이드라인

### 코딩 컨벤션
- **TypeScript**: `lib/types.ts`의 실용적 타입 정의와 strict 모드
- **컴포넌트**: PascalCase 명명, 컴포넌트당 50-100줄
- **경로 별칭**: 모든 import에 `@/` 사용 (`@/components`, `@/lib`)
- **스타일링**: 컴포넌트 variant를 위한 CVA와 Tailwind CSS

### 파일 구조
- **페이지**: `app/[route]/page.tsx` (App Router 패턴)
- **컴포넌트**: `components/[feature]/ComponentName.tsx`
- **타입**: `lib/types.ts`에 중앙화
- **테스트**: `__tests__/`에 구조 미러링

### 개발 워크플로우 (실용적)
1. 복잡한 작업(3단계 이상)에 TodoWrite 계획 수립
2. 기존 패턴과 컨벤션 준수
3. 핵심 기능에 대한 테스트 작성 (선택적)
4. 권장사항: `npm run lint && npm run type-check` 실행
5. shadcn/ui 컴포넌트 우선 사용, 필요시 확장

## 현재 상태 (Phase 1 완료)

### 완료된 기능 ✅
- 하이브리드 로그인을 포함한 인증 시스템
- 팀 관리 (생성, 참가, 초대)
- 스마트 팀 밸런싱을 통한 세션 관리
- 챔피언 선택을 포함한 경기 결과 기록
- 통계 분석 및 티어 점수 계산
- 핵심 보안 기능 구현
- 실용적 테스트 커버리지

### 다음 단계 우선순위 (1인 개발자 현실 고려)
1. **핵심 기능 안정화**: 버그 수정 및 사용자 피드백 반영
2. **기본 실시간 기능**: 팀 상태 동기화 (선택적)
3. **사용자 경험 개선**: 성능 최적화 및 UI/UX 개선
4. **소셜 로그인**: 소셜 로그인 미사용 및 이메일, 비밀번호 사용(구현완료)

## 주요 참고 사항

- **한국어 인터페이스**: 모든 UI 텍스트와 응답은 한국어로 작성
- **Riot API 미사용**: Riot Games API 연동 없이 수동 데이터 입력 방식
- **Supabase 통합**: PostgreSQL, Auth, Realtime 완전 연동
- **프로덕션 준비**: HTTPOnly 쿠키, 입력 검증, RLS 정책 활성화
- **테스트 커버리지**: 70% 목표로 실용적 테스트 (100-200명 규모 적합)

## 주요 개발 작업

### 새로운 컴포넌트 추가
```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add dialog

# 새 컴포넌트 테스트
npm run test:watch -- ComponentName
```

### 데이터베이스 변경
```sql
-- sql/ 디렉토리의 마이그레이션 적용
-- 기본 RLS 정책 확인
-- 간단한 테스트로 검증
```

### 품질 검사 (권장)
```bash
# 필요시 품질 검사
npm run lint && npm run type-check

# 핵심 기능 테스트만
npm run test -- --testPathPattern="(auth|stats|balancing)"
```

이 코드베이스는 1인 개발자가 관리하기 적합한 수준의 보안과 실용적 테스트를 갖춘 100-200명 규모의 리그 오브 레전드 팀 관리 시스템입니다.