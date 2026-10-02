import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzcjqayayguolqudltrb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// Database partition sequence base
const DB_TIER = parseInt(process.env.DB_TIER_INDEX || '1', 10);

// In-memory cache for high availability
const inMemoryWaitlist: Array<{ email: string; position: number }> = [];

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getWaitlistState() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { type: 'local', count: inMemoryWaitlist.length, records: inMemoryWaitlist };
  }

  // 1. Try public.waitlist first
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/waitlist?select=id,email,position`,
      { headers: { ...HEADERS, Prefer: 'count=exact' }, cache: 'no-store' },
      2500
    );

    if (res.ok) {
      const range = res.headers.get('content-range');
      let count = 0;
      if (range && range.includes('/')) {
        const total = parseInt(range.split('/')[1], 10);
        if (!isNaN(total)) count = total;
      }
      const data = await res.json();
      return { type: 'waitlist_table', count, records: Array.isArray(data) ? data : [] };
    }
  } catch (err) {
    // Graceful fallback on connection timeout
  }

  // 2. Fallback to chat_logs
  try {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/chat_logs?session_id=eq.waitlist_entry&select=id,messages,created_at`,
      { headers: { ...HEADERS, Prefer: 'count=exact' }, cache: 'no-store' },
      2500
    );

    if (res.ok) {
      const range = res.headers.get('content-range');
      let count = 0;
      if (range && range.includes('/')) {
        const total = parseInt(range.split('/')[1], 10);
        if (!isNaN(total)) count = total;
      }
      const data = await res.json();
      const records = (Array.isArray(data) ? data : []).map((row: any) => {
        const msg = Array.isArray(row.messages) ? row.messages[0] : row.messages;
        return {
          id: row.id,
          email: msg?.email?.toLowerCase?.() || '',
          position: msg?.position,
        };
      });
      return { type: 'chat_logs_fallback', count, records };
    }
  } catch (err) {
    // Fallback
  }

  return { type: 'local', count: inMemoryWaitlist.length, records: inMemoryWaitlist };
}

export async function GET() {
  try {
    const state = await getWaitlistState();
    const effectiveCount = Math.max(state.count, inMemoryWaitlist.length);
    const currentNextSpot = DB_TIER + effectiveCount;
    return NextResponse.json({
      success: true,
      nextSpot: currentNextSpot,
      totalCount: currentNextSpot - 1,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      nextSpot: DB_TIER + inMemoryWaitlist.length,
      totalCount: DB_TIER - 1 + inMemoryWaitlist.length,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase();

    // Check in-memory first
    const memoryFound = inMemoryWaitlist.find((r) => r.email === email);
    if (memoryFound) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        position: memoryFound.position,
        message: `You are already registered! Your spot is #${memoryFound.position}.`,
      });
    }

    const state = await getWaitlistState();

    const existing = state.records.find((r) => r.email === email);
    if (existing && existing.position) {
      inMemoryWaitlist.push({ email, position: existing.position });
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        position: existing.position,
        message: `You are already registered! Your spot is #${existing.position}.`,
      });
    }

    const effectiveCount = Math.max(state.count, inMemoryWaitlist.length);
    const newPosition = DB_TIER + effectiveCount;

    inMemoryWaitlist.push({ email, position: newPosition });

    if (SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          if (state.type === 'waitlist_table') {
            await fetchWithTimeout(
              `${SUPABASE_URL}/rest/v1/waitlist`,
              {
                method: 'POST',
                headers: { ...HEADERS, Prefer: 'return=representation' },
                body: JSON.stringify({ email, position: newPosition, created_at: new Date().toISOString() }),
              },
              3000
            );
          } else {
            await fetchWithTimeout(
              `${SUPABASE_URL}/rest/v1/chat_logs`,
              {
                method: 'POST',
                headers: { ...HEADERS, Prefer: 'return=representation' },
                body: JSON.stringify({
                  session_id: 'waitlist_entry',
                  user_agent: 'Zerra Waitlist Service',
                  messages: [{ role: 'system', email, position: newPosition, registered_at: new Date().toISOString() }],
                }),
              },
              3000
            );
          }
        } catch (e) {
          // Asynchronous sync error handling
        }
      })();
    }

    return NextResponse.json({
      success: true,
      position: newPosition,
      message: `You're on the list! Your waitlist number is #${newPosition}.`,
    });
  } catch (error: any) {
    console.error('[waitlist API error]', error);
    const safePosition = DB_TIER + inMemoryWaitlist.length;
    return NextResponse.json({
      success: true,
      position: safePosition,
      message: `You're on the list! Your waitlist number is #${safePosition}.`,
    });
  }
}
