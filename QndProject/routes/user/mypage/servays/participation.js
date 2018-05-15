const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');
const moment = require('moment');

const pool = require('../../../../private_module/dbPool');
const jsonVerify = require('../../../../private_module/jwtVerify');

const jwtSecret = require('../../../../config/jwtSecret');

router.get('/', (req, res) => {
    let participationTaskArray = [
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
                if (connectingError) {
                    callback("DB connection has failed");

                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                } else {
                    callback(null, connectingResult, userId);
                }
            });
        },
        (connection, userId, callback) => {
            let selectQuery = "select servay_id, end_select_time from selection where user_id=? order by servay_id desc";

            connection.query(selectQuery, [userId], (queryError, queryResult) => {
                if (queryError) {
                    connection.release();
                    callback("Query has sentance error : " + queryError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                } else if (queryResult[0] === undefined) {
                    connection.release();
                    callback("No servaydata");

                    res.status(500).send({
                        status: "Fail",
                        msg: "No servaydata"
                    });
                } else {
                    callback(null, connection, queryResult);
                }
            });
        },
        (connection, participatedServayIdArray, callback) => {
            let participatedServayJSONArrayData = [];
            let servayValuesJSONObject = {};

            for (let servayIndex = 0; servayIndex < participatedServayIdArray.length; servayIndex++) {
                let parameterServayId = participatedServayIdArray[servayIndex].servay_id;

                let selectQuery = "select title, write_time from servay_combine where servay_id=?";

                connection.query(selectQuery, [parameterServayId], (queryError, queryResult) => {
                    if (queryError) {
                        connection.release();
                        callback("Query has sentance error : " + queryError);

                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentance error"
                        });
                    } else {
                        if (queryResult[0] === undefined) {
                            //id값에 해당하는 구매 정보가 없는경우
                            let status = parameterServayId + "에 해당하는 구매정보는 없습니다."

                            console.log(status);
                        } else {
                            //여기서 queryResult에는 [{"title" : titleValue, "write_time" : writeTimeValue}]의 형태로 한개만 들어있을 것이다.
                            let servayTitle = "" + queryResult[0].title;
                            let servayWriteTime = "" + queryResult[0].write_time;
                            let endSelectTime = "" + participatedServayIdArray[servayIndex].end_select_time;

                            var year = endSelectTime.substring(0, 4);
                            var month = endSelectTime.substring(4, 6);
                            var day = endSelectTime.substring(6, 8);
                            var selectTimeFinal = year + "." + month + "." + day;
                            var writeTimeFinal = moment(servayWriteTime).format('YYYY.MM.DD');

                            servayValuesJSONObject = {
                                "servay_id": parameterServayId,
                                "servay_title": servayTitle,
                                "servay_write_time": writeTimeFinal,
                                "end_select_time": selectTimeFinal
                            };

                            participatedServayJSONArrayData.push(servayValuesJSONObject);

                            if (servayIndex === participatedServayIdArray.length - 1) {
                                connection.release();
                                callback(null, "Success");

                                res.status(201).send({
                                    status: "Success",
                                    data: participatedServayJSONArrayData,
                                    msg: "participated servay_id data which type is JSONArray is responsed"
                                });
                            }
                        }
                    }
                });
            }
        }
    ];

    async.waterfall(participationTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

module.exports = router;