var express = require('express');
var router = express.Router();
const async = require('async');
const pool = require('../../private_module/dbPool');
const moment = require('moment');
const jsonVerify = require('../../private_module/jwtVerify');
const jwtSecret = require('../../config/jwtSecret');

router.post('/', function(req, res) {
 

    let alert_done = 0;
    let alert_count = 0;

    let taskArray = [
        //0. token 확인 
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
        function(data, callback) {
            console.log(data);

            pool.getConnection(function(err, connection) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    }); //res.status(500).send
                    callback("DB connection has failed : " + err);
                } else {
                    callback(null, data, connection);
                }
            });
        },

        //2. alert table 에 user_id 랑 servay_id 해당하는거 있는지 확인
        function(data, connection, callback) {


            let selectAlertQuery = `select al.* from alert al where al.user_id = ? and al.servay_id = ?`;
            let queryArray = [data, req.body.servay_id];

            connection.query(selectAlertQuery, queryArray, function(err, result) {
                console.log(result);

                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                    connection.release();
                    callback("Query has sentance error : " + err);
                } else {
                    callback(null, data, connection, result);

                }
            });
        },

        // 3. length가 있으면 alert_done = 1, 없으면 0으로 주고, length 가 이미 있으면 callback 종료

        function(data, connection, result, callback) {


            // length 없으니까 유저가 해당 설문 신고 안한것. table에 저장하고 alert_done 안바뀜
            if (result.length == 0) {
                let insertAlertQuery = `insert into alert (user_id, servay_id, alert_content) values (?,?,?);`;
                let queryArray = [data, req.body.servay_id, req.body.alert_alert_content];

                connection.query(insertAlertQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            alert_done: alert_done,
                            msg: "Query has sentance error"
                        });
                        connection.release();
                        callback("Query has sentance error : " + err);
                    } else {

                        callback(null, connection);

                    }
                });

            } else {
                alert_done = 1;
                callback(null, connection);
            }

        },


        //4-1. alert_count 가져오기 
        function(connection, callback) {

            console.log(req.body.servay_id);

            let selectAlertCountQuery = `select sc.alert_count from servay_combine sc where sc.servay_id = ?`;
            let queryArray = [req.body.servay_id];

            connection.query(selectAlertCountQuery, queryArray, function(err, result) {

                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                    connection.release();
                    callback("Query has sentance error : " + err);
                } else {
                    alert_count = result[0].alert_count;
                    callback(null, connection);
                }
            });
        },

        //4-2. length 가 0이라면 추가 됐을테니까 서베이에 대한 alert_count 도 올려줘야함. 
        function(connection, callback) {
            if (alert_done == 0) {

                let updateAlertCountQuery = `update servay_combine sc set sc.alert_count  = ? where sc.servay_id = ?`;
                let queryArray = [alert_count + 1, req.body.servay_id];

                connection.query(updateAlertCountQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentance error " + err);
                    } else {
                        res.status(201).send({
                            status: "Success",
                            alert_done: alert_done,
                            msg: "Successfully report this servay"
                        });
                        connection.release();
                        callback(null, "Successfully report this servay ");
                    }
                });
            } else if (alert_done == 1) {
                res.status(400).send({
                    status: "Fail",
                    alert_done: alert_done,
                    msg: "User already report this servay"
                });
                connection.release();
                callback(null, "User already report this servay");
            }
        }

    ];

    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    }); //async.waterfall
});


module.exports = router;