const express = require('express');
const router = express.Router();

const moment = require('moment');
const pool = require('../../private_module/dbPool');
const upload = require('../../private_module/awsUpload');
const async = require('async');
const jsonVerify = require('../../private_module/jwtVerify');
const jwtSecret = require('../../config/jwtSecret');

router.post('/', upload.fields([{name: "servay_a_img", maxCount : 1}, {name: "servay_b_img", maxCount : 1}]), function(req, res) {

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


   //2. 유저 가능 포인트 받아오기 
    (data, connection, callback)=>{


      let selectUserPointQuery = `select uc.available_point, uc.used_point from user_combine uc where uc.user_id = ?;`;
      let queryArray = [data];
      
      connection.query(selectUserPointQuery, queryArray, function(err, result){
        if(err) {
          res.status(500).send({
            status : "Fail",
            msg : "Query has sentance error"
          });
          connection.release();
          callback("Query has sentance error : " + err);
        } else {
          callback(null, data, connection,result);
        }
      }); 
    },


//3. 받아온 유저 포인트랑 설문 등록 포인트랑 비교  
  (data, connection, result, callback)=>{
    if (req.body.servay_option_count == 0) {
       if (result[0].available_point < 20 ) {
         res.status(400).send({
            status : "Fail",
            msg : "User does not have enough point"
          });
          connection.release();
          callback("User does not have enough point " );
        } else {
          callback(null, data, connection,result);
        }
    }
    else if (req.body.servay_option_count == 1){
       if (result[0].available_point < 30 ) {
          res.status(400).send({
            status : "Fail",
            msg : "User does not have enough point"
          });
          connection.release();
          callback("User does not have enough point  " );
       } else {
          callback(null, data, connection,result);
       }

    }
    else if (req.body.servay_option_count == 2){
       if (result[0].available_point < 40 ) {
         res.status(400).send({
            status : "Fail",
            msg : "User does not have enough point"
          });
          connection.release();
          callback("User does not have enough point  " );
       } else {
          callback(null, data, connection,result);
       }
    }  

  },     



    //4. 유저 포인트 충분히 있으면, servay에  insert 
    (data, connection, result, callback) => {

      let insertServayQuery = `insert into servay_combine (user_id, servay_type, title, valid_period, goal, anonymous, 
                              start_age, end_age, tag1, tag2, tag3, explanation, gender, marriage, write_time, option_count, tag_count, like_count, alert_count, done, participate_count) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,0);`;

      let write_time =  moment().format("YYYYMMDDHHmmss");
      let queryArray = [data, req.body.servay_servay_type, req.body.servay_title, req.body.servay_valid_period, req.body.servay_goal, req.body.servay_anonymous, req.body.servay_start_age, req.body.servay_end_age, req.body.servay_tag1, req.body.servay_tag2, req.body.servay_tag3, req.body.servay_explanation, req.body.servay_gender, req.body.servay_marriage, write_time, req.body.servay_option_count, req.body.servay_tag_count];
      
      connection.query(insertServayQuery, queryArray, function(err){
         if(err) {
          res.status(500).send({
            status : "Fail",
            msg : "Query has sentance error"
          });
          connection.release();
          callback("Query has sentance error : " + err);
         } else {
          callback(null, data, connection, result);
         }
      }); 
    },  

    //5. servay_type 에 따라서 세부 작업 (각각 테이블에 insert)

    (data, connection, result, callback)=>{

      if (req.body.servay_servay_type == 0 ){


        let insertServayOptionQuery = `insert into servay_option (servay_id, duple, q1, q2, q3, q4, q_count) 
                              values (LAST_INSERT_ID(),?,?,?,?,?,?);`;
        let queryArray = [req.body.servay_duple, req.body.servay_q1, req.body.servay_q2, req.body.servay_q3, req.body.servay_q4, req.body.servay_q_count];
      
        connection.query(insertServayOptionQuery, queryArray, function(err){
          if(err) {
           res.status(500).send({
            status : "Fail",
            msg : "Query has sentence error"
           });
           connection.release();
           callback("Query has sentence error : " + err);
          } else {
           callback(null, data, connection, result);
          }
        }); //if type == 0
      }  

      else if (req.body.servay_servay_type == 1 ){



       // let a_txt = req.body.servay_a_txt;
        let a_img = null;
         if(req.files.servay_a_img != null){
            a_img = req.files.servay_a_img[0].location; }
      //  let b_txt = req.body.servay_b_txt;
        let b_img = null;
          if(req.files.servay_b_img != null){
            b_img = req.files.servay_b_img[0].location; }

        let insertServayABQuery = `insert into servay_ab (servay_id, a_txt, a_img, b_txt, b_img) 
                              values (LAST_INSERT_ID(),?,?,?,?);`;
              console.log(req.files.servay_a_img[0].location);
        let queryArray = [req.body.servay_a_txt, a_img, req.body.servay_b_txt, b_img];
      
        connection.query(insertServayABQuery, queryArray, function(err){
          if(err) {
           res.status(500).send({
            status : "Fail",
            msg : "Query has sentence error" 
           });
           connection.release();
           callback("Query has sentence error: " + err);
          } else {       
           callback(null, data, connection, result);
          }
        }); 
      }

      else if ( req.body.servay_servay_type == 2){
        callback(null, data, connection, result);
      }// if type ==2 end 
    },

 
    
  //6. 아무 문제 없으면 user_point 차감하고 등록해주기. 
 (data, connection, result, callback) => {

  let available_point =  result[0].available_point;
  let used_point = result[0].used_point;

    if (req.body.servay_option_count == 0) {

      let updatePointQuery = `update user_combine uc set uc.available_point = ?, uc.used_point = ? where uc.user_id = ?;`;
      let queryArray = [available_point - 20, used_point + 20, data];
      
      connection.query(updatePointQuery, queryArray, function(err){
          if(err) {
           res.status(500).send({
            status : "Fail",
            msg : "Query has sentence error" 
           });
           connection.release();
           callback("Query has sentence error: " + err);
          } else {
           res.status(201).send({
            status : "Success",
            msg : "Successfully create servay",
           });
           connection.release();
           callback(null, "Successfully create servay");
          }
      });       
    }

    else if (req.body.servay_option_count == 1) {


      let updatePointQuery = `update user_combine uc set uc.available_point = ?, uc.used_point = ? where uc.user_id = ?;`;
      let queryArray = [available_point - 30, used_point + 30, data];
      
      connection.query(updatePointQuery, queryArray, function(err){
          if(err) {
           res.status(500).send({
            status : "Fail",
            msg : "Query has sentence error" 
           });
           connection.release();
           callback("Query has sentence error: " + err);
          } else {
           res.status(201).send({
            status : "Success",
            msg : "Successfully create servay",
           });
           connection.release();
           callback(null, "Successfully create servay");
          }
      });     
    }
    else if (req.body.servay_option_count == 2) {

      let updatePointQuery = `update user_combine uc set uc.available_point = ?, uc.used_point = ? where uc.user_id = ?;`;
      let queryArray = [available_point - 40, used_point + 40, data];
      
      connection.query(updatePointQuery, queryArray, function(err){
          if(err) {
           res.status(500).send({
            status : "Fail",
            msg : "Query has sentence error" 
           });
           connection.release();
           callback("Query has sentence error: " + err);
          } else {
           res.status(201).send({
            status : "Success",
            msg : "Successfully create servay",
           });
           connection.release();
           callback(null, "Successfully create servay");
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
