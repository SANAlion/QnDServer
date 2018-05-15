const express = require('express');
const router = express.Router();

const servayDirectory = require('./servay/index');
const userDirectory = require('./user/index');

router.use('/servay', servayDirectory);
router.use('/user', userDirectory);

router.get('/', (req, res) => {
	res.status(200).send({
		status : "Success",
		msg : "Hello, QnD Corporation!"
	});
});

module.exports = router;