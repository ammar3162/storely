import { describe, it, expect, beforeAll } from 'vitest'

describe('private invoice links', () => {
  const base = 'https://abcdefghijklmnopqrst.supabase.co'
  const org = '1f6f56d2-8ce3-4af4-b23e-a481c99719d2'
  let m: typeof import('./invoiceUrl')
  beforeAll(async () => { process.env.NEXT_PUBLIC_SUPABASE_URL = base; m = await import('./invoiceUrl') })

  it('reads the path and the owning org from every upload style', () => {
    const owner = `${base}/storage/v1/object/public/invoices/${org}/invoice-1.jpg`
    const staff = `${base}/storage/v1/object/public/invoices/invoices/${org}-1700.jpg`
    const task = `${base}/storage/v1/object/public/invoices/task-photos/${org}-1700.jpg`
    expect(m.orgOfInvoicePath(m.storedInvoicePath(owner)!)).toBe(org)
    expect(m.orgOfInvoicePath(m.storedInvoicePath(staff)!)).toBe(org)
    expect(m.orgOfInvoicePath(m.storedInvoicePath(task)!)).toBe(org)
  })
  it('rejects other hosts, other buckets and path tricks', () => {
    expect(m.storedInvoicePath(`https://evil.com/storage/v1/object/public/invoices/${org}/a.jpg`)).toBeNull()
    expect(m.storedInvoicePath(`${base}/storage/v1/object/public/org-logos/${org}/logo.png`)).toBeNull()
    expect(m.storedInvoicePath(`${base}/storage/v1/object/public/invoices/../x`)).toBeNull()
    expect(m.orgOfInvoicePath('random/file.jpg')).toBeNull()
  })
  it('turns stored links into the protected link and leaves others alone', () => {
    const u = `${base}/storage/v1/object/public/invoices/${org}/invoice-1.jpg`
    expect(m.fileLink(u)).toBe(`/api/file?u=${encodeURIComponent(u)}`)
    expect(m.fileLink(u, 'https://storely.dev')).toBe(`https://storely.dev/api/file?u=${encodeURIComponent(u)}`)
    expect(m.fileLink('https://example.com/x.png')).toBe('https://example.com/x.png')
    expect(m.fileLink(null)).toBe('')
  })
})
