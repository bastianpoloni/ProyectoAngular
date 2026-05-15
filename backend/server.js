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
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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
        const snapshot = await db.collection('usuario').get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        res.json(data);
    } catch (error) {
        res.status(500).send('Error al conectarse' + error.message);
    }
});

app.get('/usuarios/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const doc = await db.collection('usuario').doc(uid).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).send('Error al obtener usuario: ' + error.message);
    }
});

app.patch('/usuarios/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;
        await db.collection('usuario').doc(uid).update(updates);
        const updatedDoc = await db.collection('usuario').doc(uid).get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        res.status(500).send('Error al actualizar usuario: ' + error.message);
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
            const item = doc.data();
            const fecha = item.fecha && item.fecha.toDate ? item.fecha.toDate().toISOString() : item.fecha;
            data.push({ id: doc.id, ...item, fecha });
        });
        res.json(data);
    } catch (error) {
        res.status(500).send('Error al obtener transacciones: ' + error.message);
    }
});

app.post('/usuarios/:uid/categorias', async (req, res) => {
    try {
        const { uid } = req.params;
        const category = req.body;
        const newCategoryRef = await db.collection('usuario').doc(uid).collection('categoria').add(category);
        const newCategoryDoc = await newCategoryRef.get();
        res.status(201).json({ id: newCategoryRef.id, ...newCategoryDoc.data() });
    } catch (error) {
        res.status(500).send('Error al crear categoría: ' + error.message);
    }
});

app.post('/usuarios/:uid/transacciones', async (req, res) => {
    try {
        const { uid } = req.params;
        const transaction = req.body;
        const fecha = transaction.fecha ? new Date(transaction.fecha) : new Date();
        const newTransactionRef = await db.collection('usuario').doc(uid).collection('transaccion').add({
            ...transaction,
            fecha: admin.firestore.Timestamp.fromDate(fecha)
        });
        const newTransactionDoc = await newTransactionRef.get();
        const data = newTransactionDoc.data();
        const dateValue = data?.fecha && data.fecha.toDate ? data.fecha.toDate().toISOString() : data?.fecha;
        res.status(201).json({ id: newTransactionRef.id, ...data, fecha: dateValue });
    } catch (error) {
        res.status(500).send('Error al crear transacción: ' + error.message);
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { nombre, saldo = 0, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ message: 'nombre, email y password son requeridos' });
        }
        const usersSnapshot = await db.collection('usuario').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }
        const userRef = await db.collection('usuario').add({ nombre, saldo, email, password });
        const userDoc = await userRef.get();
        res.status(201).json({ id: userRef.id, ...userDoc.data() });
    } catch (error) {
        res.status(500).send('Error al registrar usuario: ' + error.message);
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email y password son requeridos' });
        }
        const snapshot = await db.collection('usuario')
            .where('email', '==', email)
            .where('password', '==', password)
            .limit(1)
            .get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Usuario o contraseña incorrectos' });
        }
        const doc = snapshot.docs[0];
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).send('Error al iniciar sesión: ' + error.message);
    }
});
