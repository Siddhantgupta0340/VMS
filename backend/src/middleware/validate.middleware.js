import ApiError from '../utils/ApiError.js';

/**
 * Creates an Express middleware function that validates the request against a Zod schema.
 * If validation fails, it passes an ApiError to the next middleware.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (result.success) return next();

  const errorMessage = result.error.errors.map((err) => err.message).join(', ');
  next(new ApiError(400, errorMessage));
};

export default validate;