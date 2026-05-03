// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'pdf-parse'],
  },
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
