const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');
const moment = require('moment');
const pool = require('../../../../private_module/dbPool');
const jsonVerify = require('../../../../private_module/jwtVerify');
const jwtSecret = require('../../../../config/jwtSecret');
/*
   URL : /users/purchased-servay
   기능
   1. UI의 마이페이지에서 user의 정보를 request로 넘겨받는다.(user_id만 넘어와도 괜찮다)
   2. selection Table에서 user_id를 기준으로 servay_id를 전부 가져온다.(이 때 query의 결과값에는 JSONArray형태로 전부 전달해 줄 것이다)
   3. 각 servay_id에 대해서 servay_combie Table에서 title, write_time을 뽑고, 각 각 servay_title, servay_write_time의 key값으로 저장해준다.
   4. 이후 이 값을 response로 던져주면 끝!
*/
router.get('/', (req, res) => {



    let warnedServayTaskArray = [


        //0. 토큰 확인 
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

        //1. DB 연결

        (data, callback) => {


            pool.getConnection((connectingError, connectingResult) => {
                if (connectingError) {
                    callback("DB connection has failed");

                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                } else {
                    callback(null, data, connectingResult);
                }
            });
        },

        (data, connection, callback) => {

            let selectQuery = "select servay_id from alert order by servay_id desc";

            connection.query(selectQuery, (queryError, queryResult) => {
                if (queryError) {
                    connection.release();
                    callback("Query has sentance error : " + queryError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                } else {
                    callback(null, data, connection, queryResult);
                }
            });
        },
        /*
           여기서부터가 중요한데, purchasedServayIdArray에는
           user_id에 해당하는 servay_id가 
           [{"servay_id1" : value1}, {"servay_id2" : value2}, {"servay_id3" : value3}]
           의 형태로 올라가 있을 것이다. 이것을 for문을 써서 잘 가공해주면 된다.
           각각에는 servay_id를 뽑아내서 그것을 기준으로 servay_combine Table에서 title, write_time을 뽑아내자
        */
        (data, connection, warnedServayIdArray, callback) => {


            //console.log(warnedServayIdArray);
            let warnedServayJSONArrayData = [];
            let servayValuesJSONObject = {};
            //유저가 신고당한 서베이가 없는 경우 
            /* if (warnedServayIdArray.length == 0) {
                 res.status(400).send({
                     status: "Fail",
                     msg: "User did not get reported for any servay"
                 });
                 connection.release();
                 callback("User did not get reported for any servay");
             }*/

            for (let servayIndex = 0; servayIndex < warnedServayIdArray.length; servayIndex++) {
                let parameterServayId = warnedServayIdArray[servayIndex].servay_id;

                console.log(parameterServayId);
                let selectQuery = "select title, write_time, alert_count from servay_combine where servay_id = ? and user_id = ?";
                let queryArray = [parameterServayId, data]
                connection.query(selectQuery, queryArray, (queryError, queryResult) => {
                    //console.log("Qerye result's length  = " + queryResult.length);
                    console.log(queryResult);

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

                            if (servayIndex === warnedServayIdArray.length - 1) {
                                connection.release();
                                callback(null, "Success");
                              

                                res.status(200).send({
                                    status: "Success",
                                    data: warnedServayJSONArrayData,
                                    msg: "Warned servay_id data which type is JSONArray is responsed"
                                });
                            }

                        } else {
                            //여기서 queryResult에는 [{"title" : titleValue, "write_time" : writeTimeValue}]의 형태로 한개만 들어있을 것이다.
                            let servayTitle = "" + queryResult[0].title;
                            let servayWriteTime = "" + queryResult[0].write_time;
                            let alertCount = queryResult[0].alert_count;

                            //여기 추가 

                            var writeTimeFinal = moment(servayWriteTime).format('YYYY.MM.DD');

                            servayValuesJSONObject = {
                                "servay_id": parameterServayId,
                                "servay_title": servayTitle,
                                "servay_write_time": writeTimeFinal,
                                "alert_count": alertCount
                            };

                            warnedServayJSONArrayData.push(servayValuesJSONObject);

                            if (servayIndex === warnedServayIdArray.length - 1) {
                                connection.release();
                                callback(null, "Success");
                               

                                res.status(200).send({
                                    status: "Success",
                                    data: warnedServayJSONArrayData,
                                    msg: "Warned servay_id data which type is JSONArray is responsed"
                                });
                            }
                        }
                    }

                });
            }
        }
    ];

    async.waterfall(warnedServayTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

module.exports = router;