import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-nzhczszgryexiilsughk-auth-token')
  const isLoggedIn = !!token

  if (!isLoggedIn && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!isLoggedIn && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLoggedIn && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}