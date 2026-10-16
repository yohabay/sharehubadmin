import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

// Force dynamic so Next never tries to statically optimize this handler.
export const dynamic = 'force-dynamic'

// Forward only the headers PostgREST actually cares about.
const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'accept-profile',
  'content-profile',
  'prefer',
  'range',
  'x-client-info',
  'x-upsert',
  'content-disposition',
]

// Headers we need to pass back to supabase-js (it reads content-range for counts).
const FORWARD_RESPONSE_HEADERS = [
  'content-type',
  'content-range',
  'preference-applied',
  'location',
]

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { message: 'Server is missing Supabase admin credentials' },
      { status: 500 }
    )
  }

  // --- Auth: require a valid, logged-in Supabase user via the admin_token cookie ---
  const token = req.cookies.get('admin_token')?.value
  if (!token) {
    return NextResponse.json(
      { message: 'Unauthorized: no admin_token cookie — sign in again' },
      { status: 401 }
    )
  }

  let userEmail = ''
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) {
      // Almost always an expired access token (they last ~1h) or a token signed
      // with a rotated JWT secret — never a service-role key problem, which
      // would surface as a 401 from the PostgREST call below instead.
      return NextResponse.json(
        {
          message: `Unauthorized: session rejected by Supabase (${
            error?.message || 'no user'
          }) — sign in again`,
        },
        { status: 401 }
      )
    }
    userEmail = (data.user.email || '').toLowerCase()
  } catch (err: any) {
    return NextResponse.json(
      { message: `Unauthorized: session check failed (${err?.message || err})` },
      { status: 401 }
    )
  }

  // Optional allowlist. If ADMIN_EMAILS is set, only those accounts may use the
  // admin proxy. If unset, any authenticated user is allowed (set it in prod!).
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (allowlist.length > 0 && !allowlist.includes(userEmail)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // --- Proxy to the real Supabase REST endpoint using the service role key ---
  const target = `${supabaseUrl}/${params.path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    if (FORWARD_REQUEST_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  // Override auth with the service role key (bypasses RLS — server side only).
  headers.set('apikey', serviceKey)
  headers.set('Authorization', `Bearer ${serviceKey}`)

  // Read as bytes, not text: storage uploads send raw image data and JSON
  // bodies survive a byte-for-byte forward just fine.
  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.arrayBuffer() : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
    })
  } catch (err: any) {
    return NextResponse.json(
      { message: `Upstream request failed: ${err?.message || err}` },
      { status: 502 }
    )
  }

  const resHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (FORWARD_RESPONSE_HEADERS.includes(key.toLowerCase())) {
      resHeaders.set(key, value)
    }
  })

  const buffer = await upstream.arrayBuffer()
  return new NextResponse(buffer, { status: upstream.status, headers: resHeaders })
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
}
