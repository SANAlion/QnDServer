const express = require('express');
const router = express.Router();

const pool = require('../../private_module/dbPool');
const async = require('async');

const jwt = require('jsonwebtoken');
const jsonVerify = require('../../private_module/jwtVerify');
const jwtSecret = require('../../config/jwtSecret');

const mylib = require('../../lib/search');


router.post('/', (req, res) => {

    let searchServayTaskArray = [
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
            // 시간 경과에 따른 done 값 업데이트 
            let changeDoneQuery = "update servay_combine set done = 1 where DATEDIFF(now(), write_time) > valid_period";

            connection.query(changeDoneQuery, (updateQueryError, updateQueryResult) => {
                if (updateQueryError) {
                    connection.release();
                    res.status(500).send({
                        status: "Fail",
                        msg: "datetime change error"
                    });

                    callback("datetime change error : " + updateQueryError);
                } else callback(null, connection, user_id);
            });
        },
        (connection, user_id, callback) => {
            let text = mylib.check_text(req.body.search);

            let selectQuery = "select * from \
  (select * from servay_combine aaa left join \
    (select * from \
      (select * from \
      (select servay_id as selected_servay, user_id as selected_user from selection where user_id = ? group by selected_servay) aa \
      left outer join (select servay_id as liked_servay, user_id as liked_user from like_servay where user_id = ? group by liked_servay) ab \
      on aa.selected_servay = ab.liked_servay \
      union \
      select * from \
      (select servay_id as selected_servay, user_id as selected_user from selection where user_id = ? group by selected_servay) ba \
      right outer join (select servay_id as liked_servay, user_id as liked_user from like_servay where user_id = ? group by liked_servay) bb \
      on ba.selected_servay = bb.liked_servay) c \
    ) \
    bbb on aaa.servay_id = bbb.selected_servay or aaa.servay_id = bbb.liked_servay\
  ) ccc \
  left join \
  (select servay_id as count_servay_man, count(user_id) as count_man from selection group by count_servay_man) ddd \
  on ccc.servay_id = ddd.count_servay_man ";

            callback(null, connection, mylib.check_order(selectQuery = mylib.check_status(selectQuery = mylib.check_ing(selectQuery, req.body.ing), text), req.body.order), mylib.make_JSON(text, user_id, req.body.search));
        },
        (connection, selectQuery, JSONForSearch, callback) => {
            connection.query(selectQuery, JSONForSearch, (queryError, queryResult) => {
                if (queryError) {
                    connection.release();
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });

                    callback("Query has sentance error : " + queryError);
                } else callback(null, connection, queryResult);
            });
        },
        (connection, servayArray, callback) => {

            // id에 해당하는 유저 프로필 사진 가져옴 
            let userQuery = "select user_id, img from user_combine";

            connection.query(userQuery, (userQueryError, userQueryResult) => {
                if (userQueryError) {
                    connection.release();
                    res.status(500).send({
                        status: "Fail",
                        msg: "Userquery has sentance error"
                    });

                    callback("Userquery has sentance error : " + userQueryError);
                } else {
                    connection.release();
                    callback(null, servayArray, userQueryResult);
                }
            });
        },
        (servayArray, userArray, callback) => {
            if (servayArray[0] == undefined) {
                res.status(201).send({
                    status: "Fail",
                    msg: "servay empty"
                });

                callback("servay empty");
            } else if (servayArray[0] == undefined) {
                res.status(201).send({
                    status: "Fail",
                    msg: "user empty"
                });

                callback("user empty");
            } else {
                let servayArrayJSON = [];
                for (var index1 = 0; index1 < servayArray.length; index1++) {
                    servayArray[index1].get = 2 + servayArray[index1].option_count;
                    for (var index2 = 0; index2 < userArray.length; index2++) {
                        if (servayArray[index1].user_id == userArray[index2].user_id) {
                            servayArray[index1].img = userArray[index2].img;
                        }

                    }
                    if (servayArray[index1].selected_user == null) {
                        servayArray[index1].selected_user = 0;
                    } else {
                        servayArray[index1].selected_user = 1;
                    }
                    if (servayArray[index1].liked_user == null) {
                        servayArray[index1].liked_user = 0;
                    } else {
                        servayArray[index1].liked_user = 1;
                    }
                    if (servayArray[index1].count_man == null) {
                        servayArray[index1].count_man = 0;
                    }
                    // 서베이 구조
                    servayArrayJSON[index1] = {
                        servay_id : servayArray[index1].servay_id,
                        servay_type : servayArray[index1].servay_type,
                        servay_title : servayArray[index1].title,
                        servay_goal: servayArray[index1].goal,
                        servay_vaild_period: servayArray[index1].vaild_period,
                        servay_anonymous: servayArray[index1].anonymous,
                        servay_start_age: servayArray[index1].start_age,
                        servay_end_age: servayArray[index1].end_age,
                        servay_tag1: servayArray[index1].tag1,
                        servay_tag2: servayArray[index1].tag2,
                        servay_tag3: servayArray[index1].tag3,
                        servay_like_count: servayArray[index1].like_count,
                        servay_gender: servayArray[index1].gender,
                        servay_marriage: servayArray[index1].marriage,
                        servay_done: servayArray[index1].done,
                        servay_get: servayArray[index1].get,
                        servay_selected: servayArray[index1].selected_user,
                        servay_liked: servayArray[index1].liked_user,
                        servay_man: servayArray[index1].count_man,
                        servay_write_time: servayArray[index1].write_time,
                        // servay_option_count : servayArray[index1].option_count,
                        servay_title_img: servayArray[index1].img,
                    };
                }
                res.status(201).send({
                    status: "Success",
                    data: servayArrayJSON,
                    msg: "Successful toss servay array"
                });

                callback(null, "Success");
            }
        }
    ];

    async.waterfall(searchServayTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

module.exports = router;