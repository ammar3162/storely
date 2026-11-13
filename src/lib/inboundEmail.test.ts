import { describe, it, expect } from 'vitest'
import { parseFrom, isOwnAddress, htmlToText, stripQuoted } from './inboundEmail'

describe('inbound email cleaning', () => {
  it('parses the sender name and address', () => {
    expect(parseFrom('"Sara Ali" <Sara@Example.com>', '')).toEqual({ email: 'sara@example.com', name: 'Sara Ali' })
    expect(parseFrom('مقهى ريحان <owner@cafe.sa>', '')).toEqual({ email: 'owner@cafe.sa', name: 'مقهى ريحان' })
    expect(parseFrom(null, 'x@y.com')).toEqual({ email: 'x@y.com', name: null })
  })
  it('ignores our own addresses (loops and bounces)', () => {
    expect(isOwnAddress('support@storely.dev')).toBe(true)
    expect(isOwnAddress('support@pafwon.resend.app')).toBe(true)
    expect(isOwnAddress('owner@gmail.com')).toBe(false)
  })
  it('turns html into readable text', () => {
    expect(htmlToText('<div>مرحبا<br>شكراً</div><style>p{}</style><p>a &amp; b</p>')).toBe('مرحبا\nشكراً\na & b')
  })
  it('keeps only the new reply, without the quoted original', () => {
    expect(stripQuoted('تمام، شكراً\n\nOn Thu, Nov 13, 2026 at 10:00 فريق Storely <support@storely.dev> wrote:\n> رسالتنا')).toBe('تمام، شكراً')
    expect(stripQuoted('أبي أفعّل المخزون\n\nفي الخميس، 13 نوفمبر 2026، كتب فريق Storely:\n> نص')).toBe('أبي أفعّل المخزون')
    expect(stripQuoted('سطر\n> مقتبس\nسطر ثاني')).toBe('سطر\nسطر ثاني')
    expect(stripQuoted('> كله مقتبس')).toBe('> كله مقتبس')
  })
})
