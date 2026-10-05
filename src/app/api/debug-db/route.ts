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
    // ---------------------------------------------------------
    // 1. BASIC CONNECTION
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          current_user,
          current_database(),
          current_schema(),
          inet_client_addr()::text AS client_ip,
          version(),
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

    // ---------------------------------------------------------
    // 2. SSL / TLS
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 3. CONNECTION LIMIT
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          count(*)::int AS total_connections,

          count(*) FILTER (
            WHERE state = 'active'
          )::int AS active_connections,

          count(*) FILTER (
            WHERE state = 'idle'
          )::int AS idle_connections,

          count(*) FILTER (
            WHERE state = 'idle in transaction'
          )::int AS idle_in_transaction_connections,

          count(*) FILTER (
            WHERE state = 'idle in transaction (aborted)'
          )::int AS idle_in_transaction_aborted_connections,

          current_setting('max_connections')::int AS max_connections,

          current_setting('superuser_reserved_connections')::int
            AS superuser_reserved_connections

        FROM pg_stat_activity
      `);

      tests.connectionLimits = {
        ok: true,
        ...result.rows[0],
      };
    } catch (error: unknown) {
      tests.connectionLimits = {
        ok: false,
        error: serializeError(error),
      };
    }

    // ---------------------------------------------------------
    // 4. CONNECTIONS BY USER
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          usename AS username,
          count(*)::int AS connections,
          count(*) FILTER (
            WHERE state = 'active'
          )::int AS active,
          count(*) FILTER (
            WHERE state = 'idle'
          )::int AS idle
        FROM pg_stat_activity
        WHERE usename IS NOT NULL
        GROUP BY usename
        ORDER BY connections DESC
      `);

      tests.connectionsByUser = {
        ok: true,
        rows: result.rows,
      };
    } catch (error: unknown) {
      tests.connectionsByUser = {
        ok: false,
        error: serializeError(error),
      };
    }

    // ---------------------------------------------------------
    // 5. CONNECTIONS BY APPLICATION
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          COALESCE(application_name, '') AS application_name,
          count(*)::int AS connections,
          count(*) FILTER (
            WHERE state = 'active'
          )::int AS active,
          count(*) FILTER (
            WHERE state = 'idle'
          )::int AS idle
        FROM pg_stat_activity
        GROUP BY application_name
        ORDER BY connections DESC
      `);

      tests.connectionsByApplication = {
        ok: true,
        rows: result.rows,
      };
    } catch (error: unknown) {
      tests.connectionsByApplication = {
        ok: false,
        error: serializeError(error),
      };
    }

    // ---------------------------------------------------------
    // 6. ALL CONNECTION DETAILS
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          pid,
          usename AS username,
          datname AS database,
          COALESCE(application_name, '') AS application_name,
          client_addr::text AS client_addr,
          state,
          backend_start,
          xact_start,
          query_start,
          state_change,
          wait_event_type,
          wait_event,
          LEFT(query, 200) AS query
        FROM pg_stat_activity
        WHERE datname = current_database()
        ORDER BY backend_start
      `);

      tests.connectionDetails = {
        ok: true,
        count: result.rows.length,
        rows: result.rows,
      };
    } catch (error: unknown) {
      tests.connectionDetails = {
        ok: false,
        error: serializeError(error),
      };
    }

    // ---------------------------------------------------------
    // 7. USER TABLE EXISTS
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 8. USER COUNT
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 9. READ ONE USER
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 10. PRISMA findFirst EQUIVALENT QUERY
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 11. USER PRIVILEGES
    // ---------------------------------------------------------

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

    // ---------------------------------------------------------
    // 12. DATABASE SIZE
    // ---------------------------------------------------------

    try {
      const result = await pool.query(`
        SELECT
          pg_size_pretty(
            pg_database_size(current_database())
          ) AS database_size
      `);

      tests.databaseSize = {
        ok: true,
        ...result.rows[0],
      };
    } catch (error: unknown) {
      tests.databaseSize = {
        ok: false,
        error: serializeError(error),
      };
    }

    // ---------------------------------------------------------
    // FINAL RESULT
    // ---------------------------------------------------------

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