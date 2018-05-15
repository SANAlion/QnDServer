const emailHostConfig = require('../config/emailConfig');
const nodemailer = require('nodemailer');
const smtpPool = require('nodemailer-smtp-pool');

module.exports = nodemailer.createTransport(
   smtpPool({
      service:emailHostConfig.naverAuth.service,
      auth:{
         user:emailHostConfig.naverAuth.user,
         pass:emailHostConfig.naverAuth.pass
      },
      maxConnections:5,
      maxMessage:10
   })
);