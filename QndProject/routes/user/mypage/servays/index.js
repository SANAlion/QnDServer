const express = require('express');
const router = express.Router();

const purchaseLocation = require('./purchase');
const participationLocation = require('./participation');
const creationLocation = require('./creation');
const reportLocation = require('./report');

router.use('/purchase', purchaseLocation);
router.use('/participation', participationLocation);
router.use('/creation', creationLocation);
router.use('/report', reportLocation);

module.exports = router;