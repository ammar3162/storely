import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: 'https://storely.dev', lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: 'https://storely.dev/login', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://storely.dev/login?mode=register', lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://storely.dev/privacy', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://storely.dev/terms', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
