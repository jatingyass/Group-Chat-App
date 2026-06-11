const express = require('express');
const { loginUser } = require('../controllers/loginController');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../validation/auth.schema');

const router = express.Router();

router.post('/login', validate(loginSchema), loginUser);

module.exports = router;
