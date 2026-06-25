import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has('is_authenticated')

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r)

  // Everything that isn't an auth route requires authentication
  const isProtected = !isAuthRoute &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api')

  if (isProtected && !isAuthenticated) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
