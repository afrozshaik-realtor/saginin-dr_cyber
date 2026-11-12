/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      bodySizeLimit: "15mb"
    },
    workerThreads: false,
    cpus: 1
  },
  async headers() {
    // Safe-subset security headers. A full script-src CSP is deliberately NOT set: Next's inline scripts,
    // Turnstile and the arbitrary iframes allowed in legacy lessons would break without a nonce setup.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" }
        ]
      }
    ];
  }
};

export default nextConfig;
