import type { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

function getHeader(event: any, name: string): string {
  const h = event.headers || {};
  return (h[name] || h[name.toLowerCase()] || '').toString();
}

export const handler: Handler = async (event) => {
  try {
    const method = event.httpMethod || 'GET';
    if (!['GET', 'POST'].includes(method)) return { statusCode: 405, body: 'Method Not Allowed' };

    const hasGroqEnv = !!process.env.GROQ_API_KEY;
    const hasGroqHeader = !!getHeader(event, 'X-Groq-Key');
    const dbEnv = process.env.NEON_DATABASE_URL || '';
    const dbHdr = getHeader(event, 'X-Db-Url');
    const dbUrl = dbEnv || dbHdr || '';
    const neonInfo: any = { env: !!dbEnv, viaHeader: !!dbHdr, connect: 'skip' };

    if (dbUrl) {
      try {
        const sql = neon(dbUrl);
        const rows = await sql`select 1 as ok`;
        neonInfo.connect = rows?.[0]?.ok === 1 ? 'ok' : 'unknown';
      } catch (e: any) {
        neonInfo.connect = 'fail';
        neonInfo.error = e?.message || String(e);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, groq: { env: hasGroqEnv, viaHeader: hasGroqHeader }, neon: neonInfo }),
    };
  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: err?.message || 'internal error' }) };
  }
};

