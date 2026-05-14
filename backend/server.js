const express = require('express');
const app = express();
const port = 3000;
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

if (!process.env.FIREBASE_CREDENTIALS_PATH) {
    throw new Error('Falta FIREBASE_CREDENTIALS_PATH en el archivo .env');
}

const cuenta = require(path.resolve(process.env.FIREBASE_CREDENTIALS_PATH));

admin.initializeApp({
    credential: admin.credential.cert(cuenta)
});

const db = admin.firestore();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.listen(port, () => {
    console.log(`Servidor funcionando en el puerto: ${port}`);
});

app.get('/usuarios', async (req, res) => {
    try {
        const coleccionRef = db.collection('usuario');
        const snapshot = await coleccionRef.get();
        const data = [];

        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });

        res.json(data);

    } catch (error) {
        res.status(500).send('Error al conectarse' + error.message);
    }
});

app.get('/usuarios/:uid/categorias', async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection('usuario').doc(uid).collection('categoria').get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        res.json(data);
    } catch (error) {
        res.status(500).send('Error al obtener categorías: ' + error.message);
    }
});

app.get('/usuarios/:uid/transacciones', async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection('usuario').doc(uid).collection('transaccion')
            .orderBy('fecha', 'desc')
            .get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        res.json(data);
    } catch (error) {
        res.status(500).send('Error al obtener transacciones: ' + error.message);
    }
});

app.get('/usuarios/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const doc = await db.collection('usuario').doc(uid).get();
        if (doc.exists) {
            res.json({ id: doc.id, ...doc.data() });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (error) {
        res.status(500).send('Error al obtener usuario: ' + error.message);
    }
});

app.get('/usuarios', async (req, res) => {
  try {
    const snapshot = await db.collection('usuario').get();
    const data = [];
    snapshot.forEach(doc => {
        data.push({id:doc.id, ...doc.data()});
    });

        res.json(data);

    }catch(error){
        res.status(500).send('Error al conectarse' + error.message)
    }
});
