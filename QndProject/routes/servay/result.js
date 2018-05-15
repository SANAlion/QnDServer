const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');

const pool = require('../../private_module/dbPool');
const jsonVerify = require('../../private_module/jwtVerify');

const jwtSecret = require('../../config/jwtSecret');

router.get('/:servay_id', (req, res) => {
	let choice1Count = 0;
	let choice2Count = 0;
	let choice3Count = 0;
	let choice4Count = 0;
	let isLike = 0;
	let resultTaskArray = [
		(callback) => {
            let verifyToken = jsonVerify.verifyToken(req.headers.token, jwtSecret.jwt_secret).data;

            if (verifyToken === "expired token") {
                callback("Expired token");

                res.status(400).send({
                    status: "Fail",
                    msg: "Expired token"
                });
            } else if (verifyToken === "invalid token") {
                callback("Invalid token");

                res.status(400).send({
                    status: "Fail",
                    msg: "Invalid token"
                });
            } else if (verifyToken === "JWT fatal error") {
                callback("JWT fatal error");

                res.status(500).send({
                    status: "Fail",
                    msg: "JWT fatal error"
                });
            } else {
                callback(null, verifyToken);
            }    
        },
		(userId, callback) => {
			pool.getConnection((connectingError, connectingResult) => {
				if(connectingError) {
					res.status(500).send({
						status : "Fail",
						msg : "DB connection has fail"
					});

					callback("DB connection has fail : " + connectingError);
				} else callback(null, connectingResult, userId);
			});
		},
		// 설문지에 대한 정보를 미리 뽑아와야 한다
		(connection, userId, callback) => {
			console.log(req.params.servay_id);
			let selectQuery = "select * from like_servay where (servay_id=? and user_id=?)";
        
            connection.query(selectQuery, [req.params.servay_id, userId], (queryError, queryResult) => {
                if(queryError) {
                    connection.release();
                    callback("Query has sentance error : " + queryError);
                
                    res.status(500).send({
                        status : "Fail",
                        msg : "Query has sentance error"
                    });
                } else if(queryResult[0] === undefined) {
                    callback(null, connection);

                    isLike = 0;
                } else {
                    callback(null, connection);

                    isLike = 1;
                }
            });
		},
		(connection, callback) => {
			let selectQuery = "select * from servay_combine where servay_id=?";

			connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, queryResult[0]);
				}
			});
		},
		(connection, servayData, callback) => {
			let selectQuery = "select * from servay_option where servay_id=?";

			connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, servayData, queryResult[0]);
				}
			});
		},
		(connection, servayData, servayOptionData, callback) => {
			let selectQuery = "select * from selection where servay_id=?";

			connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
				if(queryError) {
					connection.release();
					callback("Query has sentance error : " + queryError);

					res.status(500).send({
						status : "Fail",
						msg : "Query has sentance error"
					});
				} else {
					callback(null, connection, servayData, servayOptionData, queryResult);
				}
			});
		},
		(connection, servayData, servayOptionData, selectionDataArray, callback) => {
			if(servayData.servay_type === 0) {
				if(servayOptionData.q_count === 2) {
					connection.release();

					for(let i = 0; i < servayData.participate_count; i++) {
						choice1Count += selectionDataArray[i].choice1;
						choice2Count += selectionDataArray[i].choice2;
					}

					let resultServayJSONData = {
						servay_id : parseInt(req.params.servay_id),
						servay_type : servayData.servay_type,
						servay_title : servayData.title,
						servay_explanation : servayData.explanation,
						servay_q1 : servayOptionData.q1,
						servay_q2 : servayOptionData.q2,
						servay_q_count : servayOptionData.q_count,
						servay_participation : servayData.participate_count,
						servay_choice1_selection_count : choice1Count,
						servay_choice2_selection_count : choice2Count,
						is_like : isLike
					};
					console.log(typeof resultServayJSONData.servay_id);

					res.status(201).send({
						status : "Success",
						data : resultServayJSONData,
						msg : "Successfully get result servay data"
					});

					callback(null, "Successfully get result servay data");
				} else if(servayOptionData.q_count == 3) {
					connection.release();

					for(let i = 0; i < servayData.participate_count; i++) {
						choice1Count += selectionDataArray[i].choice1;
						choice2Count += selectionDataArray[i].choice2;
						choice3Count += selectionDataArray[i].choice3;
					}

					let resultServayJSONData = {
						servay_id : parseInt(req.params.servay_id),
						servay_type : servayData.servay_type,
						servay_title : servayData.title,
						servay_explanation : servayData.explanation,
						servay_q1 : servayOptionData.q1,
						servay_q2 : servayOptionData.q2,
						servay_q3 : servayOptionData.q3,
						servay_q_count : servayOptionData.q_count,
						servay_participation : servayData.participate_count,
						servay_choice1_selection_count : choice1Count,
						servay_choice2_selection_count : choice2Count,
						servay_choice3_selection_count : choice3Count,
						is_like : isLike
					};

					res.status(201).send({
						status : "Success",
						data : resultServayJSONData,
						msg : "Successfully get result servay data"
					});

					callback(null, "Successfully get result servay data");
				} else {
					connection.release();

					for(let i = 0; i < servayData.participate_count; i++) {
						choice1Count += selectionDataArray[i].choice1;
						choice2Count += selectionDataArray[i].choice2;
						choice3Count += selectionDataArray[i].choice3;
						choice4Count += selectionDataArray[i].choice4;
					}

					let resultServayJSONData = {
						servay_id : parseInt(req.params.servay_id),
						servay_type : servayData.servay_type,
						servay_title : servayData.title,
						servay_explanation : servayData.explanation,
						servay_q1 : servayOptionData.q1,
						servay_q2 : servayOptionData.q2,
						servay_q3 : servayOptionData.q3,
						servay_q4 : servayOptionData.q4,
						servay_q_count : servayOptionData.q_count,
						servay_participation : servayData.participate_count,
						servay_choice1_selection_count : choice1Count,
						servay_choice2_selection_count : choice2Count,
						servay_choice3_selection_count : choice3Count,
						servay_choice4_selection_count : choice4Count,
						is_like : isLike
					};

					res.status(201).send({
						status : "Success",
						data : resultServayJSONData,
						msg : "Successfully get result servay data"
					});

					callback(null, "Successfully get result servay data");
				}
			} else if(servayData.servay_type === 1) {
				let selectQuery = "select * from servay_ab where servay_id=?";

				connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
					if(queryError) {
						connection.release();
						callback("Query has sentance error : " + queryError);

						res.status(500).send({
							status : "Fail",
							msg : "Query has sentance error"
						});
					} else {
						connection.release();

						for(let i = 0; i < servayData.participate_count; i++) {
						choice1Count += selectionDataArray[i].choice1;
						choice2Count += selectionDataArray[i].choice2;
						}

						let resultServayJSONData = {
							servay_id : parseInt(req.params.servay_id),
							servay_type : servayData.servay_type,
							servay_title : servayData.title,
							servay_explanation : servayData.explanation,
							servay_a_txt : queryResult[0].a_txt,
							servay_b_txt : queryResult[0].b_txt,
							servay_a_img : queryResult[0].a_img,
							servay_b_img : queryResult[0].b_img,
							servay_participation_count : servayData.participate_count,
							servay_choice1_selection_count : choice1Count,
							servay_choice2_selection_count : choice2Count,
							is_like : isLike
						};

						res.status(201).send({
							status : "Success",
							data : resultServayJSONData,
							msg : "Successfully get result"
						});

						callback(null, "Successfully get result servay data"); 
					}
				});
			} else if(servayData.servay_type === 2) {
				connection.release();

				for(let i = 0; i < servayData.participate_count; i++) {
					choice1Count += selectionDataArray[i].choice1;
					choice2Count += selectionDataArray[i].choice2;
				}

				let resultServayJSONData = {
					servay_id : parseInt(req.params.servay_id),
					servay_type : servayData.servay_type,
					servay_title : servayData.title,
					servay_explanation : servayData.explanation,
					servay_participation_count : servayData.participate_count,
					servay_choice1_selection_count : choice1Count,
					servay_choice2_selection_count : choice2Count,
					is_like : isLike
				};

				res.status(201).send({
					status : "Success",
					data : resultServayJSONData,
					msg : "Successfully get result servay data"
				});

				callback(null, "Successfully get result servay data");
			} else {
				connection.release();
				callback("It's fatal error!");

				res.status(500).send({
					status : "Fail",
					msg : "It's fatal error! you must check server"
				});
			}
		}
	];

	async.waterfall(resultTaskArray, (asyncError, asyncResult) => {
		if(asyncError) console.log("Async has error : " + asyncError);
		else console.log("Async has success : " + asyncResult);
	});
})

module.exports = router;