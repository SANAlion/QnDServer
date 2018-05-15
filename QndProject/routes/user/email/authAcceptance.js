const express = require('express');
const router = express.Router();
const async = require('async');
/*
	authorization_code와 유저에게 받은 authorization_code_accept를 JSON객체로 받아야함
*/
router.post('/', (req, res) => {
	let checkAuthorizationCode = {"check" : 1};

	if(req.body.authorization_code === req.body.authorization_code_accept) {
		res.status(201).send({
			status : "Success",
			data : checkAuthorizationCode,
			msg : "Authorization has succeed"
		});
	} else {
		checkAuthorizationCode.check = 0;

		res.status(201).send({
			status : "Fail",
			data : checkAuthorizationCode,
			msg : "Authorization has failed"
		});
	}
});

module.exports = router;