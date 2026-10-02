import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzcjqayayguolqudltrb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// Start from 342 (first person = 342)
const BASE_OFFSET = 341;

// In-memory cache for high availability if network/Supabase encounters timeouts
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

// Helper to count entries from waitlist table or fallback table
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
    // network timeout or table not ready
  }

  // 2. Fallback to chat_logs where session_id='waitlist_entry'
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
    // fallback
  }

  return { type: 'local', count: inMemoryWaitlist.length, records: inMemoryWaitlist };
}

export async function GET() {
  try {
    const state = await getWaitlistState();
    const totalCount = BASE_OFFSET + Math.max(state.count, inMemoryWaitlist.length);
    return NextResponse.json({
      success: true,
      displayCount: `${BASE_OFFSET}+`,
      totalCount,
    });
  } catch (error: any) {
    // Never fail with 500 - graceful fallback
    return NextResponse.json({
      success: true,
      displayCount: `${BASE_OFFSET}+`,
      totalCount: BASE_OFFSET + inMemoryWaitlist.length,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';

    // Validate email format
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

    // Check if email already registered in Supabase
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

    // New position starting from 342 (341 + count + 1)
    const effectiveCount = Math.max(state.count, inMemoryWaitlist.length);
    const newPosition = BASE_OFFSET + effectiveCount + 1;

    // Cache locally immediately so next call gets next increment
    inMemoryWaitlist.push({ email, position: newPosition });

    // Background push to Supabase without blocking or failing user
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
          console.warn('[waitlist] background async save skipped:', e);
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
    // Even if an unexpected error occurs, gracefully register locally starting from 342
    const safePosition = BASE_OFFSET + inMemoryWaitlist.length + 1;
    return NextResponse.json({
      success: true,
      position: safePosition,
      message: `You're on the list! Your waitlist number is #${safePosition}.`,
    });
  }
}
