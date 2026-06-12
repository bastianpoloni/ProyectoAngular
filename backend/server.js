const express = require('express');
const app = express();
const port = 3000;
const admin = require('firebase-admin');
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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
        
        if (transaction.categoriaNombre) {
            verificarLimiteCategoria(uid, transaction.categoriaNombre);
        }

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

        if (data && data.categoriaNombre) {
            verificarLimiteCategoria(uid, data.categoriaNombre);
        }

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

// Funciones de notificacion de presupuesto
async function enviarCorreoAlerta(emailUsuario, nombreUsuario, categoriaNombre, porcentaje, gastado, limite) {
    let transporter;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        console.log('No se detectaron variables de entorno para correo. Generando cuenta de pruebas temporal en Ethereal...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        } catch (err) {
            console.error('Error al crear cuenta de correo de prueba en Ethereal:', err);
            return;
        }
    }

    const mailOptions = {
        from: '"ChanchitoApp Notificaciones" <no-reply@chanchitoapp.com>',
        to: emailUsuario,
        subject: `Alerta de Presupuesto: ${categoriaNombre} al ${porcentaje}%`,
        text: `Hola ${nombreUsuario}, tu categoria ${categoriaNombre} ha alcanzado un ${porcentaje}% de su limite.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #d97706;">Hola, ${nombreUsuario}</h2>
                <p>Te notificamos que tu categoria de gasto <strong>${categoriaNombre}</strong> ha alcanzado un <strong>${porcentaje}%</strong> de su limite presupuestado para este mes.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Limite establecido:</strong> $${limite.toLocaleString('es-CL')}</li>
                    <li><strong>Monto gastado actual:</strong> $${gastado.toLocaleString('es-CL')}</li>
                </ul>
                <p>Te sugerimos revisar tus gastos en la aplicacion para mantener tus finanzas bajo control.</p>
                <br>
                <p style="font-size: 0.8rem; color: #777;">Este es un correo automatico de ChanchitoApp.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo de alerta enviado a ${emailUsuario} para la categoria ${categoriaNombre}`);
        if (!process.env.EMAIL_USER) {
            console.log('--- ENLACE PARA PREVISUALIZAR EL CORREO ENVIADO (ETHEREAL) ---');
            console.log(nodemailer.getTestMessageUrl(info));
            console.log('--------------------------------------------------------------');
        }
    } catch (error) {
        console.error('Error al enviar el correo de notificacion:', error);
    }
}

async function verificarLimiteCategoria(uid, categoriaNombre) {
    try {
        const userDoc = await db.collection('usuario').doc(uid).get();
        if (!userDoc.exists) return;
        const usuario = userDoc.data();

        if (usuario.notificaciones === false) {
            console.log(`Notificaciones desactivadas para el usuario ${usuario.nombre}`);
            return;
        }

        const catSnapshot = await db.collection('usuario').doc(uid)
            .collection('categoria')
            .where('nombre', '==', categoriaNombre)
            .limit(1)
            .get();

        if (catSnapshot.empty) return;
        const categoria = catSnapshot.docs[0].data();

        if (categoria.esIngreso) return;

        const presupuestoUsuario = usuario.presupuesto || 0;
        const limiteMonto = categoria.limiteMonto !== undefined 
            ? categoria.limiteMonto 
            : Math.round(presupuestoUsuario * (categoria.porcentajeLimite / 100));

        if (limiteMonto <= 0) return;

        const txSnapshot = await db.collection('usuario').doc(uid)
            .collection('transaccion')
            .where('categoriaNombre', '==', categoriaNombre)
            .get();

        let totalGastado = 0;
        txSnapshot.forEach(doc => {
            const tx = doc.data();
            if (!tx.esIngreso) {
                totalGastado += Math.abs(tx.monto);
            }
        });

        const porcentajeUsado = Math.round((totalGastado / limiteMonto) * 100);

        if (porcentajeUsado >= 80) {
            await enviarCorreoAlerta(
                usuario.email,
                usuario.nombre,
                categoriaNombre,
                porcentajeUsado,
                totalGastado,
                limiteMonto
            );
        }
    } catch (error) {
        console.error('Error al verificar el limite de la categoria:', error);
    }
}
