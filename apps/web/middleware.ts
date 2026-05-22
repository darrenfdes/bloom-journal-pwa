import { type NextRequest, NextResponse } from 'next/server';

/**
 * Placeholder middleware — ready for Supabase `updateSession` when auth is enabled.
 * No redirects in v1; local-first app works without Supabase env vars.
 */
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
