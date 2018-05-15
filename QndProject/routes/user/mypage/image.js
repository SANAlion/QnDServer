var express = require('express');
var router = express.Router();
const async = require('async');
const pool = require('../../../private_module/dbPool');
const moment = require('moment');
const upload = require('../../../private_module/awsUpload');
const jsonVerify = require('../../../private_module/jwtVerify');
const jwtSecret = require('../../../config/jwtSecret');

router.post('/', upload.single('user_updated_img'), function(req, res) {

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
        //1. DB 연결
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
            });
        },

        //2. 유저 이미지 정보 업데이트 
        function(data, connection, callback) {

            let updateUserImgQuery = `update user_combine uc set uc.img  = ? where uc.user_id = ?`;
            let queryArray = [req.file.location, data];

            connection.query(updateUserImgQuery, queryArray, function(err) {
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
                        msg: "Successfully update profile img ",

                    });
                    connection.release();
                    callback(null, "Successfully update profile img ");
                }
            });
        }
    ];

    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    }); //async.waterfall
});


module.exports = router;