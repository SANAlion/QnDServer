const express = require('express');
const router = express.Router();

const tempLocation = require('./temp');

router.use('/temp', tempLocation);

module.exports = router;