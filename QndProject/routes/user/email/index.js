const express = require('express');
const router = express.Router();

const authLocation = require('./auth');
const authAcceptanceLocation = require('./authAcceptance');
const duplicationLocation = require('./duplication');

router.use('/auth', authLocation);
router.use('/auth-acceptance', authAcceptanceLocation);
router.use('/duplication', duplicationLocation);

module.exports = router;