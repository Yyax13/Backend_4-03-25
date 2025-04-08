require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGSQL_HOST,
    port: process.env.PG_PORT,
    user: process.env.PGSQL_USER,
    password: process.env.PGSQL_PASS,
    database: process.env.PGSQL_DB_DESAFIOS_BACK_04_04_25,
    max: 10,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
    idleTimeoutMillis: 30000
});

async function testConnection() {
    let client;
    try {
        client = await pool.connect().then(console.log('CONEXÃO BEM SUCEDIDA'));
    } catch(err) {
        console.error("CONEXÃO MAL SUCEDIDA", err.stack || err);
        console.log(err.code)
    } finally {
        if (client) client.release();
    }
}

async function setupTables() {
    try {
        /* Posição => 
            0: Sacerdote,
            1: Supremo,
            2: Absolute,
            3: Iniciante
        */
        await pool.query(`
            CREATE TABLE IF NOT EXISTS magos (
            UID SERIAL UNIQUE,
            UserName varchar(255),
            UserPass varchar(255),
            Power INT,
            Itens INT[],
            Posicao INT,
            Jail BOOLEAN,
            LastItemID INT
            )
            `).then(console.log('Tabela magos criada/já existe'));

            /* Categoria => 
                0: Tomo,
                1: Armamento,
                2: Relíquia

               Risco =>
                0: Deus,
                1: Serafins,
                2: Querubins,
                3: Tronos,
                4: Dominações,
                5: Virtudes,
                6: Potestades,
                7: Principados,
                8: Arcanjos,
                9: Anjos
            */

        await pool.query(`
            CREATE TABLE IF NOT EXISTS itens (
            ID SERIAL UNIQUE,
            ItemName varchar(255),
            Category INT,
            Risk INT,
            AcessLevel INT,
            Power INT,
            Data JSONB
            )
        `).then(console.log('Tabela itens criada/já existe'));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cofres (
            VaultID SERIAL UNIQUE,
            ItemID INT[])
        `).then(console.log('Tabela cofres criada/já existe'));
    } catch (err) {
        console.error(err);
    }
};

setupTables()
testConnection()

module.exports= pool;