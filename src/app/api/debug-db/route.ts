import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();

  const url = process.env.DATABASE_URL;
  const ca = process.env.DATABASE_CA;

  const tests: Record<string, unknown> = {};

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        fatal: 'DATABASE_URL is not set',
        tests,
      },
      { status: 500 }
    );
  }

  if (!ca) {
    return NextResponse.json(
      {
        ok: false,
        fatal: 'DATABASE_CA is not set',
        tests,
      },
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
    // 1. Basic PostgreSQL + SSL connection
    try {
      const result = await pool.query(`
        SELECT
          current_user,
          current_database(),
          inet_client_addr()::text AS client_ip,
          version(),
          current_schema(),
          now() AS server_time
      `);

      tests.connection = {
        ok: true,
        ...result.rows[0],
      };
    } catch (error: unknown) {
      tests.connection = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 2. SSL information
    try {
      const result = await pool.query(`
        SELECT
          ssl,
          version AS tls_version,
          cipher
        FROM pg_stat_ssl
        WHERE pid = pg_backend_pid()
      `);

      tests.ssl = {
        ok: true,
        ...result.rows[0],
      };
    } catch (error: unknown) {
      tests.ssl = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 3. Check whether User table exists
    try {
      const result = await pool.query(`
        SELECT
          table_schema,
          table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'User'
      `);

      tests.userTableExists = {
        ok: true,
        exists: result.rows.length > 0,
        rows: result.rows,
      };
    } catch (error: unknown) {
      tests.userTableExists = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 4. Count users
    try {
      const result = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM "User"
      `);

      tests.userCount = {
        ok: true,
        count: result.rows[0]?.count,
      };
    } catch (error: unknown) {
      tests.userCount = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 5. Read one user
    try {
      const result = await pool.query(`
        SELECT
          id,
          email,
          role
        FROM "User"
        LIMIT 1
      `);

      tests.userSelect = {
        ok: true,
        rowCount: result.rowCount,
        user: result.rows[0]
          ? {
              id: result.rows[0].id,
              email: result.rows[0].email,
              role: result.rows[0].role,
            }
          : null,
      };
    } catch (error: unknown) {
      tests.userSelect = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 6. Test the same type of query used by Prisma/NextAuth:
    // SELECT one user with OR conditions.
    try {
      const result = await pool.query(
        `
          SELECT
            id,
            role,
            email
          FROM "User"
          WHERE email = $1
             OR id = $1
          LIMIT 1
        `,
        ['__debug_nonexistent_user__']
      );

      tests.userFindFirstEquivalent = {
        ok: true,
        rowCount: result.rowCount,
        user: result.rows[0] ?? null,
      };
    } catch (error: unknown) {
      tests.userFindFirstEquivalent = {
        ok: false,
        error: serializeError(error),
      };
    }

    // 7. Check privileges for current user
    try {
      const result = await pool.query(`
        SELECT
          has_table_privilege(
            current_user,
            'public."User"',
            'SELECT'
          ) AS can_select,
          has_table_privilege(
            current_user,
            'public."User"',
            'INSERT'
          ) AS can_insert,
          has_table_privilege(
            current_user,
            'public."User"',
            'UPDATE'
          ) AS can_update,
          has_table_privilege(
            current_user,
            'public."User"',
            'DELETE'
          ) AS can_delete
      `);

      tests.userPrivileges = {
        ok: true,
        ...result.rows[0],
      };
    } catch (error: unknown) {
      tests.userPrivileges = {
        ok: false,
        error: serializeError(error),
      };
    }

    const failedTests = Object.entries(tests)
      .filter(([, value]) => {
        return (
          typeof value === 'object' &&
          value !== null &&
          'ok' in value &&
          value.ok === false
        );
      })
      .map(([name]) => name);

    return NextResponse.json({
      ok: failedTests.length === 0,
      durationMs: Date.now() - startedAt,
      failedTests,
      tests,
    });
  } finally {
    await pool.end();
  }
}

function serializeError(error: unknown) {
  const e = error as {
    name?: string;
    message?: string;
    code?: string;
    severity?: string;
    detail?: string;
    hint?: string;
    position?: string;
    schema?: string;
    table?: string;
    column?: string;
    constraint?: string;
  };

  return {
    name: e.name,
    message: e.message,
    code: e.code,
    severity: e.severity,
    detail: e.detail,
    hint: e.hint,
    position: e.position,
    schema: e.schema,
    table: e.table,
    column: e.column,
    constraint: e.constraint,
  };
}