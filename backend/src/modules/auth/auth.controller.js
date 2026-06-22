const { registerSchema } = require("./auth.validation");

const register = (req, res) => {

  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.issues
    });
  }

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: result.data
  });
};

module.exports = {
  register
};