const express = require('express');
const router = express.Router();
const emailAuthModule = require('../../../private_module/emailAuth');
const cuid = require('cuid');
/*
	Response
	data에 auth코드가 저장됨.
	res.body.data.
*/
router.post('/', (req, res) => {
	const tempPwd = cuid.slug();
	const mailOptions = {
		from:'fantasy_gang@naver.com',
		to:[req.body.input_user_email],
		subject:"[QnD Corporation] 회원가입 인증 메일입니다.",
		text:"인증 코드는 다음과 같습니다.<br><br><br>인증코드 : " + tempPwd,
		html:"인증 코드는 다음과 같습니다.<br><br><br>인증코드 : " + tempPwd
	};

	const authorizationCode = {authorization_code : tempPwd};

	emailAuthModule.sendMail(mailOptions, (sendMailError) => {
		if(sendMailError) {
			emailAuthModule.close();

			res.status(500).send({
				status : "Fail",
				msg : "Fail to sending email"
			});
		} else {
			res.status(200).send({
				status : "Success",
				data : authorizationCode,
				msg : "Successfully send email to user"
			});
		}
	});
})

module.exports = router;