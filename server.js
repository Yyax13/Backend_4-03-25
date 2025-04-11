require('dotenv').config();
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const uuidv4 = require('uuid').v4;
const pool = require('./db');
const chance = require('chance').Chance();
const bcrypt = require('bcrypt');
const { isNumberObject } = require('util/types');
const { error } = require('console');
const saltRouds = Number(process.env.HASH_SALT);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3001;
const sessions = {};

function createResult() {
    return {
        status: null,
        success: null,
        message: null,
        others: {}
    };
}

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
    const result = createResult();
    try {
        const HashPass = await hashPass(UserPass);
        const randomNumber = Math.floor(Math.random() * 5) + 1;
        const { rows } = await pool.query(`
            INSERT INTO magos (UserName, UserPass, Posicao, Jail, RandomInt) VALUES ($1, $2, $3, $4, $5) RETURNING UID
            `, [UserName, HashPass, 3, false, randomNumber]);
        console.log('Mago cadastrado, UID:', rows[0].uid);
        result.status = 201;
        result.success = true;
        result.message = `Mago cadastrado, UID: ${rows[0].uid}`;
        return result
    } catch (err) {
        console.error(err);
        result.status = 500;
        result.success = false;
        result.message = `Ocorreu um erro na func signUp (verifique .others)`;
        result.others = {
            error: err
        };
        console.error(result.message + err)
        return result
    };
};

async function signIn(UserName, UserPass) {
    const result = createResult();
    try {
        const { rows } = await pool.query(`
            SELECT UserPass FROM magos WHERE UserName = ($1)
            `, [UserName])
        const match = await verifyPass(UserPass, await hashPass(UserPass));
        if (match) {
            result.status = 200;
            result.success = true;
            result.message = "User sucessfuly loged in";
            return result
        } else if (!match) {
            result.status = 401;
            result.success = false;
            result.message = "Verify credentials";
            return result
        } else {
            result.status = 500;
            result.success = false;
            result.message = "Internal error, try again later";
            return result
        }
    } catch (err) {
        result.status = 500;
        result.success = false;
        result.message = "Internal error, try again later";
        console.error(result.message + err);
        return result
    };
};

async function PutInJail(playerID) {
    const { rows } = await pool.query(`UPDATE magos SET Jail = ($1) WHERE UID = ($2) RETURNING UID, Jail`, [true, playerID]);
    console.log(`O player de UID ${rows[0].uid} está na prisão`)
    console.log(`${rows[0].uid} Jail status: ${rows[0].jail}`)
    return `O player de UID ${rows[0].uid} está na prisão`
}

async function isInJail(playerID) {
    const { rows } = await pool.query(`
        SELECT Jail FROM magos WHERE UID = ($1)
    `, [playerID]);
    const Jailed = {
        state: rows[0].jail
    }
    return Jailed
};

