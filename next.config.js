/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jest worker 에러 해결을 위한 최소한의 설정
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  
  // webpack 설정 - Jest worker 문제만 해결
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 코드 분할만 비활성화 (Jest worker 에러 해결)
      config.optimization.splitChunks = false
      
      // 병렬 처리 제한
      config.parallelism = 1
    }
    return config
  },
}

module.exports = nextConfig