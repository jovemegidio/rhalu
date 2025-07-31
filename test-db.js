// test-db.js
const mysql = require('mysql2/promise');

// COLOQUE AQUI AS MESMAS CREDENCIAIS DO SEU server.js
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'rh_portal',
    port: 3306
};

async function testConnection() {
    try {
        console.log('A tentar conectar à base de dados...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexão bem-sucedida!');

        console.log('A tentar consultar a tabela "funcionarios"...');
        const [rows] = await connection.execute('SELECT * FROM funcionarios LIMIT 1;');
        console.log('✅ Consulta bem-sucedida! Encontrado pelo menos um funcionário.');

        await connection.end();
        console.log('👋 Conexão fechada.');

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error('--- Verifique as suas credenciais e se o servidor MySQL está a correr! ---');
    }
}

testConnection();