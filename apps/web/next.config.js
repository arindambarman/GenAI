/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@adaptlearn/shared",
    "@adaptlearn/agent-master",
  ],
};

export default nextConfig;
