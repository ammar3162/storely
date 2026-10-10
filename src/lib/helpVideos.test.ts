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
