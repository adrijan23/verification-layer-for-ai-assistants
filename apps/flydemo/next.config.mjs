/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The gateway streams responses through; keep upstream uncompressed.
  compress: false,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
