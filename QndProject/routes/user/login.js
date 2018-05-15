const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');

const jsonWebToken = require('jsonwebtoken');

const pool = require('../../private_module/dbPool');
/*
    Request
    -body
    String user_email
    int user_type
    String user_input_pwd
*/
router.post('/', (req, res) => {
    let loginTaskArray = [
        (callback) => {
            pool.getConnection((connectingError, connectingResult) => {
                if (connectingError) {
                    callback("DB connection error has occured : " + connectingError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                } else callback(null, connectingResult);
            });
        },
        (connection, callback) => {
            if (req.body.user_type === 0) {
                let selectQuery = "select * from user_combine where email=?";

                connection.query(selectQuery, [req.body.user_email], (queryError, queryResult) => {
                    if (queryError) {
                        connection.release();
                        callback("Query has sentance error : " + queryError);

                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentance error"
                        });
                    } else {
                        connection.release();
                        callback(null, queryResult);
                    }
                });
            } else {
                // facebook일 경우
                callback(null);

                res.status(500).send({
                    status : "Success",
                    msg : "Facebook login has not ready"
                });
            }
        },
        (userData, callback) => {
            if (userData[0] === undefined) {
                callback("This user has not recognized");

                res.status(500).send({
                    stat: "Fail",
                    msg: "You're not our member"
                });
            } else {
                crypto.pbkdf2(req.body.user_input_pwd, userData[0].salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
                    if(hashingError) {
                        callback("Hashing has failed : " + hashingError);

                        res.status(500).send({
                            status : "Fail",
                            msg : "Hashing has failed"
                        });
                    } else if(hashingResult.toString('base64') === userData[0].pwd) {
                        callback(null, userData[0].user_id);
                    } else {
                        callback("You're not our member");

                        res.status(500).send({
                            status : "Fail",
                            msg : "You're not our member"
                        });
                    }
                });
            }
        },
        (userId, callback) => {
            let jwtSecret = req.app.get('jwt-secret');
            let option = {
                algorithm: "HS512",
                expiresIn: 3600 * 24 * 365 //한시간 * 24 * 1 즉 하루!
            };

            let payload = {
                user_id : userId
            }
            //저기서 const 로 발급받은 key 로 key.secret 으로 사용하는거야 
            //저기 안에 파일 들어가서 secret 받아오는 형태! 
            jsonWebToken.sign(payload, jwtSecret, option, (err, token) => {
                if (err) {
                    callback('token err' + err);

                    res.status(500).send({
                       	status : "Fail",
                        msg: 'token err'
                    });
                } else {
                    callback(null, "token ok");

                    res.status(200).send({
                        status : "Success",
                        data: token, //메일과 닉네임 정보 담긴 token 발급!
                        msg : 'Successfully issue Json Web Token(JWT)'
                    });
                }
            });
        }
    ];

    async.waterfall(loginTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

module.exports = router;