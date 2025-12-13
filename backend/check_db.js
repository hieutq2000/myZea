const mysql = require('mysql2/promise');
async function run() {
    try {
        const con = await mysql.createConnection({ host: 'localhost', user: 'root', password: '' });
        const [rows] = await con.execute('SHOW DATABASES');
        console.log('Databases:', rows.map(r => r.Database));
        con.end();
    } catch (e) { console.error(e); }
}
run();
