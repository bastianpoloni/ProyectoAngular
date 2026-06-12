const express = require('express');
const app = express();
const port = 3000;
const admin = require('firebase-admin');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto_del_chanchito_123';

const validarJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Formato de token inválido' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
};

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.listen(port, () => {
    console.log(`Servidor funcionando en el puerto: ${port}`);
});

app.get('/usuarios', validarJWT, async (req, res) => {
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

app.get('/usuarios/:uid', validarJWT, async (req, res) => {
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

app.patch('/usuarios/:uid', validarJWT, async (req, res) => {
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

app.get('/usuarios/:uid/categorias', validarJWT, async (req, res) => {
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

app.get('/usuarios/:uid/transacciones', validarJWT, async (req, res) => {
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

app.post('/usuarios/:uid/categorias', validarJWT, async (req, res) => {
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

app.patch('/usuarios/:uid/categorias/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        const updates = req.body;
        await db.collection('usuario').doc(uid).collection('categoria').doc(id).update(updates);
        const updatedDoc = await db.collection('usuario').doc(uid).collection('categoria').doc(id).get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        res.status(500).send('Error al actualizar categoría: ' + error.message);
    }
});

app.delete('/usuarios/:uid/categorias/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        await db.collection('usuario').doc(uid).collection('categoria').doc(id).delete();
        res.json({ message: 'Categoría eliminada con éxito' });
    } catch (error) {
        res.status(500).send('Error al eliminar categoría: ' + error.message);
    }
});

app.post('/usuarios/:uid/transacciones', validarJWT, async (req, res) => {
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

app.patch('/usuarios/:uid/transacciones/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        const updates = req.body;
        if (updates.fecha) {
            updates.fecha = admin.firestore.Timestamp.fromDate(new Date(updates.fecha));
        }
        await db.collection('usuario').doc(uid).collection('transaccion').doc(id).update(updates);
        const updatedDoc = await db.collection('usuario').doc(uid).collection('transaccion').doc(id).get();
        const data = updatedDoc.data();
        const dateValue = data?.fecha && data.fecha.toDate ? data.fecha.toDate().toISOString() : data?.fecha;
        res.json({ id: updatedDoc.id, ...data, fecha: dateValue });
    } catch (error) {
        res.status(500).send('Error al actualizar transacción: ' + error.message);
    }
});

app.delete('/usuarios/:uid/transacciones/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        await db.collection('usuario').doc(uid).collection('transaccion').doc(id).delete();
        res.json({ message: 'Transacción eliminada correctamente' });
    } catch (error) {
        res.status(500).send('Error al eliminar transacción: ' + error.message);
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { nombre, saldo = 0, email, password, presupuesto = 0, ingresoMensual = 0 } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ message: 'nombre, email y password son requeridos' });
        }
        const usersSnapshot = await db.collection('usuario').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }
        const userRef = await db.collection('usuario').add({ nombre, saldo, email, password, presupuesto, ingresoMensual });
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
        const userData = { id: doc.id, ...doc.data() };
        const token = jwt.sign(
            { id: userData.id, email: userData.email, nombre: userData.nombre },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token, usuario: userData });
    } catch (error) {
        res.status(500).send('Error al iniciar sesión: ' + error.message);
    }
});
