/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-only packages that should not be bundled into the client
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'exceljs'],
};

module.exports = nextConfig;
