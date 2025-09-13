import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SignUpFormProps {
  name: string
  email: string
  password: string
  username: string
  usernameError: string
  usernameSuggestions: string[]
  isCheckingUsername: boolean
  isLoading: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onSubmit: () => void
  onToggleMode: () => void
  onSelectSuggestion: (suggestion: string) => void
}

const SignUpForm = memo(function SignUpForm({
  name,
  email,
  password,
  username,
  usernameError,
  usernameSuggestions,
  isCheckingUsername,
  isLoading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onSubmit,
  onToggleMode,
  onSelectSuggestion
}: SignUpFormProps) {
  return (
    <>
      <Input
        type="text"
        placeholder="이름 (실명)"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-12"
        required
      />
      
      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="h-12"
        required
      />

      {/* 닉네임 입력 (선택사항) */}
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="게이머 닉네임 (선택사항, 2-20자)"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className={`h-12 ${usernameError ? 'border-red-500' : username && !isCheckingUsername && !usernameError ? 'border-green-500' : ''}`}
        />
        
        {isCheckingUsername && (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            닉네임 확인 중...
          </p>
        )}
        
        {usernameError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {usernameError}
          </p>
        )}
        
        {username && !isCheckingUsername && !usernameError && (
          <p className="text-sm text-green-600 dark:text-green-400">
            사용 가능한 닉네임입니다!
          </p>
        )}

        {/* 닉네임 추천 */}
        {usernameSuggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">추천 닉네임:</p>
            <div className="flex flex-wrap gap-1">
              {usernameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          닉네임은 나중에 설정할 수도 있습니다.
        </p>
      </div>

      <Input
        type="password"
        placeholder="비밀번호 (6자 이상)"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="h-12"
        required
      />

      <Button
        onClick={onSubmit}
        disabled={isLoading || (!!username && !!usernameError)}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? '처리 중...' : '회원가입'}
      </Button>

      <div className="text-center space-y-2">
        <button
          onClick={onToggleMode}
          className="text-sm text-blue-600 hover:text-blue-700 block w-full"
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </>
  )
})

export default SignUpForm