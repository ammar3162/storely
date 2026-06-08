import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path      = request.nextUrl.pathname
  const isLogin   = path.startsWith('/login')
  const isPending = path.startsWith('/pending')
  const isApi     = path.startsWith('/api')
  const isStatic  = path.startsWith('/_next') || path.startsWith('/favicon') || path.includes('.')
  const isAdminPanel = path.startsWith('/storely-admin')
  const isStaff = path.startsWith('/staff')
  const isPublic  = isLogin || isPending || isApi || isAdminPanel || isStaff || isStatic

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLogin) {
    const { data: profile } = await supabase
      .from('profiles').select('status').eq('id', user.id).single()

    if (profile?.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    if (profile?.status === 'suspended') {
      return NextResponse.redirect(new URL('/login?reason=suspended', request.url))
    }
    if (profile?.status === 'deleted') {
      return NextResponse.redirect(new URL('/login?reason=deleted', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles').select('status,subscription_type,subscription_ends_at,role').eq('id', user.id).single()

    if (profile?.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    if (profile?.status === 'suspended' || profile?.status === 'deleted') {
      await supabase.auth.signOut()
      const reason = profile.status === 'suspended' ? 'suspended' : 'deleted'
      return NextResponse.redirect(new URL('/login?reason='+reason, request.url))
    }

    if (profile?.subscription_type === 'paid' && profile?.subscription_ends_at) {
      const expired = new Date(profile.subscription_ends_at).getTime() < Date.now()
      if (expired) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?reason=expired', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
