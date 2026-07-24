import ApiError from '../utils/ApiError.js';

/**
 * Express middleware factory that validates the request against a Zod schema.
 *
 * - Validates body, query, and params.
 * - On success: replaces req.body / req.query / req.params with the parsed (coerced) values.
 * - On failure: passes a structured ApiError to the next middleware.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  // If no valid schema is provided, skip validation silently.
  if (!schema || typeof schema.safeParse !== 'function') return next();

  const isDev = process.env.NODE_ENV !== 'production';

  // ── Always log incoming payload in development ──────────────────────────────
  if (isDev) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Validate] Incoming Request (Before Validation)');
    console.log(`  Method      : ${req.method}`);
    console.log(`  URL         : ${req.originalUrl}`);
    console.log(`  Headers     : ${JSON.stringify(req.headers, null, 2)}`);
    console.log(`  Content-Type: ${req.headers['content-type'] || 'NOT SET'}`);
    console.log(`  Body        : ${JSON.stringify(req.body, null, 2)}`);
    console.log(`  Params      : ${JSON.stringify(req.params, null, 2)}`);
    console.log(`  Query       : ${JSON.stringify(req.query, null, 2)}`);
    console.log(`  User        : ${JSON.stringify(req.user, null, 2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  const result = schema.safeParse({
    body: req.body ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
  });

  if (result.success) {
    // Overwrite req.body / query / params with Zod-parsed (coerced) values.
    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }
    if (result.data.query !== undefined) {
      // req.query is read-only in some versions; assign each key instead.
      for (const key of Object.keys(result.data.query)) {
        req.query[key] = result.data.query[key];
      }
    }
    if (result.data.params !== undefined) {
      for (const key of Object.keys(result.data.params)) {
        req.params[key] = result.data.params[key];
      }
    }

    if (isDev) {
      console.log('[Validate]  Validation passed');
    }
    return next();
  }

  // ── Validation failed ───────────────────────────────────────────────────────
  // Zod v4 uses `issues`; older versions used `errors`.
  const issues = result?.error?.issues ?? result?.error?.errors ?? [];

  // Build structured errors array: [{ field: "body.amount", message: "..." }]
  const errors = issues.map((issue) => {
    const field = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? '');
    return { field, message: issue.message };
  });

  // Build a human-readable summary for the top-level message.
  const summary = errors.length > 0
    ? errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join(' | ')
    : 'Invalid request payload';

  if (isDev) {
    console.log('[Validate] ❌ Validation failed:');
    errors.forEach((e) => console.log(`  - ${e.field || '(root)'}: ${e.message}`));
  }

  const apiError = new ApiError(400, summary);
  apiError.errors = errors;
  next(apiError);
};

export default validate;
