import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({
    STAFF_TOKEN_SECRET: !!process.env.STAFF_TOKEN_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
