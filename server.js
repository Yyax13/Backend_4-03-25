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
const saltRouds = Number(process.env.HASH_SALT);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3001;

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

async function insertNewItem(ItemName, Category, Risk, AcessLevel, Power, ItemLore, ItemDescription) {
    try {
        const Data = {
            Lore: ItemLore,
            Description: ItemDescription
        };
        const { rows } = await pool.query(`
            INSERT INTO itens (ItemName, Category, Risk, AcessLevel, Power, Data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID
            `, [ItemName, Category, Risk, AcessLevel, Power, Data]);
            console.log(rows[0].ID);
            return {
                sucess: true,
                ID: rows[0].ID
            }
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
    const categoria = categoryMap[rows[0].Category]

    const Item = {
        ID: rows[0].ItemID,
        Name: rows[0].ItemName,
        Category: categoria,
        Risk: rows[0].Risk,
        AcessLevel: rows[0].AcessLevel,
        Power: rows[0].Power,
        Data: rows[0].Data
    };
    return Item
};

async function tome(Spell) {
    if (Spell[0].name == 'Ego coniecto') { //Significa Adivinharei
        if (Spell[0].target == 'Guardião') {
            return // Implementarei assim que criar a mecanica de cofres e guardião
        } if (isNumberObject(Spell[0].target)) {
            return // Vou fazer o Search primeiro
        }
    }
};

app.listen(PORT, () => {
    console.log('Servidor rodando na porta', PORT);
});