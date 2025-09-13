import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginFormProps {
  loginId: string
  password: string
  isLoading: boolean
  onLoginIdChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onToggleMode: () => void
  onForgotPassword: () => void
}

const LoginForm = memo(function LoginForm({
  loginId,
  password,
  isLoading,
  onLoginIdChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
  onForgotPassword
}: LoginFormProps) {
  return (
    <>
      <Input
        type="text"
        placeholder="이메일 또는 닉네임"
        value={loginId}
        onChange={(e) => onLoginIdChange(e.target.value)}
        className="h-12"
        required
      />
      
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
        disabled={isLoading}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? '처리 중...' : '로그인'}
      </Button>

      <div className="text-center space-y-2">
        <button
          onClick={onToggleMode}
          className="text-sm text-blue-600 hover:text-blue-700 block w-full"
        >
          계정이 없으신가요? 회원가입
        </button>
        
        <button
          onClick={onForgotPassword}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          비밀번호를 잊으셨나요?
        </button>
      </div>
    </>
  )
})

export default LoginForm