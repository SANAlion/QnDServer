const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new aws.S3();
const moment = require('moment');

aws.config.loadFromPath('../config/awsConfig.json');

module.exports = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'sujinnaljin',
		acl: 'public-read',
		key: (req, file, cb) => {
			cb(null, moment().format("YYYYMMDD") + file.originalname.split('.')[0] + '.' + file.originalname.split('.').pop());
		}
	})
});