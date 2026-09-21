/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'exceljs', 'pdf-parse'],
  },
};

module.exports = nextConfig;
