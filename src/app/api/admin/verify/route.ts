import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()
  const correct = process.env.ADMIN_PASSWORD || 'storely@2026'
  if (password === correct) return NextResponse.json({ ok: true })
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
