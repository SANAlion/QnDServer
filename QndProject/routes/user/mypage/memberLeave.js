const express = require('express');
const router = express.Router();
const async = require('async');

const pool = require('../../../private_module/dbPool');
const jsonVerify = require('../../../private_module/jwtVerify');

const jwtSecret = require('../../../config/jwtSecret');

router.get('/', (req, res) => {
	let memberLeaveTaskArray = [
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
					callback("DB connection has failed");

					res.status(500).send({
						status : "Fail",
						msg : "DB connection has failed"
					});
				} else callback(null, connectingResult, userId);
			});
		},
		(connection, userId, callback) => {
			let deleteQuery1 = "delete from comment where user_id=?";

			connection.query(deleteQuery1, [userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let deleteQuery2 = "delete from like_servay where user_id=?";

			connection.query(deleteQuery2, [userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let deleteQuery3 = "delete from alert where user_id=?";

			connection.query(deleteQuery3, [userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let deleteQuery4 = "delete from selection where user_id=?";

			connection.query(deleteQuery4, [userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);
				
					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let deleteQuery5 = "delete from purchase where user_id=?";

			connection.query(deleteQuery5, [userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let updateQuery = "update servay_combine set user_id=? where user_id=?";

			connection.query(updateQuery, [1, userId], (queryError) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, userId);
				}
			});
		},
		(connection, userId, callback) => {
			let deleteQuery6 = "delete from user_combine where user_id=?";

			connection.query(deleteQuery6, userId, (queryError) => { 
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					connection.release();
					callback(null, "Successfully doing member leave process");

					res.status(200).send({
						status : "Success",
						msg : "Successfully doing member leave process"
					});
				}
			});
		}
	];

	async.waterfall(memberLeaveTaskArray, (asyncError, asyncResult) => {
		if(asyncError) console.log("Async has error : " + asyncError);
		else console.log("Async has success : " + asyncError);
		
	});
});

module.exports = router;