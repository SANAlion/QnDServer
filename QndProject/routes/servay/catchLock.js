const express = require('express');
const router = express.Router();

const pool = require('../../private_module/dbPool');
const async = require('async');

const jwt = require('jsonwebtoken');
const jsonVerify = require('../../private_module/jwtVerify');
const jwtSecret = require('../../config/jwtSecret');


router.get('/', (req, res) => {


  // req.headers.token


  let catchServayTaskArray = [
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
        if(connectingError) {
          res.status(500).send({
            status : "Fail",
            msg : "DB connection has failed"
          });
          callback("DB connection error has occured : " + connectingError);       
        } else callback(null, connectingResult, user_id);
      });
    },
    (connection, user_id, callback) => {
      // 시간 경과에 따른 done 값 업데이트 
      let changeDoneQuery = "update servay_combine set done = 1 where DATEDIFF(now(), write_time) >= valid_period";

      connection.query(changeDoneQuery, (updateQueryError, updateQueryResult) => {
        if(updateQueryError){          
          connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "datetime change error"
          });

          callback("datetime change error : " + updateQueryError);
        } else callback(null, connection, user_id);
      });
    },
    (connection, user_id, callback) => {
      // id에 해당하는 유저 프로필 정보 가져옴 
      let userQuery = "select age, gender, marriage, img from user_combine where user_id = ?";

      connection.query(userQuery, user_id, (userQueryError, userQueryResult) => {
       if(userQueryError){
          connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "Userquery has sentance error"           
          });
          
          callback("Userquery has sentance error : " + userQueryError);
        } else callback(null, connection, userQueryResult, user_id);
      });
    },
    (connection, userInfomation, user_id, callback) => {

      user_age = userInfomation.age;
      user_gender = userInfomation.gender;
      user_marriage = userInfomation.marriage;

      let selectQuery = "select servay_id, user_id, servay_type, title, goal, tag1, tag2, tag3, explanation, like_count, tag_count, participate_count from servay_combine a \
      left join \
        (select servay_id as selected_servay, user_id as selected_user from selection where user_id = ? group by selected_servay) b \
      on a.servay_id = b.selected_servay where b.selected_servay is null and valid_period * 24 - TIMESTAMPDIFF(HOUR, now(), write_time) >= 1 and \
      done <> 1 and ((start_age <> 0 and start_age <= ? and end_age <> 0 and end_age >= ?) or (start_age = 0 and end_age >= ? ) or (start_age <= ? and end_age = 0) or (start_age = 0 and end_age = 0)) and (gender = ? or gender = 0) and (marriage = ? or marriage = 0) \
      order by (date_add(write_time, interval + valid_period day) - now()) ASC limit 1";

      connection.query(selectQuery, [user_id, user_age, user_age ,user_age ,user_age, user_gender, user_marriage], (queryError, queryResult) => {
        if(queryError){
          connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "Query has sentance error : 1"
          });
  
          callback("Query has sentance error : " + queryError);
        }else if(queryResult[0] == undefined){
          connection.release();
          res.status(200).send({
            status : "Success",
            msg : "there's no servay"
          });
            
          callback("Servey type matching fail");
        }else callback(null, connection, queryResult);
      });
    },
    (connection, servayOne, callback) => {
      let getAnswerQuery_0 = "select q1, q2, q3, q4, duple, q_count from servay_option where servay_id = ?"; // servay_type == 0
      let getAnswerQuery_1 = "select a_txt, a_img, b_txt, b_img from servay_ab where servay_id = ?"; // servay_type == 1
      // let getAnswerQuery_2 servay_type == 0 찬반 고르는 거라 필요 x
      if(servayOne[0].servay_type == 0){
        connection.query(getAnswerQuery_0, servayOne[0].servay_id, (queryError, queryResult) => {
          if(queryError){
            connection.release();
            res.status(500).send({
              status : "Fail",
              msg : "Query has sentance error : 2"
            });
            
            callback("Servey type matching fail");
          }else if(queryResult[0] == undefined){
            connection.release();
            res.status(200).send({
              status : "Success",
              msg : "there's no servay"
            });
            
            callback("Servey type matching fail");
          }else {

            connection.release();
            selectInfo = queryResult[0];

            res.status(200).send({
              status : "Success",
              data : {
                servay_id : servayOne[0].servay_id,
                servay_type : servayOne[0].servay_type,
                servay_title : servayOne[0].title,
                servay_explanation : servayOne[0].explanation,
                servay_q1 : selectInfo.q1,
                servay_q2 : selectInfo.q2,
                servay_q3 : selectInfo.q3,
                servay_q4 : selectInfo.q4,
                duple : selectInfo.duple,
                q_count : selectInfo.q_count
              },
              msg : "Successful toss option-type servay array"
            });
          }
        });
      }else if(servayOne[0].servay_type == 1){
        connection.query(getAnswerQuery_1, servayOne[0].servay_id, (queryError, queryResult) => {
          if(queryError){
            connection.release();
            res.status(500).send({
              status : "Fail",
              msg : "Query has sentance : 3"
            });
            
            callback("Servey type matching fail");
          }else if(queryResult[0] == undefined){
            connection.release();
            res.status(200).send({
              status : "Success",
              msg : "there's no servay"
            });
            
            callback("Servey type matching fail");
          }else {
            connection.release();
            selectInfo = queryResult[0];

            res.status(200).send({
              status : "Success",
              data : {
                servay_id : servayOne[0].servay_id,
                servay_type : servayOne[0].servay_type,
                servay_title : servayOne[0].title,
                servay_explanation : servayOne[0].explanation,
                servay_a_txt : selectInfo.a_txt,
                servay_a_img : selectInfo.a_img,
                servay_b_txt : selectInfo.b_txt,
                servay_b_img : selectInfo.b_img
              },
              msg : "Successful toss ab-type servay array"
            });
          }
        });
      }else {
        connection.release();
        res.status(200).send({
          status : "Success",
          data : {
            servay_id : servayOne[0].servay_id,
            servay_type : servayOne[0].servay_type,
            servay_title : servayOne[0].title,
            servay_explanation : servayOne[0].explanation
          },
          msg : "Successful toss bw-servay array"
        });
      }
    }
  ];

  async.waterfall(catchServayTaskArray, (asyncError, asyncResult) => {
      if(asyncError) console.log("Async has error : " + asyncError);
      else console.log("Async has success : " + asyncResult);
   });
})


module.exports = router;