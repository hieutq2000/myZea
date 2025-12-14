require('dotenv').config();

console.log('DB Config:', {
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    USER: process.env.DB_USER,
    // PASSWORD: process.env.DB_PASSWORD, // Don't print full password for security, just length
    PASSWORD_LEN: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0,
    DB_NAME: process.env.DB_NAME
});
