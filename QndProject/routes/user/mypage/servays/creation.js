var express = require('express');
var router = express.Router();
const async = require('async');
const pool = require('../../../../private_module/dbPool');
const moment = require('moment');
const jsonVerify = require('../../../../private_module/jwtVerify');
const jwtSecret = require('../../../../config/jwtSecret');


router.get('/', function(req, res) {


    let taskArray = [

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


        //1.DB 연결

        function(data, callback) {

            pool.getConnection(function(err, connection) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                    callback("DB connection has failed : " + err);
                } else {
                    callback(null, data, connection);
                }
            }); //pool.getConnection
        },

        //2. 내가 만든 설문들의 제목, 작성 시간, 서베이 고유 아이디 가져오기  
        function(data, connection, callback) {
            console.log(data);


            let selectQuery = `select sc.title, sc.write_time, sc.servay_id from servay_combine sc where sc.user_id = ? order by sc.servay_id desc;`;
            let queryArray = [data];

            connection.query(selectQuery, queryArray, function(err, selection_result) {

                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    callback(null, data, connection, selection_result);
                }
            });
        },

        //2-1. 유저가 만든 설문 없을때
        (data, connection, result, callback) => {

            if (result.length == 0) {
                res.status(400).send({
                    status: "Fail",
                    msg: "User has not made any servay"
                });
                connection.release();
                callback("User has not made any servay");
            } else {
                callback(null, data, connection, result);
            }
        },


        //3. 정보 뿌려주기 
        function(data, connection, result, callback) {
            let dataArray = [];

            for (var i = 0; i < result.length; i++) {


                var writeTimeFinal = moment(result[i].write_time).format('YYYY.MM.DD');
                
                let resultData = {
                    servay_id: result[i].servay_id,
                    servay_title: result[i].title,
                    servay_write_time: writeTimeFinal

                };
                dataArray.push(resultData);
            }

            res.status(200).send({
                status: "Success",
                data: dataArray,
                msg: "Successfully get user created servay data "
            });
            connection.release();
            callback(null, "Successfully send user created servay data");
        }
    ];

    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    }); //async.waterfall
});


module.exports = router;