import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // اسمح لهذه الصفحات دون فحص
  if (
    pathname.startsWith('/pending') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token =
    request.cookies.get('sb-nzhczszgryexiilsughk-auth-token') ||
    request.cookies.get('sb-access-token')

  const isLoggedIn = !!token

  // غير مسجل يريد الداشبورد
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // مسجل يريد الـ login — حوّله للداشبورد
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}