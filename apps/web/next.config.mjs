/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the workspace's pure types/constants package from source.
  transpilePackages: ['@yule/shared-types'],
  // Legacy operational screens (dashboard/agents/tasks/sessions) are retired —
  // the app is the pixel-art Pixel Office. Send any old path there.
  async redirects() {
    return ['/dashboard', '/agents', '/agents/:path*', '/tasks', '/tasks/:path*', '/sessions', '/sessions/:path*'].map(
      (source) => ({ source, destination: '/office', permanent: false }),
    );
  },
  webpack: (config) => {
    // The packages use NodeNext-style explicit `.js` import specifiers that
    // actually point at `.ts` sources. Teach webpack to resolve them.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
