import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://www.storely.dev', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://www.storely.dev/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://www.storely.dev/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
