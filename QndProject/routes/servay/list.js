const express = require('express');
const router = express.Router();
const async = require('async');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const pool = require('../../private_module/dbPool');
const jsonVerify = require('../../private_module/jwtVerify');

const jwtSecret = require('../../config/jwtSecret');

const mylib = require('../../lib/search');


router.get('/', (req, res) => {

    let readServayTaskArray = [
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
            // id에 해당하는 유저 프로필 정보 가져옴 
            let userQuery = "select age, gender, marriage, img from user_combine where user_id = ?";

            connection.query(userQuery, user_id, (userQueryError, userQueryResult) => {
                if (userQueryError) {
                    connection.release();
                    res.status(500).send({
                        status: "Fail",
                        msg: "Userquery has sentance error"
                    });

                    callback("Userquery has sentance error : " + userQueryError);
                } else callback(null, connection, userQueryResult, user_id);
            });
        },
        (connection, userInfomation, user_id, callback) => {
            // 서베이 목록 불러옴
            let user_age = userInfomation[0].age;
            let user_gender = userInfomation[0].gender;
            let user_marriage = userInfomation[0].marriage;
            let selectQuery = "select servay_id, user_id, servay_type, title, goal, valid_period, anonymous, start_age, end_age, tag1, tag2, tag3, like_count, gender, marriage, done, write_time, option_count, selected_user, liked_user, count_man \
      from \
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
  on ccc.servay_id = ddd.count_servay_man \
      where (done <> 1) and ((start_age <> 0 and start_age <= ? and end_age <> 0 and end_age >= ?) or (start_age = 0 and end_age >= ? ) or (start_age <= ? and end_age = 0) or (start_age = 0 and end_age = 0)) and (gender = ? or gender = 0) and (marriage = ? or marriage = 0) order by write_time DESC"

            connection.query(selectQuery, [user_id, user_id, user_id, user_id, user_age, user_age, user_age, user_age, user_gender, user_marriage], (queryError, queryResult) => {
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
                        servay_id: servayArray[index1].servay_id,
                        servay_type: servayArray[index1].servay_type,
                        servay_title: servayArray[index1].title,
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
                        // servay_write_time : servayArray[index1].write_time,
                        // servay_option_count : servayArray[index1].option_count,
                        servay_title_img: servayArray[index1].img,
                    };
                }
                res.status(200).send({
                    status: "Success",
                    data: servayArrayJSON,
                    msg: "Successful toss servay array"
                });

                callback(null, "Success");
            }
        }
    ];

    async.waterfall(readServayTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

router.get('/:servay_id', (req, res) => {
    let isLike = 0;

    let taskArray = [
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
                        msg : "DB connection has failed"
                    });

                    callback("DB connection has failed : " + connectingError);
                } else callback(null, connectingResult, userId);
            });
        },
        (connection, userId, callback) => {
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
                    callback(null, connection, userId);

                    isLike = 0;
                } else {
                    callback(null, connection, userId);

                    isLike = 1;
                }
            });
        },
        (connection, userId, callback) => {
            let selectQuery = "select servay_type, title, explanation, goal, option_count, like_count, alert_count from servay_combine where servay_id=?";

            connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
                if(queryError) {
                    connection.release();
                    callback("Query has sentance error");

                    res.status(500).send({
                        status : "Fail",
                        msg : "Query has sentance error"
                    });
                } else {
                    callback(null, connection, userId, queryResult[0]);
                }
            });
        },
        (connection, userId, servayData, callback) => {
            if(servayData.servay_type === 0) {
                let selectQuery = "select * from servay_option where (servay_id=?)";

                connection.query(selectQuery, [req.params.servay_id], (queryError, queryResult) => {
                    if(queryError) {
                        connection.release();
                        callback("Query has sentance error : " + queryError);

                        res.status(500).send({
                            status : "Fail",
                            msg : "Query has sentance error"
                        });
                    } else {
                        if(queryResult[0].q_count === 2) {
                            connection.release();

                            let detailReadJSONData = {
                                servay_id : parseInt(req.params.servay_id),
                                servay_option_id : queryResult[0].servay_option_id,
                                servay_type : servayData.servay_type,
                                servay_title : servayData.title,
                                servay_explanation : servayData.explanation,
                                servay_q_count : queryResult[0].q_count,
                                servay_q1 : queryResult[0].q1,
                                servay_q2 : queryResult[0].q2,
                                servay_duple : queryResult[0].duple,
                                servay_option_count : servayData.option_count,
                                servay_goal : servayData.goal,
                                servay_like_count : servayData.like_count,
                                servay_alert_count : servayData.alert_count,
                                selection_start_select_time : moment().format("YYYYMMDDHHmmss"),
                                is_like : isLike
                            };

                            res.status(201).send({
                                status : "Success",
                                data : detailReadJSONData,
                                msg : "Successfully get detail read servay"
                            });
                        }
                        else if(queryResult[0].q_count === 3) {
                            connection.release();

                            let detailReadJSONData = {
                                servay_id : parseInt(req.params.servay_id),
                                servay_option_id : queryResult[0].servay_option_id,
                                servay_type : servayData.servay_type,
                                servay_title : servayData.title,
                                servay_explanation : servayData.explanation,
                                servay_q_count : queryResult[0].q_count,
                                servay_q1 : queryResult[0].q1,
                                servay_q2 : queryResult[0].q2,
                                servay_q3 : queryResult[0].q3,
                                servay_duple : queryResult[0].duple,
                                servay_option_count : servayData.option_count,
                                servay_goal : servayData.goal,
                                servay_like_count : servayData.like_count,
                                servay_alert_count : servayData.alert_count,
                                selection_start_select_time : moment().format("YYYYMMDDHHmmss"),
                                is_like : isLike
                            };

                            res.status(201).send({
                                status : "Success",
                                data : detailReadJSONData,
                                msg : "Successfully get detail read servay"
                            });
                        } else {
                            connection.release();

                            let detailReadJSONData = {
                                servay_id : parseInt(req.params.servay_id),
                                servay_option_id : queryResult[0].servay_option_id,
                                servay_type : servayData.servay_type,
                                servay_title : servayData.title,
                                servay_explanation : servayData.explanation,
                                servay_q_count : queryResult[0].q_count,
                                servay_q1 : queryResult[0].q1,
                                servay_q2 : queryResult[0].q2,
                                servay_q3 : queryResult[0].q3,
                                servay_q4 : queryResult[0].q4,
                                servay_duple : queryResult[0].duple,
                                servay_option_count : servayData.option_count,
                                servay_goal : servayData.goal,
                                servay_like_count : servayData.like_count,
                                servay_alert_count : servayData.alert_count,
                                selection_start_select_time : moment().format("YYYYMMDDHHmmss"),
                                is_like : isLike
                            };

                            res.status(201).send({
                                status : "Success",
                                data : detailReadJSONData,
                                msg : "Successfully get detail read servay"
                            });
                        }

                        callback(null, "Successfully get detail read servay");
                    }
                });
            }
            else if(servayData.servay_type === 2) {
                connection.release();

                let detailReadJSONData = {
                    servay_id : parseInt(req.params.servay_id),
                    servay_type : servayData.servay_type,
                    servay_title : servayData.title,
                    servay_explanation : servayData.explanation,
                    servay_option_count : servayData.option_count,
                    servay_goal : servayData.goal,
                    servay_like_count : servayData.like_count,
                    servay_alert_count : servayData.alert_count,
                    selection_start_select_time : moment().format("YYYYMMDDHHmmss"),
                    is_like : isLike
                };

                res.status(201).send({
                    status : "Success",
                    data : detailReadJSONData,
                    msg : "Sucessfully get detail read"
                });
            }
            else if(servayData.servay_type === 1) {
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

                        let detailReadJSONData = {
                            servay_id : parseInt(req.params.servay_id),
                            servay_ab_id : queryResult[0].servay_ab_id,
                            servay_type : servayData.servay_type,
                            servay_title : servayData.title,
                            servay_explanation : servayData.explanation,
                            servay_a_txt : queryResult[0].a_txt,
                            servay_b_txt : queryResult[0].b_txt,
                            servay_a_img : queryResult[0].a_img,
                            servay_b_img : queryResult[0].b_img,
                            servay_option_count : servayData.option_count,
                            servay_goal : servayData.goal,
                            servay_like_count : servayData.like_count,
                            servay_alert_count : servayData.alert_count,
                            selection_start_select_time : moment().format("YYYYMMDDHHmmss"),
                            is_like : isLike
                        };

                        res.status(201).send({
                            status : "Success",
                            data : detailReadJSONData,
                            msg : "Successfully get detail read"
                        });

                        callback(null, "Successfully get detail read");
                    }
                });
            } else {
                connection.release();
                callback(null, "This data servay_type is not between 0 and 2");

                res.status(500).send({
                    status : "Fail",
                    msg : "This data servay_type is not betwwen 0 and 2"
                });
            }
        }
    ];

    async.waterfall(taskArray, (asyncError, asyncResult) => {
        if(asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

router.post('/', function(req, res) {


    let start_select_time = req.body.selection_start_select_time;

    let task = [

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
        (data, callback) => {

            pool.getConnection((err, connection) => {
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


        //1-1. 이미 완료된 설문 
        (data, connection, callback) => {


            let selectServayDoneQuery = `select sc.done from servay_combine sc where sc.servay_id = ?`;
            let queryArray = [req.body.servay_id];
            connection.query(selectServayDoneQuery, queryArray, function(err, selection_result) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    if (selection_result[0].done == 1) {
                        res.status(400).send({
                            status: "Fail",
                            msg: "This servay is already done"
                        });
                        connection.release();
                        callback("This servay is already done");
                    } else {
                        callback(null, data, connection);
                    }
                }
            });
        },

        //1-2. 이미 참여한 설문 

        (data, connection, callback) => {
            let selectParticipateQuery = `select sl.* from selection sl where sl.user_id = ? and sl.servay_id = ?`;
            let queryArray = [data, req.body.servay_id];
            connection.query(selectParticipateQuery, queryArray, function(err, selection_result) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    if (selection_result.length >= 1) {
                        res.status(400).send({
                            status: "Fail",
                            msg: "User already participate this servay"
                        });
                        connection.release();
                        callback("User already participate this servay");
                    } else {
                        callback(null, data, connection);
                    }
                }
            });
        },

        //2-1. servay_combine에서 필요한 정보 뽑아오기 . servay_type, option_count, goal

        (data, connection, callback) => {
            let selectQuery = `select sc.servay_type, sc.option_count, sc.goal, sc.participate_count from servay_combine sc where sc.servay_id = ?`;
            let queryArray = [req.body.servay_id];
            connection.query(selectQuery, queryArray, function(err, servay_result) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    callback(null, data, connection, servay_result);
                }
            });

        },


        //2-2. 각각 응답에 대해 select table 에 저장  
        (data, connection, servay_result, callback) => {
            let servay_type = servay_result[0].servay_type;
            if (servay_type == 0) {
                //null로 들어오면 문항 자체가 없었던것, 0은 선택 안한것, 1은 선택한것. 
                let choice1 = req.body.selection_choice1;
                let choice2 = null;
                if (req.body.selection_choice2 != null) {
                    choice2 = req.body.selection_choice2;
                }
                let choice3 = null;
                if (req.body.selection_choice3 != null) {
                    choice3 = req.body.selection_choice3;
                }
                let choice4 = null;
                if (req.body.selection_choice4 != null) {
                    choice4 = req.body.selection_choice4;
                }

                let insertParticipateServayQuery = `insert into selection (choice1, choice2, choice3, choice4, user_id, servay_id, start_select_time, end_select_time, is_real ) values (?,?,?,?,?,?,?,?,?);`;
                let end_select_time = moment().format("YYYYMMDDHHmmss"); //20180105194358 이런식으로 들어옴 

                let start_select_time_int = parseInt(req.body.selection_start_select_time);
                let end_select_time_int = parseInt(end_select_time);
                let taken_time = end_select_time_int - start_select_time_int;
                let is_real = null;

                if (taken_time > 1) {
                    is_real = 0;
                } else {
                    is_real = 1;
                }
                let queryArray = [choice1, choice2, choice3, choice4, data, req.body.servay_id, req.body.selection_start_select_time, end_select_time, is_real];


                connection.query(insertParticipateServayQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentence error : " + err);
                    } else {
                        callback(null, data, connection, servay_result);
                    }
                });
            } else if (servay_type == 1 || 2) {


                /*let exQuery = 'SELECT * FROM table where clm1 = '
                let getData = req.body.data1; // '김연태' ,  if '김연태 or 1==1'....????
                exQuery += getData // SELECT * FROM table where clm1 = 김연태 
                // SELECT * FROM table where clm1 = '김연태' or 1==1 => Always True*/

                let insertParticipateServayQuery = `insert into selection (choice1, choice2, user_id, servay_id, start_select_time, end_select_time, is_real ) values (?, ?,?,?,?,?,?);`;
                let end_select_time = moment().format("YYYYMMDDHHmmss");
                let start_select_time_int = parseInt(req.body.selection_start_select_time);
                let end_select_time_int = parseInt(end_select_time);
                let taken_time = end_select_time_int - start_select_time_int;
                let is_real = null;

                if (taken_time > 1) {
                    is_real = 0;
                } else {
                    is_real = 1;
                }
                let queryArray = [req.body.selection_choice1, req.body.selection_choice2, data, req.body.servay_id, req.body.selection_start_select_time, end_select_time, is_real];

                connection.query(insertParticipateServayQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error",
                        });
                        connection.release();
                        callback("1. Query has sentence error : " + err);
                    } else {
                        callback(null, data, connection, servay_result);
                    }
                });
            } //else if end
        },

        //3. participate_count update 해주기

        (data, connection, servay_result, callback) => {
            let updateParticipateCountQuery = `update servay_combine sc set sc.participate_count  = ? where sc.servay_id = ?`;
            let participate_count = servay_result[0].participate_count;

            let queryArray = [participate_count + 1, req.body.servay_id];
            connection.query(updateParticipateCountQuery, queryArray, function(err) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    callback(null, data, connection, servay_result);
                }

            });
        },



        //4. servay_combine의 participate_count+1이  goal 과 같으면 done 값 1로 주기 

        (data, connection, servay_result, callback) => {

            let goal = servay_result[0].goal;
            let participate_count = servay_result[0].participate_count;

            if (goal == participate_count + 1) {

                let updateDoneQuery = `update servay_combine sc set sc.done  = ? where sc.servay_id = ?`;
                let queryArray = [1, req.body.servay_id];

                connection.query(updateDoneQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentence error : " + err);
                    } else {
                        callback(null, data, connection, servay_result);
                    }
                });
            } else {
                callback(null, data, connection, servay_result);
            }

        },

        //5. 유저 가능 포인트 받아오기  
        (data, connection, servay_result, callback) => {

            let selectUserPointQuery = `select uc.available_point, uc.accumulate_point from user_combine uc where uc.user_id = ?;`;

            let queryArray = [data];

            connection.query(selectUserPointQuery, queryArray, function(err, user_result) {
                if (err) {
                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentence error"
                    });
                    connection.release();
                    callback("Query has sentence error : " + err);
                } else {
                    callback(null, data, connection, servay_result, user_result);
                }
            });
        },



        //6. 아무 문제 없으면 user_point 올려주기 
        (data, connection, servay_result, user_result, callback) => {

            let option_count = servay_result[0].option_count;
            let available_point = user_result[0].available_point;
            let accumulate_point = user_result[0].accumulate_point;


            if (option_count == 0) {

                let updateUserPointQuery = `update user_combine uc set uc.available_point = ?, uc.accumulate_point = ? where uc.user_id = ?;`;
                let queryArray = [available_point + 2, accumulate_point + 2, data];

                connection.query(updateUserPointQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentence error: " + err);
                    } else {
                        res.status(201).send({
                            status: "Success",
                            get_point: 2,
                            msg: "Successfully participate servay",
                        });
                        connection.release();
                        callback(null, "Successfully participate servay");
                    }
                });
            } else if (option_count == 1) {

                let updateUserPointQuery = `update user_combine uc set uc.available_point = ?, uc.accumulate_point = ? where uc.user_id = ?;`;
                let queryArray = [available_point + 3, accumulate_point + 3, data];

                connection.query(updateUserPointQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentence error: " + err);
                    } else {
                        res.status(201).send({
                            status: "Success",
                            get_point: 3,
                            msg: "Successfully participate servay",
                        });
                        connection.release();
                        callback(null, "Successfully participate servay");
                    }
                });
            } else if (option_count == 2) {

                let updateUserPointQuery = `update user_combine uc set uc.available_point = ?, uc.accumulate_point = ? where uc.user_id = ?;`;
                let queryArray = [available_point + 4, accumulate_point + 4, data];

                connection.query(updateUserPointQuery, queryArray, function(err) {
                    if (err) {
                        res.status(500).send({
                            status: "Fail",
                            msg: "Query has sentence error"
                        });
                        connection.release();
                        callback("Query has sentence error: " + err);
                    } else {
                        res.status(201).send({
                            status: "Success",
                            get_point: 4,
                            msg: "Successfully participate servay",
                        });
                        connection.release();
                        callback(null, "Successfully participate servay");
                    }
                });
            }
        }

    ];
    async.waterfall(task, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});


module.exports = router;