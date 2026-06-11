const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, issuer: 'group-chat-app' },
  );

exports.loginUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  // Same error message for unknown email + wrong password to prevent user enumeration
  const genericError = ApiError.unauthorized('Invalid email or password');
  if (!user) throw genericError;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw genericError;

  const token = signToken(user);
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    },
  });
});
