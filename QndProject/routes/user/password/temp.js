const express = require('express');
const router = express.Router();
const cuid = require('cuid');
const async = require('async');
const crypto = require('crypto');

const pool = require('../../../private_module/dbPool');
const emailAuthModule = require('../../../private_module/emailAuth');

router.post('/', (req, res) => {
	const tempPwd = cuid.slug();
	
    const tempTaskArray = [
        (callback) => {
            const mailOptions = {
                from: 'fantasy_gang@naver.com',
                to: [req.body.user_email],
                subject: "[QnD Corporation] 비밀번호 변경 메일입니다.",
                text: "임시 비밀번호는 다음과 같습니다.<br><br><br>임시 비밀번호 : " + tempPwd,
                html: "임시 비밀번호는 다음과 같습니다.<br><br.<br>임시 비밀번호 : " + tempPwd
            };
            emailAuthModule.sendMail(mailOptions, (sendMailError) => {
                if (sendMailError) {
                    transporter.close();
                    callback("Sending email has failed : " + error);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Sending email has failed"
                    });
                } else {
                    callback(null, "Success");
                }
            });
        },
        (dummy, callback) => {
            pool.getConnection((connectingError, connectingResult) => {
                if (connectingError) {
                    callback("DB connection has failed : " + connectingError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed"
                    });
                } else {
                    callback(null, connectingResult);
                }
            });
        },
        (connection, callback) => {
            let selectQuery = "select salt from user_combine where email=?";

            connection.query(selectQuery, [req.body.user_email], (queryError, queryResult) => {
                if (queryError) {
                    connection.release();
                    callback("Query has sentance error : " + queryError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                } else {
                    callback(null, connection, queryResult[0].salt);
                }
            });
        },
        (connection, salt, callback) => {
            crypto.pbkdf2(tempPwd, salt, 100000, 64, 'SHA512', (hashingError, hashingResult) => {
                if (hashingError) {
                    connection.release();
                    callback("Hashing has failed : " + hashingError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Hashing has failed"
                    });
                } else {
                    callback(null, connection, salt, hashingResult.toString('base64'));
                }
            });
        },
        //만약 isPasswordIssue값이 0이면 전송이 됬더라도 비밀번호가 변경이 되지 않은 것이고, 1이면 변경 된 것이다.
        (connection, salt, hashedPwd, callback) => {
            let updateQuery = "update user_combine set pwd=?, salt=? where email=?";

            connection.query(updateQuery, [hashedPwd, salt, req.body.user_email], (queryError, queryResult) => {
                let checkJSONData = { "isPasswordIssue": 0 };

                if (queryError) {
                    connection.release();
                    callback("Query has sentance error : " + queryError);

                    res.status(500).send({
                        status: "Fail",
                        data: checkJSONData,
                        msg: "Query has sentance error"
                    });
                } else {
                    connection.release();
                    callback(null, "Success!, please check your email");
                    checkJSONData.isPasswordIssue = 1;

                    res.status(201).send({
                        status: "Success",
                        data: checkJSONData,
                        msg: "Success!, please check your email"
                    });
                }
            });
        }
    ];

    async.waterfall(tempTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
});

module.exports = router;