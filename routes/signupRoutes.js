const express = require('express');
const { signupUser } = require('../controllers/signupController');
const validate = require('../middlewares/validate');
const { signupSchema } = require('../validation/auth.schema');

const router = express.Router();

router.post('/signup', validate(signupSchema), signupUser);

module.exports = router;
