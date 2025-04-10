require('dotenv').config();
const axios = require('axios');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const sanitizeHtml = require('sanitize-html'); 
const pool = require('./db');
const bcrypt = require('bcrypt');
const { isNumberObject } = require('util/types');
const { getRandomValues } = require('crypto');
const saltRouds = Number(process.env.HASH_SALT);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3001;

let result = {
    status: null,
    sucess: null,
    message: null,
    others: null
};

async function hashPass(passwd) {
    try {
        const salt = await bcrypt.genSalt(saltRouds);
        const hash = await bcrypt.hash(passwd, salt);
        return hash
    } catch (err) {
        console.error(err);
    }
};

async function verifyPass(passwd, hash) {
    try {
        const match = await bcrypt.compare(passwd, hash);
        return match //true or false
    } catch (err) {
        console.error(err);
        return null
    }
};

async function signUp(UserName, UserPass) {
    try {
        const HashPass = await hashPass(UserPass);
        const { rows } = await pool.query(`
            INSERT INTO magos (UserName, UserPass, Posicao, Jail) VALUES ($1, $2, $3) RETURNING UID
            `, [UserName, HashPass, 3, false]);
        console.log('Mago cadastrado, UID:', rows[0].UID);
    } catch (err) {
        console.error(err);
    };
};

async function signIn(UserName, UserPass) {
    try {
        const { rows } = await pool.query(`
            SELECT UserPass FROM magos WHERE UserName = ($1)
            `, [UserName])
        const match = await verifyPass(rows[0].UserPass, await hashPass(UserPass));
        return match
    } catch (err) {
        console.error(err);
    };
};

async function insertNewItem(playerID, ItemName, Category, Risk, AcessLevel, Power, ItemLore, ItemDescription) {
    try {
        const Data = {
            Lore: ItemLore,
            Description: ItemDescription
        };
        const { rows } = await pool.query(`
            INSERT INTO itens (ItemName, Category, Risk, AcessLevel, Power, Data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID
            `, [ItemName, Category, Risk, AcessLevel, Power, Data])
            .then(console.log(rows[0].ID)
            .then(await pool.query(`UPDATE magos SET LastItemID = ($1) WHERE UID = ($2)`, [rows[0].ID], playerID)
            .then(console.log(`LasItemID do mago de ID ${playerID} foi atualizado.`))));
        
        result.status = 200;
        result.sucess = true;
        result.message = `A inserção foi um sucesso, disponibilize a opção updatePower para o player, ou o poder não será atualizado.`;
        result.others = {
            ItemID: rows[0].ID
        };
        return result

    } catch (err) {
        console.error(err);
    };
};

async function searchItem(ItemID) {

    const { rows } = await pool.query(`
        SELECT ID, ItemName, Category, Risk, AcessLevel, Power, Data FROM itens WHERE ID = ($1)
        `, [ItemID]);
    console.log(rows[0]);

    const categoryMap = {
        0: 'Tomo',
        1: 'Armemento',
        2: 'Relíquia'
    };
    const categoria = categoryMap[rows[0].Category];

    const RiskMap = {
        0: 'Deus',
        1: 'Serafins',
        2: 'Querubins',
        3: 'Tronos',
        4: 'Dominações',
        5: 'Virtudes',
        6: 'Potestades',
        7: 'Principados',
        8: 'Arcanjos',
        9: 'Anjos'
    };
    const Risco = RiskMap[rows[0].Risk];

    const Item = {
        ID: rows[0].ItemID,
        Name: rows[0].ItemName,
        Category: categoria,
        Risk: Risco,
        AcessLevel: rows[0].AcessLevel,
        Power: rows[0].Power,
        Data: rows[0].Data //JSON
    };
    console.log(Item);
    return Item
};

async function searchPlayer(UserName) {
    const { rows } = await pool.query(`
        SELECT UID, UserName, Power, Itens, Posicao, Jail, LastItemID FROM magos WHERE UserName = ($1)
    `, [UserName]);
    console.log('Dados retornados:', rows);

    const PositionMap = {
        0: 'Sacerdote',
        1: 'Supremo',
        2: 'Absoluto',
        3: 'Iniciante'
    }
    const JailMap = {
        true: 'Preso',
        false: 'Livre'
    }
    const Posicao = PositionMap[rows[0].Posicao];
    const Jail = JailMap[rows[0].Jail];
    const Player = {
        UID: rows[0].UID,
        UserName: rows[0].UserName,
        Power: rows[0].Power,
        Itens: rows[0].Itens,
        Posição: Posicao,
        Jail: Jail,
        LastItemID: rows[0].LastItemID
    };
    console.log(Player);
    return Player
};

async function findVaults() {
    try {
        const { rows } = await pool.query(`
            SELECT VaultID FROM cofres
        `);
        return rows
    } catch (err) {
        console.error(err);
    }
};

async function searchVaultContent(VaultID) {
    try {
        const { rows } = await pool.query(`
            SELECT VaultID, ItemID FROM cofres WHERE VaultID = ($1)
        `, [VaultID]);
        return rows
    } catch (err) {
        console.error(err);
    }
};

