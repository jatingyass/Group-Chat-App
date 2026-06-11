const bcrypt = require('bcryptjs');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const BCRYPT_ROUNDS = 12;

exports.signupUser = catchAsync(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, phone, password: hashedPassword });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { id: user.id, name: user.name, email: user.email },
  });
});
