var express = require('express');
var router = express.Router();
const async = require('async');
const pool = require('../../../private_module/dbPool');
const moment = require('moment');
const jsonVerify = require('../../../private_module/jwtVerify');
const jwtSecret = require('../../../config/jwtSecret');

//유저 정보 페이지 띄워주는 것. 
//user/mypage/profile
router.get('/', function(req, res) {

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
            pool.getConnection(function(err, connection) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed "
                    }); //res.status(500).send
                    connection.release();
                    callback("DB connection has failed : " + err);
                } else {
                    callback(null, data, connection);
                }
            }); //pool.getConnection
        },

        //2 . user_id 에 따른 필요한 정보 가져오기 . 
        function(data, connection, callback) {

            let selectUserInfoQuery = `select uc.available_point, uc.used_point, uc.accumulate_point, uc.img, uc.email from user_combine uc where uc.user_id = ?;`;
            let queryArray = [data];

            connection.query(selectUserInfoQuery, queryArray, function(err, selection_result) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    callback(null, connection, selection_result);
                }
            });
        },

        //3. user 정보 뿌려주기 
        function(connection, result, callback) {

            let available_point = result[0].available_point;
            let used_point = result[0].used_point;
            let accumulate_point = result[0].accumulate_point;
            let img = result[0].img;
            let email = result[0].email;

            let resultServayJSONData = {
                user_available_point: available_point,
                user_used_point: used_point,
                user_accumulate_point: accumulate_point,
                user_img: img,
                user_email: email,
            };

            res.status(200).send({
                status: "Success",
                data: resultServayJSONData,
                msg: "Successfully get user data"
            });
            connection.release();
            callback(null, "Successfully send user data");
        }
    ];

    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    }); //async.waterfall
});









//유저 프로필 정보 변경. //change User Info
//user/mypage/profile
router.post('/', function(req, res) {



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



        //1.DB 연결
        function(data, callback) {
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
            }); //pool.getConnection
        },

        //2. 유저 정보 업데이트 -> user_combine 테이브레 유저 education  컬럼 없어서 저거 user_new_education 은 안쓸거임 
        function(data, connection, callback) {

            let updateUserInfoQuery = `update user_combine uc set uc.age  = ?, uc.gender = ?, uc.marriage = ?, uc.job = ?, uc.city = ? where uc.user_id = ?`;
            let queryArray = [req.body.user_updated_age, req.body.user_updated_gender, req.body.user_updated_marriage, req.body.user_updated_job, req.body.user_updated_city, data];

            connection.query(updateUserInfoQuery, queryArray, function(err) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    }); //res.status(500).send
                    connection.release();
                    callback("Query has sentence error" + err);
                } else {
                    res.status(201).send({
                        status: "Success",
                        msg: "Successfully update user's new info",
                    });
                    connection.release();
                    callback(null, "Successfully update user's new info");
                }
            });
        }
    ];

    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        //마지막에 null하면서 result 로 넘어가면서 console log 
        else console.log(result);
    }); //async.waterfall
});


module.exports = router;