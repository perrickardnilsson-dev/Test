/** @type {import('next').NextConfig} */
const nextConfig = {
  // ERP-appen lever parallellt under /erp och har egen Next-process
  pageExtensions: ["ts", "tsx", "js", "jsx"],
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/erp/**", "**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
