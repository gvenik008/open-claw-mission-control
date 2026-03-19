/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/proxy/gateway/:path*",
        destination: "http://127.0.0.1:18789/:path*",
      },
    ];
  },
};

export default nextConfig;
