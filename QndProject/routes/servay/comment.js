const express = require('express');
const router = express.Router();

const pool = require('../../private_module/dbPool');
const async = require('async');

const jwt = require('jsonwebtoken');
const jsonVerify = require('../../private_module/jwtVerify');
const jwtSecret = require('../../config/jwtSecret');

router.get('/:servay_id', (req, res) => {


	// req.params.servay_id


	let readCommentTaskArray = [
    (callback) => {
      // 커넥션을 연결함
      pool.getConnection((connectingError, connectingResult) => {
        if(connectingError) {
          res.status(500).send({
            status : "Fail",
            msg : "DB connection has failed"
          });
          callback("DB connection error has occured : " + connectingError);       
        } else callback(null, connectingResult);
      });
    },
	  (connection, callback) => {
	  	// 해당 서베이 정보로 댓글 검색
	  	let selectQuery = "select comment_content, user_email, user_img from (select * from comment a left join (select user_id as left_user_id, email as user_email, img as user_img from user_combine) b on a.user_id = b.left_user_id where b.left_user_id <> 0 and servay_id = ?)c order by comment_id DESC";

	  	connection.query(selectQuery, req.params.servay_id, (queryError, queryResult) => {

	  		if(queryError) {
	  			connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "Query has sentance error"
          });

          callback("Query has sentance error : " + queryError);
        } else if(queryResult[0] === null || queryResult[0] == undefined){
          connection.release();
          res.status(200).send({
            status : "Success",
            msg : "comment empty"
          });

          callback("comment empty");
        } else {
          connection.release();
          res.status(200).send({
            status : "Success",
            data : queryResult,
            msg : "Successful toss comment array"
          });
          callback(null, "Successful toss comment array");
        }
      });
	  }
  ];

  async.waterfall(readCommentTaskArray, (asyncError, asyncResult) => {
    if(asyncError) console.log("Async has error : " + asyncError);
    else console.log("Async has success : " + asyncResult);
   });
})

router.post('/', (req, res) => {


  // req.headers.token
  // req.body.servay_id
  // req.body.content


  let writeCommentTaskArray = [
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
          connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "DB connection has failed"
          });
          callback("DB connection error has occured : " + connectingError);       
        } else callback(null, connectingResult, user_id);
      });
    },
    (connection, user_id, callback) => {
      let writeQuery = "insert into comment values (?,?,?,?)";

      connection.query(writeQuery, [null, user_id, req.body.servay_id, req.body.content], (queryError, queryResult) => {
        if(queryError){
          connection.release();
          res.status(500).send({
            status : "Fail",
            msg : "Query has sentance error"
          });

           callback("Query has sentance error : " + queryError);  
        } else {
          connection.release();
          res.status(201).send({
            status : "Success",
            msg : "Create new comment"
          });
          
          callback(null, "Create new comment"); 
        }
      });
    }
  ];

  async.waterfall(writeCommentTaskArray, (asyncError, asyncResult) => {
      if(asyncError) console.log("Async has error : " + asyncError);
      else console.log("Async has success : " + asyncResult);
   });
})

module.exports = router;