async function insertNewItem(playerID, ItemName, Category, Risk, AcessLevel, Power, ItemLore, ItemDescription) {
    const result = createResult();
    const { rows } = await pool.query(`SELECT Posicao FROM magos WHERE UID = ($1)`, [playerID]);
    console.log('PlayerLevel:', rows[0].posicao);

    if (rows[0].posicao < Risk) {
        await PutInJail(playerID);
        result.status = 401;
        result.success = false;
        result.message = 'Jogador tem nível inferior ao Risco do item, por isso foi preso';
        return result;
    }

    try {
        const Data = {
            Lore: ItemLore,
            Description: ItemDescription
        };

        const { rows: insertedRows } = await pool.query(`
            INSERT INTO itens (ItemName, Category, Risk, AcessLevel, Power, Data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID, Power
        `, [ItemName, Category, Risk, AcessLevel, Power, Data]);

        console.log(insertedRows[0].id);

        const getItens = async (UID) => {
            try {
                const { rows: playerItems } = await pool.query(`
                    SELECT Itens FROM magos WHERE UID = ($1)
                `, [UID]);
                // Verifica se o campo Itens é nulo ou indefinido e inicializa como um array vazio
                return playerItems[0]?.itens || [];
            } catch (err) {
                console.error(err);
                return [];
            }
        };

        const itensFromPlayer = await getItens(playerID);
        console.log(`Itens do player de UID ${playerID}: ${itensFromPlayer}`);

        // Garante que itensFromPlayer seja um array antes de usar o spread operator
        const newItensArray = [...itensFromPlayer, insertedRows[0].id];

        await pool.query(`
            UPDATE magos SET Itens = ($1) WHERE UID = ($2)
        `, [newItensArray, playerID]);

        console.log('Itens adicionados ao player de UID ' + playerID + '. Itens adicionados: ' + newItensArray);

        await pool.query(`UPDATE magos SET LastItemID = ($1) WHERE UID = ($2)`, [insertedRows[0].id, playerID]);
        console.log(`LastItemID do mago de ID ${playerID} foi atualizado.`);

        await updatePower(playerID, insertedRows[0].power);

        result.status = 201;
        result.success = true;
        result.message = `A inserção foi um sucesso, o poder do player e os itens dele já foram atualizados`;
        result.others = {
            ItemID: insertedRows[0].id
        };
        return result;

    } catch (err) {
        console.error(err);
        result.status = 500;
        result.success = false;
        result.message = `Ocorreu um erro na func insertNewItem`;
        result.others = {
            error: err
        };
        return result;
    }
}

async function searchItem(ItemID) {
    const result = createResult();

    const { rows } = await pool.query(`
        SELECT ID, ItemName, Category, Risk, AcessLevel, Power, Data FROM itens WHERE ID = ($1)
        `, [ItemID]);
    console.log(rows[0]);

    const categoryMap = {
        0: 'Tomo',
        1: 'Armemento',
        2: 'Relíquia'
    };
    const categoria = categoryMap[rows[0].category];

    const RiskMap = {
        0: 'Deus',
        1: 'Serafins',
        2: 'Querubins',
        3: 'Tronos'
    };
    const Risco = RiskMap[rows[0].risk];

    const Item = {
        ID: rows[0].itemID,
        Name: rows[0].itemName,
        Category: categoria,
        Risk: Risco,
        AcessLevel: rows[0].acesslevel,
        Power: rows[0].power,
        Data: rows[0].data //JSON
    };
    result.status = 200;
    result.success = true;
    result.message = 'Sucessfuly searched item';
    result.others = Item;
    console.log(Item);
    return result
};

