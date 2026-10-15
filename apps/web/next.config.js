import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from monorepo root so pnpm workspace picks up shared env vars
dotenv.config({ path: resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@adaptlearn/shared",
    "@adaptlearn/agent-master",
    "@adaptlearn/agent-scout",
  ],
  webpack: (config) => {
    // Resolve .js imports to .ts files (ESM-style imports in monorepo packages)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
