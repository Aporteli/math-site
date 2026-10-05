import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.DATABASE_URL;
  const ca = process.env.DATABASE_CA;

  if (!url) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not set' },
      { status: 500 }
    );
  }

  if (!ca) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_CA is not set' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: url,
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  });

  try {
    const result = await pool.query(`
      SELECT
        current_user,
        current_database(),
        inet_client_addr()::text AS client_ip,
        ssl,
        version,
        cipher
      FROM pg_stat_ssl
      WHERE pid = pg_backend_pid()
    `);

    return NextResponse.json({
      ok: true,
      database: result.rows[0],
    });
  } catch (error: unknown) {
    const e = error as {
      code?: string;
      severity?: string;
      message?: string;
      detail?: string;
      hint?: string;
    };

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: e.code,
          severity: e.severity,
          message: e.message,
          detail: e.detail,
          hint: e.hint,
        },
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}