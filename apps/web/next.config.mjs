/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the workspace's pure types/constants package from source.
  transpilePackages: ['@yule/shared-types'],
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
