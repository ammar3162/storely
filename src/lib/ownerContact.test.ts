import { describe, it, expect } from 'vitest'
import { pickOwnerWhatsapp } from './ownerContact'

describe('owner WhatsApp number', () => {
  it('prefers the number the customer set in settings', () => {
    expect(pickOwnerWhatsapp('+201155842590', '557766766')).toBe('201155842590')
  })
  it('falls back to the sign-up phone, in international format', () => {
    expect(pickOwnerWhatsapp(null, '557766766')).toBe('966557766766')
    expect(pickOwnerWhatsapp('', '0557766766')).toBe('966557766766')
  })
  it('nothing usable → null', () => {
    expect(pickOwnerWhatsapp(null, null)).toBeNull()
  })
})
