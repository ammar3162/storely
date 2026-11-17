import { describe, it, expect } from 'vitest'
import { sniffSafeType, storedFileHeaders } from './fileSniff'

const bytes = (...xs: (number | string)[]) => new Uint8Array(xs.flatMap(x => typeof x === 'string' ? [...x].map(c => c.charCodeAt(0)) : [x]))

describe('real file type from content', () => {
  it('recognises real images and PDFs', () => {
    expect(sniffSafeType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('image/jpeg')
    expect(sniffSafeType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png')
    expect(sniffSafeType(bytes('GIF89a', 0, 0))).toBe('image/gif')
    expect(sniffSafeType(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp')
    expect(sniffSafeType(bytes(0, 0, 0, 0x18, 'ftypheic', 0, 0))).toBe('image/heic')
    expect(sniffSafeType(bytes('%PDF-1.7\n'))).toBe('application/pdf')
  })
  it('rejects HTML, SVG, scripts and empty files even if they claim to be images', () => {
    expect(sniffSafeType(bytes('<!doctype html><script>'))).toBeNull()
    expect(sniffSafeType(bytes('<svg xmlns="http://www.w3.org/2000/svg" onload='))).toBeNull()
    expect(sniffSafeType(bytes('<?xml version="1.0"?><svg'))).toBeNull()
    expect(sniffSafeType(bytes())).toBeNull()
  })
})

describe('headers when serving a stored file from our domain', () => {
  it('unknown content downloads in a sandbox instead of rendering', () => {
    const h = storedFileHeaders(null, 10)
    expect(h['Content-Type']).toBe('application/octet-stream')
    expect(h['Content-Disposition']).toMatch(/^attachment/)
    expect(h['Content-Security-Policy']).toContain('sandbox')
  })
  it('images render with their real type, sandboxed; PDFs render inline', () => {
    expect(storedFileHeaders('image/png', 10)).toMatchObject({ 'Content-Type': 'image/png', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' })
    expect(storedFileHeaders('image/png', 10)['Content-Security-Policy']).toContain('sandbox')
    expect(storedFileHeaders('application/pdf', 10)).toMatchObject({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' })
  })
})
