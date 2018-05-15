const mysql = require('mysql');
const dbConfig = require('../config/dbConfig.json');

const dbSetting = {
	host : dbConfig.host,
	port : dbConfig.port,
	user : dbConfig.user, 
	password : dbConfig.password,
	database : dbConfig.database,
	connectionLimit : dbConfig.connectionLimit
};

module.exports = mysql.createPool(dbSetting);