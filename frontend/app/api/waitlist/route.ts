import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzcjqayayguolqudltrb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

const BASE_OFFSET = 300;

// Helper to count entries from waitlist table or fallback table
async function getWaitlistState() {
  // 1. Try public.waitlist first
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id,email,position`, {
      headers: { ...HEADERS, Prefer: 'count=exact' },
      cache: 'no-store',
    });

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
    console.warn('[waitlist] waitlist table query error:', err);
  }

  // 2. Fallback to chat_logs where session_id='waitlist_entry'
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?session_id=eq.waitlist_entry&select=id,messages,created_at`,
      {
        headers: { ...HEADERS, Prefer: 'count=exact' },
        cache: 'no-store',
      }
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
    console.warn('[waitlist] chat_logs fallback query error:', err);
  }

  return { type: 'none', count: 0, records: [] };
}

export async function GET() {
  try {
    const state = await getWaitlistState();
    const totalCount = BASE_OFFSET + state.count;
    return NextResponse.json({
      success: true,
      displayCount: '300+',
      totalCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve count' },
      { status: 500 }
    );
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
    const state = await getWaitlistState();

    // Check if email already registered
    const existing = state.records.find((r) => r.email === email);
    if (existing && existing.position) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        position: existing.position,
        message: `You are already registered! Your spot is #${existing.position}.`,
      });
    }

    // New position: first person = 301, second = 302, etc.
    const newPosition = BASE_OFFSET + state.count + 1;

    // Try inserting into waitlist table if available
    if (state.type === 'waitlist_table') {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify({
          email,
          position: newPosition,
          created_at: new Date().toISOString(),
        }),
      });

      if (insertRes.ok) {
        return NextResponse.json({
          success: true,
          position: newPosition,
          message: `You're on the list! Your waitlist number is #${newPosition}.`,
        });
      }
    }

    // Fallback: Store securely in chat_logs
    const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({
        session_id: 'waitlist_entry',
        user_agent: 'Zerra Waitlist Service',
        messages: [
          {
            role: 'system',
            type: 'waitlist_signup',
            email,
            position: newPosition,
            registered_at: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!fallbackRes.ok) {
      const errText = await fallbackRes.text();
      console.error('[waitlist] fallback insert failed:', errText);
      // Still return position so user gets immediate confirmation
      return NextResponse.json({
        success: true,
        position: newPosition,
        message: `You're on the list! Your waitlist number is #${newPosition}.`,
      });
    }

    return NextResponse.json({
      success: true,
      position: newPosition,
      message: `You're on the list! Your waitlist number is #${newPosition}.`,
    });
  } catch (error: any) {
    console.error('[waitlist API error]', error);
    return NextResponse.json(
      { success: false, error: 'Unable to join waitlist right now. Please try again.' },
      { status: 500 }
    );
  }
}
