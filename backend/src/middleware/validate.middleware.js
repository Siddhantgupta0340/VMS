import ApiError from '../utils/ApiError.js';

/**
 * Creates an Express middleware function that validates the request against a Zod schema.
 * If validation fails, it passes an ApiError to the next middleware.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  // If no schema provided or it's not a Zod schema, skip validation
  if (!schema || typeof schema.safeParse !== 'function') return next();

  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (result.success) return next();

  // Zod v4 uses `issues`; older variants or other libs may use `errors`.
  const issues = result?.error?.issues ?? result?.error?.errors;

  let errorMessage;
  if (Array.isArray(issues)) {
    errorMessage = issues.map((err) => err?.message ?? String(err)).join(', ');
  } else if (result?.error?.message) {
    errorMessage = result.error.message;
  } else {
    errorMessage = 'Invalid request payload';
  }

  next(new ApiError(400, errorMessage));
};

export default validate;