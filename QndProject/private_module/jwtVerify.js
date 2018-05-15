module.exports.verifyToken = function(token, secret) {
	const jsonWebToken = require('jsonwebtoken');
	
	let returnObject = {data : null};

	jsonWebToken.verify(token, secret, (err, data) => {
	    

	    if (err) {
	        console.log(err); 

	        if (err.message === 'jwt expired') {
	        	console.log('expired token');
	        	returnObject.data = "expired token";
	        } else if (err.message === 'invalid token') {
	        	console.log('invalid token');
	        	returnObject.data = "invalid token";
	        } else {
	        	console.log("JWT fatal error");
	        	returnObject.data = "JWT fatal error";
	        }
	    } else {
	        returnObject.data = data.user_id
	    }
	});

	return returnObject;
}