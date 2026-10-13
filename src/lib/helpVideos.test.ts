import { describe, it, expect } from 'vitest'
import { youtubeId, helpKeyFor } from './helpVideos'

describe('help videos', () => {
  it('accepts only YouTube links', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('javascript:alert(1)')).toBeNull()
    expect(youtubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeId('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeId('https://youtube.com/watch?v=short')).toBeNull()
  })
  it('maps a page to its key (longest match)', () => {
    expect(helpKeyFor('/inventory')).toBe('/inventory')
    expect(helpKeyFor('/staff/purchases')).toBe('/staff/purchases')
    expect(helpKeyFor('/staff')).toBe('/staff')
    expect(helpKeyFor('/staff/choose')).toBe('/staff')
    expect(helpKeyFor('/staffing')).toBeNull()
    expect(helpKeyFor('/storely-admin')).toBeNull()
  })
})

import { HELP_PAGES } from './helpVideos'
describe('help pages cover every page', () => {
  it('maps the add-ons, approved suppliers and staff inventory pages', () => {
    expect(helpKeyFor('/addons-market')).toBe('/addons-market')
    expect(helpKeyFor('/marketplace/abc')).toBe('/marketplace')
    expect(helpKeyFor('/staff/inventory')).toBe('/staff/inventory')
  })
  it('every dashboard and staff page has an entry', async () => {
    const fs = await import('fs')
    const dash = fs.readdirSync('src/app/(dashboard)', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => '/' + d.name)
    const staff = fs.readdirSync('src/app/staff', { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('qa-') && d.name !== 'choose').map(d => '/staff/' + d.name)
    const keys = new Set(HELP_PAGES.map(p => p.key))
    expect([...dash, ...staff].filter(k => !keys.has(k))).toEqual([])
  })
})
