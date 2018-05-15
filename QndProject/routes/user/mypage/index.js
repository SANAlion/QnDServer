const express = require('express');
const router = express.Router();

const servaysDirectory = require('./servays/index');
const profileLocation = require('./profile');
const imageLocation = require('./image');
const passwordLocation = require('./password');
const memberLeaveLocation = require('./memberLeave');

router.use('/servays', servaysDirectory);
router.use('/profile', profileLocation);
router.use('/image', imageLocation);
router.use('/password', passwordLocation);
router.use('/member-leave', memberLeaveLocation);

module.exports = router;