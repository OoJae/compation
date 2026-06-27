/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace libraries are TS source — let Next transpile them.
  transpilePackages: ['@compation/agent', '@compation/shared'],
  // Keep the heavy node-only chain SDKs external to the server bundle.
  serverExternalPackages: ['@injectivelabs/sdk-ts', '@injectivelabs/networks', '@prisma/client', 'prisma'],
};

export default nextConfig;
