import { NextResponse } from 'next/server'

export async function GET() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const priv = process.env.VAPID_PRIVATE_KEY || ''
  return NextResponse.json({
    public_length: pub.length,
    public_first5: pub.slice(0, 5),
    public_last5: pub.slice(-5),
    public_has_equals: pub.includes('='),
    public_has_whitespace: /\s/.test(pub),
    private_length: priv.length,
    private_first5: priv.slice(0, 5),
    private_last5: priv.slice(-5),
    private_has_equals: priv.includes('='),
    private_has_whitespace: /\s/.test(priv),
  })
}
