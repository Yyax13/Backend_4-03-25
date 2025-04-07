require('dotenv').config();
const axios = require('axios');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const sanitizeHtml = require('sanitize-html'); 
const pool = require('./db');
const bcrypt = require('bcrypt');
const { error } = require('console');
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
    }
};

async function signUp(UserName, UserPass) {
    try {
        const HashPass = await hashPass(UserPass);
        const { rows } = await pool.query(`
            INSERT INTO magos (UserName, UserPass) VALUES ($1, $2) RETURNING UID
            `, [UserName, HashPass]);
        console.log('Mago cadastrado, UID:', rows[0].UID);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};