async function openVault(VaultID, playerID) {
    try {
        const VaultContent = searchVaultContent(VaultID);
        console.log(VaultContent);
        async function getItens(UID) {
            try {
                const { rows } = await pool.query(`
                    SELECT Itens FROM magos WHERE UID = ($1)
                `, [UID]);
                return rows[0].Itens
            } catch (err) {
                console.error(err);
            }
        };
        try {
        const itensFromPlayer = getItens(playerID);
        console.log(`Itens do player de UID ${playerID}: ${itensFromPlayer}`);
        const newItensArray = [...itensFromPlayer, ...VaultContent.map(item => item.ItemID)];
        
        await pool.query(`
            UPDATE magos SET Itens = ($1) WHERE UID = ($2)
        `, [newItensArray, playerID]).then(console.log('Itens adicionados ao player de UID ' + playerID + '. Itens adicionados: ' + newItensArray));
        
        result.status = 200;
        result.sucess = true;
        result.message = `O cofre ${VaultID} foi aberto com sucesso pelo player de ID ${playerID}`;
        result.others = {
            newItensAdded: newItensArray,
            playerId: playerID
        }
        return result
        } catch (err) {
            console.error(err);
            result.status = 500;
            result.sucess = false;
            result.message = err;
            result.others = {};
            return result
        };        
    } catch (err) {
        console.error(err);
        result.status = 500;
        result.sucess = false;
        result.message = err;
        result.others = {};
        return result
    };
};

async function genGuardianSecret(wordInteger) {
    const wordsMap = {
        1: 'Sapientia', //Sabedoria
        2: 'Plenitudo', //Plenitude
        3: 'Passion',   //Paixão
        4: 'Dextrum cornu sum et Bolsonaro suffragium fero', //Sou de direita e voto no Bolsonaro
        5: 'Retine lacrimas et fac L' //Segure suas lágrimas e faça L
    };
    const palavra = wordsMap[wordInteger];

    const segredo = palavra.toLowerCase;
    const segredoCriptografado = a1z26('e', segredo);
    return segredoCriptografado
};

async function updatePower(playerID, powerToInsert) {
    try {
        async function getPower(UID) {
            const { rows } = await pool.query(`
                SELECT Power FROM magos WHERE UID = ($1)
            `, [playerID]);
            return rows[0].Power
        };
        const actualPower = getPower(playerID);
        const newPower = Number(actualPower) + Number(powerToInsert);
        const { rows } = await pool.query(`
            UPDATE magos SET Power = ($1) WHERE UID = ($2)
        `, [newPower, playerID]);
        
    } catch (err) {
        console.error(err)
    }
};

async function tome(Spell) {
    if (Spell[0].name == 'Ego coniecto') { //Significa Adivinharei
        if (Spell[0].target == 'Guardião') {
            return // Vou implementar toda a quest do guardião e dai vou resolver esse feitiço
        } if (isNumberObject(Spell[0].target)) {
            const Target = Spell[0].Target;
            const { Player } = searchPlayer(Target);
            const LastItem = Player[0].LastItemID;
            console.log(`Ultimo item do mago ${Player[0].UserName}`, LastItem);
            return LastItem
        } else {
            console.error('Spell[0].name deve ser "Guardião" ou int (UID do player-alvo)');
        }
    } if (Spell[0].name == 'Aperire') { //Significa Abre-te
        const string = string(Spell[0].target);
        const palavra = a1z26('d', string);
        return palavra
    }; 
};

async function a1z26(method, string) { //method deve ser e ou d (encrypt, decrypt), string deve conter apenas letras ASCII (sem ç ou acentos)
    let plaintext = string.toLowerCase();
    let alphabet = "abcdefghijklmnopqrstuvwxyz";
    let separator = '.';

    if (method === 'e') {
        let encrypted = "";
        for (let j = 0; j < plaintext.length; j++) {
            for (let i = 0; i < alphabet.length; i++) {
                if(alphabet[i] === plaintext[j]) {
                    encrypted += (i + 1).toString() + separator;
                }
            }
        }
        return encrypted.substring(0, encrypted.length - separator.length);
    } if (method === 'd') {
        encrypted = encrypted.toLowerCase();
        let split = encrypted.split(separator);
        let decrypted = "";
        for (let j = 0; j < split.length; j++) {
            for (let i = 0; i < alphabet.length; i++) {
                if((i + 1) == split[j]) {
                    decrypted += alphabet[i];
                }
            }
        }
        return decrypted;
    } else {
        console.error('na função a1z26(method, string), method precisa ser "e" (encrypt), ou "d" (decrypt)');
    };
};

app.get('/api/guardian-quest', async (req, res) => {
    const playerID = req.query.PId;
    const vaultID = req.query.VId;
    const secretSendByPlayer = req.query.SSBPlayer;

    const wordINT = Math.floor(Math.random() * 5) + 1;
    const GuardianSecret = await genGuardianSecret(wordINT);
    if (secretSendByPlayer == a1z26('d', GuardianSecret)) {
        const Player = searchPlayer(playerID);
        await pool.query(`
            UPDATE magos SET Posicao = ($1) WHERE UID = ($2)
        `, [0, playerID]).then(console.log(`O mago de UID ${playerID} acaba de ascender para Sacerdote`));
        const openVaultResult = await openVault(vaultID, playerID);
        res.status(openVaultResult.status).json(openVaultResult)
    } if (!(secretSendByPlayer == a1z26('d', GuardianSecret))) {
        res.status(200).json({
            status: 200,
            message: "Palavra incorreta, verifique e tente novamente!",
            sucess: false
        });
    } else {
        res.status(500).json({
            status: 500,
            message: "Erro interno, verifique a implementação que consome este endpoint.",
            sucess: false
        });
    }


});

app.listen(PORT, () => {
    console.log('Servidor rodando na porta', PORT);
});