async function searchPlayer(UserName) {
    const result = createResult();
    const { rows } = await pool.query(`
        SELECT UID, UserName, Power, Itens, Posicao, Jail, LastItemID, RandomInt FROM magos WHERE UserName = ($1)
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
    const Posicao = PositionMap[rows[0].posicao];
    const Jail = JailMap[rows[0].jail];
    const Player = {
        UID: rows[0].uid,
        UserName: rows[0].username,
        Power: rows[0].power,
        Itens: rows[0].itens,
        Posição: Posicao,
        Jail: Jail,
        LastItemID: rows[0].lastitemid,
        RandomInt: rows[0].randomint
    };
    result.status = 200;
    result.success = true;
    result.message = "Search sucess";
    result.others = Player;
    console.log(Player);
    return result
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
    const result = createResult();
    try {
        const VaultContent = searchVaultContent(VaultID);
        console.log(VaultContent);
        async function getItens(UID) {
            try {
                const { rows } = await pool.query(`
                    SELECT Itens FROM magos WHERE UID = ($1)
                `, [UID]);
                return rows[0].itens
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
        result.success = true;
        result.message = `O cofre ${VaultID} foi aberto com sucesso pelo player de ID ${playerID}`;
        result.others = {
            newItensAdded: newItensArray,
            playerId: playerID
        }
        return result
        } catch (err) {
            console.error(err);
            result.status = 500;
            result.success = false;
            result.message = 'Error during openVault';
            result.others = {
                error: err
            };
            console.log(result.message + err);
            return result
        };        
    } catch (err) {
        console.error(err);
        result.status = 500;
        result.success = false;
        result.message = 'Error during openVault';
        result.others = {
            error: err
        };
        console.log(result.message + err);
        return result
    };
};

async function genGuardianSecret(playerID) {
    const wordsMap = {
        1: 'Sapientia', //Sabedoria
        2: 'Plenitudo', //Plenitude
        3: 'Passion',   //Paixão
        4: 'Dextrum cornu sum et Bolsonaro suffragium fero', //Sou de direita e voto no Bolsonaro
        5: 'Retine lacrimas et fac L' //Segure suas lágrimas e faça L
    };
    const { rows } = await pool.query(`
        SELECT RandomInt FROM magos WHERE UID = ($1)
    `, [playerID])
    const palavra = wordsMap[rows[0].randomint];

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
            return rows[0].power
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

async function levelUp(playerId) {
    const result = createResult();
    try {
        const {rows: levelBefore} = await pool.query(`SELECT Posicao FROM magos WHERE UID = ($1)`, [playerId]);
        if (levelBefore == 0) {
            result.status = 409; // Conflict
            result.success = null;
            result.message = 'O Player já está no nível máximo';
            return result
        } else if (levelBefore > 0) {
            const levelAfter = levelBefore - 1;
            await pool.query(`UPDATE magos SET Posicao = ($1) WHERE UID = ($2)`, [levelAfter, playerId]);
            result.status = 201;
            result.success = true;
            result.message = `O jogador ${playerId} saiu do nível ${levelBefore} para o nível ${levelAfter}`;
            return result
        } else {
            result.status = 500;
            result.success = false;
            result.message = 'Erro interno, levelUP'
            return result
        }
    } catch (err) {
        result.status = 500;
        result.success = false;
        result.message = 'Erro interno, levelUP'
        result.others = {
            error: err
        };
        console.error(result.message + err);
        return result
    }
};

async function tome(Spell) {
    const result = createResult();
    /* Spell = {
        name = 'NOME DO FEITIÇO',
        target = UID de um player ou 'Guardian',
        caller = UID do player que chamou
    }*/
    if (Spell.name == 'Ego coniecto') { //Significa Adivinharei
        if (Spell.target == 'Guardian') {
            const player = Spell.caller;
            const secret = genGuardianSecret(player);
            levelUp(Spell.caller);
            result.status = 200;
            result.success = true;
            result.message = 'Sucessfully Ego coniecto';
            result.others = {
                secret: secret
            };
            return result
        } else if (isNumberObject(Spell.target)) {
            const Target = Spell.Target;
            const { Player } = searchPlayer(Target);
            const LastItem = Player[0].lastitemid;
            levelUp(Spell.caller);
            console.log(`Ultimo item do mago ${Player[0].username} é: ` + LastItem);
            result.status = 200;
            result.success = true;
            result.message = (`Ultimo item do mago ${Player[0].username} é: ` + LastItem);
            result.others = {
                LastItem: LastItem
            };
            return result
        } else {
            result.status = 400;
            result.success = false;
            result.message = 'Spell.target deve ser "Guardian" ou int (UID do player-alvo)';
            console.error('Spell.target deve ser "Guardian" ou int (UID do player-alvo)');
            return result
        }
    } else if (Spell.name == 'Aperire') { //Significa Abre-te
        const string = string(Spell.target);
        const palavra = a1z26('d', string);
        levelUp(Spell.caller);
        result.status = 200;
        result.success = true;
        result.message = 'Palavra decriptada com sucesso';
        result.others = {
            word: palavra
        }
        return palavra
    } else {
        result.status = 0;
        result.success = false;
        result.message = 'O Spell.name deve ser válido (Aperire ou Ego coniecto)';
        console.log(result.message);
        return result
    };
};

async function a1z26(method, string) { 
    // method deve ser 'e' (encrypt) ou 'd' (decrypt), string deve conter apenas letras ASCII (sem ç ou acentos)
    if (typeof string !== 'string') {
        throw new TypeError('O parâmetro "string" deve ser uma string válida.');
    }

    let plaintext = string.toLowerCase();
    let alphabet = "abcdefghijklmnopqrstuvwxyz";
    let separator = '.';

    if (method === 'e') {
        let encrypted = "";
        for (let j = 0; j < plaintext.length; j++) {
            for (let i = 0; i < alphabet.length; i++) {
                if (alphabet[i] === plaintext[j]) {
                    encrypted += (i + 1).toString() + separator;
                }
            }
        }
        return encrypted.substring(0, encrypted.length - separator.length);
    } else if (method === 'd') {
        let split = string.split(separator);
        let decrypted = "";
        for (let j = 0; j < split.length; j++) {
            for (let i = 0; i < alphabet.length; i++) {
                if ((i + 1) == split[j]) {
                    decrypted += alphabet[i];
                }
            }
        }
        return decrypted;
    } else {
        throw new Error('O parâmetro "method" deve ser "e" (encrypt) ou "d" (decrypt).');
    }
};

async function banPlayer(playerID) {
    const result = createResult();
    try {
        const { rows: playerItems } = await pool.query(`
            SELECT Itens FROM magos WHERE UID = ($1)
        `, [playerID]);

        if (playerItems.length > 0 && playerItems[0].itens.length > 0) {
            const items = playerItems[0].itens;

            const { rows: vault } = await pool.query(`
                INSERT INTO cofres (ItemID) VALUES ($1) RETURNING VaultID
            `, [items]);

            console.log(`Itens do jogador ${playerID} foram colocados no cofre ${vault[0].vaultid}`);
        } else {
            console.log(`Jogador ${playerID} não possui itens para colocar em um cofre.`);
        }

        const { rows } = await pool.query(`
            DELETE FROM magos WHERE UID = ($1) RETURNING UserName
        `, [playerID]);

        if (rows.length > 0) {
            result.status = 200;
            result.success = true;
            result.message = `O jogador ${rows[0].username} foi banido com sucesso.`;
        } else {
            result.status = 404;
            result.success = false;
            result.message = `Jogador com UID ${playerID} não encontrado.`;
        }
        return result;
    } catch (err) {
        console.error(err);
        result.status = 500;
        result.success = false;
        result.message = 'Erro interno ao tentar banir o jogador.';
        result.others = { error: err };
        return result;
    }
};

async function stealItem(itemID, callerID, targetPlayerID) {
    const result = createResult();
    const stealSucess = chance.bool({likelihood: 60});
    if (!stealSucess) {
        banPlayer(callerID);
        result.status = 403;
        result.success = stealSucess;
        result.message = 'O roubo falhou, você foi banido';
        return result
    }
    const {rows: targetItemArray} = await pool.query(`
        SELECT Itens FROM magos WHERE UID = ($1)
    `, [targetPlayerID]);
    const targetItemArray_stealed = targetItemArray.filter(item => item !== itemID);
    await pool.query(`
        UPDATE magos SET itens = ($1) WHERE UID = ($2)
    `, [targetItemArray_stealed, targetPlayerID]);
    const {rows: callerItemArray} = await pool.query(`
        SELECT itens FROM magos WHERE UID = ($1)
    `, [callerID]);
    const callerItemArray_increasedBySteal = [...callerItemArray, itemID];
    await pool.query(`
        UPDATE magos SET itens = ($1) WHERE UID = ($2)
    `, [callerItemArray_increasedBySteal, callerID]);

    result.status = 0;
    result.success = stealSucess;
    result.message = 'O item foi furtado com sucesso';
    return result
};

app.post('/api/sign-up', async (req, res) => {
    const userNameToInsert = req.body.username;
    const userPassToInsert = req.body.userpass;

    const signUpCall = await signUp(userNameToInsert, userPassToInsert);
    res.status(signUpCall.status).json(signUpCall);
});

app.post('/api/sign-in', async (req, res) => {
    const result = createResult();
    const {uName, uPass} = req.body;

    const playerInfo = (await searchPlayer(uName));
    const Jail = isInJail(playerInfo.others.UID);
    if (!Jail.state) {
        const signInCall = await signIn(uName, uPass);
        const sessionId = uuidv4();
        sessions[sessionId] = { userId: playerInfo.others.UID, userName: uName };
        res.set('Set-Cookie', `session=${sessionId}`);
        res.status(signInCall.status).json(signInCall);
    } else if (Jail.state) {
        result.status = 401;
        result.success = false;
        result.message = "User is in Jail";
        res.status(result.status).json(result);
    }
});

app.get('/api/search-player', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const userName = req.query.uname;
    const callerLevel = req.query.cl;

    if (callerLevel == 1 || callerLevel == 0) {
        const searchPlayerCall = await searchPlayer(userName);
        res.status(searchPlayerCall.status).json(searchPlayerCall.others);
    } else {
        res.status(401).json({message: 'User havent level for that'});
    }
});

app.post('/api/insert-item', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const {playerID, ItemName, Category, Risk, AcessLevel, Power, ItemLore, ItemDescription} = req.body;

    const insertItemCall = await insertNewItem(playerID, ItemName, Category, Risk, AcessLevel, Power, ItemLore, ItemDescription)
    res.status(insertItemCall.status).json(insertItemCall);
});

app.get('/api/search-item', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const itemID = req.query.iid;

    const searchItemCall = await searchItem(itemID);
    res.status(searchItemCall.status).json(searchItemCall.others);
});

app.post('/api/tomo', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const {spellName, spellTarget, spellCaller} = req.body;

    const Spell = {
        name: spellName,
        target: spellTarget,
        caller: spellCaller
    };
    const callTome = await tome(Spell);

});

app.get('/api/guardian-quest', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const result = createResult();
    const playerID = req.query.PId;
    const vaultID = req.query.VId;
    const secretSendByPlayer = req.query.SSBPlayer;

    const GuardianSecret = await genGuardianSecret(playerID);
    if (secretSendByPlayer == a1z26('d', GuardianSecret)) {
        const Player = await searchPlayer(playerID);
        await pool.query(`
            UPDATE magos SET Posicao = ($1) WHERE UID = ($2)
        `, [0, Player[0].UID]).then(console.log(`O mago de UID ${Player[0].UID} acaba de ascender para Sacerdote`));
        const openVaultResult = await openVault(vaultID, Player[0].UID);
        res.status(openVaultResult.status).json(openVaultResult)
    } else if (!(secretSendByPlayer == a1z26('d', GuardianSecret))) {
        result.status = 401;
        result.success = false;
        result.message = 'Palavra incorreta, verifique e tente novamente!';
        res.status(result.status).json(result);
    } else {
        result.status = 500;
        result.success = false;
        result.message = "Erro interno, verifique a implementação que consome este endpoint.";
        res.status(result.status).json(result);
    }


});

app.get('/api/find-vaults', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }
    const howMany = Number(req.query.n);
    const vaults = await findVaults();
    let vaultsForReturn = [];
    for (let i = 0; i < howMany - 1; i++) {
        if (vaultsForReturn.length == howMany) {
            break
        } else {
            vaultsForReturn = [...vaults[i]];
        }
    }
    result.status = 200;
    result.success = true;
    result.message = "A seguir, os VIDs requisitados";
    result.others = vaultsForReturn;
    res.status(result.status).json(result);
});

app.post('/api/steal-item', async (req, res) => {
    const sessionId = req.headers.cookie?.split('=')[1];
    const userSession = sessions[sessionId];
    if (!userSession) {
        res.status(401).json({message: 'User do not have authorization to use this, check if he signed In'});
    }

    const {targetID, callerID, itemID} =  req.body;
    const stealItemCall = await stealItem(itemID, callerID, targetID);
    res.status(stealItemCall.status).json(stealItemCall);
});

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});
