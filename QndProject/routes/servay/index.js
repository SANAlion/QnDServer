const express = require('express');
const router = express.Router();

const registrationLocation = require('./registration');
const listLocation = require('./list');
const searchLocation = require('./search');
const resultLocation = require('./result');
const reportLocation = require('./report');
const likeLocation = require('./like');
const commentLocation = require('./comment');
const catchLockLocation = require('./catchLock');

router.use('/registration', registrationLocation);
router.use('/list', listLocation);
router.use('/search', searchLocation);
router.use('/result', resultLocation);
router.use('/report', reportLocation);
router.use('/like', likeLocation);
router.use('/comment', commentLocation);
router.use('/catch-lock', catchLockLocation);

module.exports = router;