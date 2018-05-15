const express = require('express');
const router = express.Router();

const emailDirectory = require('./email/index');
const mypageDirectory = require('./mypage/index');
const passwordDirectory = require('./password/index');

const joinLocation = require('./join');
const loginLocation = require('./login');

router.use('/email', emailDirectory);
router.use('/mypage', mypageDirectory);
router.use('/password', passwordDirectory);
router.use('/join', joinLocation);
router.use('/login', loginLocation);

module.exports = router;