import { NextResponse } from 'next/server'

// رقم النسخة المنشورة — الصفحات المفتوحة تقارنه بنسختها وتحدّث نفسها لو تغيّر
export async function GET() {
  return NextResponse.json({ build: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' }, { headers: { 'Cache-Control': 'no-store' } })
}
