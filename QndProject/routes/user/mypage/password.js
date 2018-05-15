const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');

const pool = require('../../../private_module/dbPool');
const jsonVerify = require('../../../private_module/jwtVerify');

const jwtSecret = require('../../../config/jwtSecret');

router.post('/', (req, res) => {
	let passwordTaskArray = [
		(callback) => {
			let verifyToken = jsonVerify.verifyToken(req.headers.token, jwtSecret.jwt_secret).data;
			
			if(verifyToken === "expired token") {
				callback("Expired token");

				res.status(400).send({
					status : "Fail",
					msg : "Expired token"
				});
			} else if(verifyToken === "invalid token") {
				callback("Invalid token");

				res.status(400).send({
					status : "Fail",
					msg : "Invalid token"
				});
			} else if(verifyToken === "JWT fatal error") {
				callback("JWT fatal error");

				res.status(500).send({
					status : "Fail",
					msg : "JWT fatal error"
				});
			} else {
				callback(null, verifyToken);
			}
		},
		(userId, callback) => {
			pool.getConnection((connectingError, connectingResult) => {
				if(connectingError) {
					callback("DB connection has faied : " + connectingError);

					res.status(500).send({
						status : "Fail",
						msg : "DB connection has failed"
					});
				} else {
					callback(null, connectingResult, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let selectQuery = "select salt, pwd from user_combine where user_id=?";
			
			connection.query(selectQuery, userId, (queryError, queryResult) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);
					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else if(queryResult[0] === undefined) {
					connection.release();
					callback("No user data which equals with user_id");
					
					res.status(500).send({
						status : "Fail",
						msg : "No user data which equals with user_id"
					});
				} else {
					callback(null, connection, queryResult[0].salt, queryResult[0].pwd, userId);
				}
			});
		},
		(connection, salt, currentHashedPwd, userId, callback) => {
			crypto.pbkdf2(req.body.input_current_pwd, salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
				if(hashingError) {
					connection.release();
					callback("Hashing has failed : " + hashingError);

					res.status(500).send({
						status : "Fail",
						msg : "Hashing has failed"
					});
				} else if(hashingResult.toString('base64') === currentHashedPwd){
					callback(null, connection, salt, userId);
				} else {
					connection.release();
					callback("Incorrect current pwd");

					res.status(500).send({
						status : "Fail",
						msg : "Incorrect current pwd"
					});
				}
			});
		},
		(connection, salt, userId, callback) => {
			crypto.pbkdf2(req.body.input_new_pwd, salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
				if(hashingError) {
					connection.release();
					callback("Hashing has failed : " + hashingError);

					res.status(500).send({
						status : "Fail",
						msg : "Hashing has failed"
					});
				} else {
					callback(null, connection, hashingResult.toString('base64'), userId);
				}
			});
		},
		// hashing이 된 패스워드(hashedPwd)를 user_combine TABLE에서 user_id가 맞는 곳에 update해준다.
		(connection, hashedPwd, userId, callback) => {
			let updateQuery = "update user_combine set pwd=? where user_id=?";

			connection.query(updateQuery, [hashedPwd, userId], (queryError, queryResult) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					connection.release();
					callback(null, "Success");

					res.status(201).send({
						status : "Success",
						msg : "Your password has successfully updated"
					});
				}
			});
		}
	];

	async.waterfall(passwordTaskArray, (asyncError, asyncResult) => {
		if(asyncError) console.log("Async has error : " + asyncError);
		else console.log("Async has success : " + asyncResult);
	});
})

module.exports = router;