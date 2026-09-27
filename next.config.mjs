/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: "15mb"
    }
  }
};

export default nextConfig;
