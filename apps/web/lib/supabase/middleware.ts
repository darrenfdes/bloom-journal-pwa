import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { isAdminUser } from '@/lib/auth/admin';

/** The `/preview*` playgrounds are admin-only in production (always open in development). */
function isPreviewPath(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith('/preview');
}

function redirectToGarden(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/garden', request.url));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // No auth backend to verify against — keep preview gated in production.
    if (isPreviewPath(request) && !isAdminUser(null)) {
      return redirectToGarden(request);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPreviewPath(request) && !isAdminUser(user)) {
    return redirectToGarden(request);
  }

  return supabaseResponse;
}
