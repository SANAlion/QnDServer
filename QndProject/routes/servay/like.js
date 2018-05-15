const express = require('express');
const router = express.Router();
const async = require('async');
const jwt = require('jsonwebtoken');

const pool = require('../../private_module/dbPool');
const jsonVerify = require('../../private_module/jwtVerify');

const jwtSecret = require('../../config/jwtSecret');

router.get('/:servay_id', (req, res) => {


    // req.headers.user_id
    // req.params.servay_id

    let likeTaskArray = [
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
        (user_id, callback) => {
            // 커넥션을 연결함
            pool.getConnection((connectingError, connectingResult) => {
                if (connectingError) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                    callback("DB connection error has occured : " + connectingError);
                } else callback(null, connectingResult, user_id);
            });
        },
        (connection, user_id, callback) => {
            // 기존 좋아요 정보를 판단하여 가져옴
            let selectQuery = "select * from like_servay where servay_id = ? and user_id = ?";

            connection.query(selectQuery, [req.params.servay_id, user_id], (selectQueryError, selectQueryResult) => {
                if (selectQueryError) {
                    connection.release();
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query to selecting has sentance error"
                    });

                    callback("Query to selecting has sentance error : " + selectQueryError);
                } else callback(null, connection, selectQueryResult, user_id);
            });
        },
        // 좋아요 선택 여부에 따라 새로운 row 생성
        (connection, selectedQuery, user_id, callback) => {
            if (selectedQuery[0] == undefined) {
                let insertQuery = "insert into like_servay values (?,?,?)";

                connection.query(insertQuery, [null, req.params.servay_id, user_id], (insertQueryError, insertQueryResult) => {
                    if (insertQueryError) { // 데이터가 생성되지 않음
                        connection.release();
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query to inserting has sentance error"
                        });

                        callback("Query to inserting has sentance error : " + insertQueryError);
                    } else callback(null, connection, selectedQuery);
                });
            } else if (selectedQuery[0] != undefined) {
                let deleteQuery = "delete from like_servay where servay_id = ? and user_id = ?";

                connection.query(deleteQuery, [req.params.servay_id, user_id], (deleteQueryError, deleteQueryResult) => {
                    if (deleteQueryError) { // 데이터가 생성되지 않음
                        connection.release();
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query to deleteing has sentance error"
                        });

                        callback("Query to deleteing has sentance error : " + deleteQueryError);
                    } else callback(null, connection, selectedQuery);
                });
            }
        },
        // 좋아요 선택 여부에 따라 like 증감
        (connection, selectedQuery, callback) => {
            if (selectedQuery[0] == undefined) {
                let likePlusQuery = "update servay_combine set like_count = like_count + 1 where servay_id = ?";

                connection.query(likePlusQuery, req.params.servay_id, (likePlusQueryError, likePlusQueryResult) => {
                    if (likePlusQueryError) {
                        connection.release();
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query for plus has sentance error"
                        });

                        callback("Query for plus has sentance error : " + likePlusQueryError);
                    } else {
                        connection.release();
                        callback(null, selectedQuery);
                    }
                });
            } else if (selectedQuery[0] != undefined) {
                let likeMinusQuery = "update servay_combine set like_count = like_count - 1 where servay_id = ?";

                connection.query(likeMinusQuery, req.params.servay_id, (likeMinusQueryError, likeMinusQueryResult) => {
                    if (likeMinusQueryError) {
                        connection.release();
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query for minus has sentance error"
                        });

                        callback("Query for minus has sentance error : " + likeMinusQueryError);
                    } else {
                        connection.release();
                        callback(null, selectedQuery);
                    }
                });
            }
        },
        (selectedQuery, callback) => {
            if (selectedQuery[0] == undefined) {
                res.status(200).send({
                    status: "Success",
                    msg: "Success to like"
                });
            } else if (selectedQuery[0] != undefined) {
                res.status(200).send({
                    status: "Success",
                    msg: "Success to unlike"
                });
            }
        }
    ];

    async.waterfall(likeTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
})

module.exports = router;