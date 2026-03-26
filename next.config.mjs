/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/site.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ]
  },
}

export default nextConfig
