import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Monorepo: undvik att Next.js tror att repots rot är app-roten
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Använd erp/.eslintrc.json (root: true), inte förälderns config
    dirs: ["app", "core", "modules", "tests"],
  },
};

export default nextConfig;
