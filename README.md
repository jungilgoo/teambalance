# Team Balance

리그 오브 레전드 내전을 위한 팀 관리 및 밸런싱 시스템

## 📋 프로젝트 개요

**Team Balance**는 친구들과 함께하는 리그 오브 레전드 내전에서 공정한 팀 구성과 전적 관리를 도와주는 웹 애플리케이션입니다.

- **타겟**: 정기적으로 내전하는 100-200명 규모 그룹
- **관리**: 1인 개발자 친화적 설계
- **기능**: 스마트 팀 밸런싱, 통계 분석, 실시간 세션 관리

## 🚀 주요 기능

- ✅ **하이브리드 인증**: 이메일 또는 닉네임으로 로그인
- ✅ **팀 관리**: 공개/비공개 팀 생성 및 멤버 관리
- ✅ **스마트 밸런싱**: 티어와 포지션을 고려한 자동 팀 구성
- ✅ **세션 관리**: 실시간 경기 세션 진행
- ✅ **통계 분석**: 승률, 티어 점수, 포지션별 성과 분석
- ✅ **보안**: HTTPOnly 쿠키, SQL 인젝션 방지, RLS 정책

## 🛠 기술 스택

- **프론트엔드**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Lucide 아이콘
- **백엔드**: Supabase (PostgreSQL, 인증, 실시간)
- **테스트**: Jest, Testing Library (70% 커버리지)
- **배포**: Vercel (권장), Netlify, Docker

## 📦 설치 및 실행

### 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 프로젝트

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone https://github.com/your-username/teambalance.git
cd teambalance
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
# .env.local 파일 생성 및 설정
cp .env.development .env.local

# 실제 Supabase 값으로 수정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. **데이터베이스 설정**
- `sql/supabase-schema.sql` 파일을 Supabase에서 실행
- Row Level Security (RLS) 정책 활성화

5. **개발 서버 실행**
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 🧪 테스트

```bash
# 전체 테스트 실행
npm run test

# 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage

# CI용 테스트 (무한 대기 없음)
npm run test:ci
```

## 📋 개발 명령어

```bash
# 개발 및 빌드
npm run dev          # 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작
npm run lint         # ESLint 검사
npm run type-check   # TypeScript 타입 검사

# 컴포넌트 추가
npx shadcn@latest add <component-name>
```

## 🚀 배포 가이드

### Vercel 배포 (권장)

1. **프로덕션 환경 변수 설정**
```bash
# .env.production 파일 확인 및 수정
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secure-secret
```

2. **빌드 검증**
```bash
npm run build
npm run type-check
```

3. **Vercel 배포**
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### Netlify 배포

1. **빌드 설정**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"
```

2. **환경 변수 설정**
- Netlify 대시보드에서 환경 변수 추가

### Docker 배포

```dockerfile
# Dockerfile (별도 작성 필요)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🏗 프로젝트 구조

```
TeamBalance/
├── app/                     # Next.js 15 App Router
│   ├── api/auth/           # 인증 API 라우트
│   ├── dashboard/          # 메인 대시보드
│   └── team/[teamId]/      # 팀 관리 페이지
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트
│   ├── auth/               # 인증 관련 컴포넌트
│   └── team/               # 팀 관리 컴포넌트
├── lib/
│   ├── api/                # API 함수들
│   ├── hooks/              # 커스텀 React 훅
│   └── types.ts            # TypeScript 타입 정의
├── __tests__/              # Jest 테스트
└── sql/                    # 데이터베이스 스키마
```

## 🔒 보안 기능

- **HTTPOnly 쿠키**: 안전한 세션 관리
- **입력 검증**: SQL 인젝션 방지를 위한 17개 검증 함수
- **CSRF 보호**: Origin 검증 및 보안 헤더
- **RLS 정책**: Supabase Row Level Security
- **환경 변수**: 민감 정보 보호

## 📊 테스트 커버리지

- **핵심 비즈니스 로직**: 85% (팀 밸런싱, 인증)
- **API 엔드포인트**: 75% (주요 라우트)
- **UI 컴포넌트**: 50% (기본 기능)
- **전체 목표**: 70% (실용적 수준)

## 🎯 핵심 알고리즘

### 스마트 팀 밸런싱
1. **티어 점수 계산**: 랭크와 승률 조합
   - 0-5경기: 티어 점수 100%
   - 6-20경기: 티어 70% + 승률 30%
   - 20경기+: 티어 50% + 승률 50%
2. **스네이크 드래프트**: 1-2-2-1 패턴으로 균형 조정
3. **포지션 최적화**: 메인/서브 포지션 고려

## 🤝 기여 가이드

1. **포크 및 클론**
2. **feature/기능명 브랜치 생성**
3. **테스트 작성 및 실행**
4. **타입 체크 및 린트 통과**
5. **Pull Request 생성**

## 📈 성능

- **First Load JS**: 320KB (최적화됨)
- **빌드 시간**: ~12초
- **정적 생성**: 17페이지 사전 렌더링
- **코드 분할**: vendor/common 청크 분리

## 🔄 실시간 기능

- **팀 상태 동기화**: 멤버 추가/제거 실시간 반영
- **세션 진행**: 경기 상태 변화 즉시 업데이트
- **알림 시스템**: 초대, 매치 결과 실시간 알림

## 🐛 문제 해결

### 일반적인 문제

**빌드 실패**
```bash
npm run type-check  # 타입 오류 확인
npm run lint       # ESLint 오류 수정
```

**Supabase 연결 실패**
- 환경 변수 확인
- RLS 정책 활성화 여부 확인
- 네트워크 연결 상태 확인

**로그인 문제**
- 쿠키 설정 확인
- CORS 정책 확인
- 환경 변수의 도메인 설정 확인

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 🙏 감사의 말

- **Supabase**: 백엔드 인프라
- **shadcn/ui**: 아름다운 UI 컴포넌트
- **Next.js**: 강력한 React 프레임워크
- **Vercel**: 배포 플랫폼

---

**개발자**: 1인 개발자 친화적 설계로 100-200명 규모 커뮤니티에 최적화되었습니다.