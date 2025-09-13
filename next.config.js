/** @type {import('next').NextConfig} */
const nextConfig = {
  // 성능 최적화 설정
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // 타입 체크 활성화 (프로덕션 준비)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint 활성화 (프로덕션 준비)
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // webpack 설정 최적화
  webpack: (config, { dev, isServer }) => {
    // 프로덕션에서만 최적화 적용
    if (!dev && !isServer) {
      // 코드 분할 최적화
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
      
      // 번들 최적화
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }
    
    // 개발 환경에서는 Jest 호환성을 위해 제한적 설정
    if (dev && !isServer) {
      // Jest와의 충돌을 최소화하기 위한 설정
      config.optimization.splitChunks = {
        chunks: 'async', // 비동기 청크만 분할
      }
    }
    
    return config
  },
  
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // 압축 활성화
  compress: true,
  
  // 실험적 성능 개선
  poweredByHeader: false,
  
}

module.exports = nextConfig