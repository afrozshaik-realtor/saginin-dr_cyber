/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: "15mb"
    },
    workerThreads: false,
    cpus: 1
  }
};

export default nextConfig;
