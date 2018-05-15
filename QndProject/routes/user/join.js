const express = require('express');
const router = express.Router();
const async = require('async');
const crypto = require('crypto');

const pool = require('../../private_module/dbPool');

const awsUpload = require('../../private_module/awsUpload');
/*
   Request
   -body
   int user_type
   String user_email
   int user_age
   int user_gender
   int user_marriage
   String user_job
   String user_city
   String user_pwd
   -file
   String img
*/
router.post('/', awsUpload.single('img') , (req, res) => {
   let joinTaskArray = [
      (callback) => {
         crypto.randomBytes(32, (saltingError, saltingResult) => {
            if(saltingError) {
               callback("Salting has failed : " + saltingError);

               res.status(500).send({
                  status : "Fail",
                  msg : "Salting has failed"
               });
            }
            else callback(null, saltingResult.toString('base64'));
         });
      },
      // password가 salt와 함께 넘어와서 hashing됨
      (salt, callback) => {
         crypto.pbkdf2(req.body.user_pwd, salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
            if(hashingError) {
               callback("Hashing has failed : " + hashingError);

               res.status(500).send({
                  status : "Fail",
                  msg : "Hashing has failed"
               });
            } else {
               callback(null, salt, hashingResult.toString('base64'));
            }
         });
      },
      (salt, hashedPwd, callback) => {
         pool.getConnection((connectingError, connectingResult) => {
            if(connectingError) {
               callback("DB connection has failed : " + connectingError);

               res.status(500).send({
                  status : "Fail",
                  msg : "DB connection has failed"
               })
            } else {
               callback(null, connectingResult, salt, hashedPwd);
            }
         });
      },
      (connection, salt, hashedPwd, callback) => {
         // type이 0일 경우 이메일 인증을 통한 가입을 진행한다.
         if(req.body.user_type === "0") {
            let insertQuery = "insert into user_combine values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            console.log("회원가입시 이미지 없을 때 ");
            console.log("1번 경우에");
            console.log(req.file === undefined);
            console.log("2번 경우에");
            console.log(typeof req.file);
            console.log(req.file);
            if(req.file === undefined || req.file === null || req.file === "nil") {
               connection.query(insertQuery, [null, req.body.user_type, req.body.user_email, 0, 0, 0, req.body.user_age, req.body.user_gender, req.body.user_marriage, req.body.user_job, req.body.user_city, "no image", hashedPwd, salt, null], (queryError) => {
                  if(queryError) {
                     connection.release();
                     callback("Query has sentance error : " + queryError);

                     res.status(500).send({
                        status : "Fail",
                        msg : "Query has sentance error" 
                     });
                  } else {
                     connection.release();
                     callback(null, "Successful join");

                     res.status(201).send({
                        status : "Success",
                        msg : "Successful join!"
                     });
                  }
               });
            } else {
               connection.query(insertQuery, [null, req.body.user_type, req.body.user_email, 0, 0, 0, req.body.user_age, req.body.user_gender, req.body.user_marriage, req.body.user_job, req.body.user_city, req.file.location, hashedPwd, salt, null], (queryError) => {
                  if(queryError) {
                     connection.release();
                     callback("Query has sentance error : " + queryError);

                     res.status(500).send({
                        status : "Fail",
                        msg : "Query has sentance error" 
                     });
                  } else {
                     connection.release();
                     callback(null, "Successful join");

                     res.status(201).send({
                        status : "Success",
                        msg : "Successful join!"
                     });
                  }
               });
            }
         } 
         // type이 1일 경우에는 facebook login을 진행한다.
         else if(req.body.user_type === "1") {

         } 
         // 기타(type이 안들어올 경우는 없으므로 error)
         else {
            res.status(500).send({
               status : "Fail",
               msg : "Parameter 'type' has not input"
            });
         }
      }
   ];

   async.waterfall(joinTaskArray, (asyncError, asyncResult) => {
      if(asyncError) console.log("Async has error : " + asyncError);
      else console.log("Async has success : " + asyncResult);
   });
});

module.exports = router;