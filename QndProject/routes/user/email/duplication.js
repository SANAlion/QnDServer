const express = require('express');
const router = express.Router();
const async = require('async');

const pool = require('../../../private_module/dbPool');

router.post('/', (req, res) => {
    let duplicationTaskArray = [
        (callback) => {
            pool.getConnection((connectingError, connectingResult) => {
                if (connectingError) {
                    callback(connectingError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "DB connection has failed : " + connectingError
                    });
                } else {
                    callback(null, connectingResult);
                }
            });
        },
        (connection, callback) => {
            let selectQuery = "select email from user_combine where email=?";

            connection.query(selectQuery, [req.body.input_user_email], (queryError, queryResult) => {
                if (queryError) {
                    callback("Query has sentance error : " + queryError);

                    res.status(500).send({
                        status: "Fail",
                        msg: "Query has sentance error"
                    });
                } else {
                    //query가 제대로 작동했을 경우, data가 존재하는지, 존재하지 않는지 확인해준다.
                    if (queryResult[0] === undefined) {
                        connection.release();
                        responseMessage = "Not duplicated";
                        // 해당하는 유저의 data가 존재하지 않을 경우 1을 response해주어서 가입이 가능하단 것을
                        response = { response_code: 1 };

                        res.status(201).send({
                            status: "Success",
                            data: response,
                            msg: "해당 아이디는 가입 가능합니다."
                        });
                    } else {
                        connection.release();
                        responseMessage = "Duplicated";

                        response = {response_code : 0};
                        
                        res.status(201).send({
                            status : "SUccess",
                            data : response,
                            msg : "해당 아이디는 가입 되어있습니다."
                        });
                    }
                }
            });
        }
    ];

    async.waterfall(duplicationTaskArray, (asyncError, asyncResult) => {
        if (asyncError) console.log("Async has error : " + asyncError);
        else console.log("Async has success : " + asyncResult);
    });
})

module.exports = router;