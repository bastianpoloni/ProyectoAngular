const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

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
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }
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

        if (!transaction.esIngreso && transaction.categoriaNombre) {
            const catSnapshot = await db.collection('usuario').doc(uid)
                .collection('categoria')
                .where('nombre', '==', transaction.categoriaNombre)
                .limit(1)
                .get();
            if (!catSnapshot.empty) {
                const categoria = catSnapshot.docs[0].data();
                const userDoc = await db.collection('usuario').doc(uid).get();
                const usuario = userDoc.data();
                const presupuestoUsuario = usuario.presupuesto || 0;
                const limiteMonto = categoria.limiteMonto !== undefined 
                    ? categoria.limiteMonto 
                    : Math.round(presupuestoUsuario * (categoria.porcentajeLimite / 100));
                
                if (limiteMonto > 0) {
                    const txSnapshot = await db.collection('usuario').doc(uid)
                        .collection('transaccion')
                        .where('categoriaNombre', '==', transaction.categoriaNombre)
                        .get();
                    let totalGastado = 0;
                    txSnapshot.forEach(doc => {
                        const tx = doc.data();
                        if (!tx.esIngreso) {
                            totalGastado += Math.abs(tx.monto);
                        }
                    });
                    const nuevoMonto = Math.abs(transaction.monto);
                    if (totalGastado + nuevoMonto > limiteMonto) {
                        return res.status(400).json({ 
                            message: 'El monto ingresado excede el presupuesto disponible de la categoría.' 
                        });
                    }
                }
            }
        }

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

        const txDoc = await db.collection('usuario').doc(uid).collection('transaccion').doc(id).get();
        if (!txDoc.exists) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
        const existingTx = txDoc.data();

        const esIngreso = updates.esIngreso !== undefined ? updates.esIngreso : existingTx.esIngreso;
        const categoriaNombre = updates.categoriaNombre !== undefined ? updates.categoriaNombre : existingTx.categoriaNombre;
        const monto = updates.monto !== undefined ? updates.monto : existingTx.monto;

        if (!esIngreso && categoriaNombre) {
            const catSnapshot = await db.collection('usuario').doc(uid)
                .collection('categoria')
                .where('nombre', '==', categoriaNombre)
                .limit(1)
                .get();
            if (!catSnapshot.empty) {
                const categoria = catSnapshot.docs[0].data();
                const userDoc = await db.collection('usuario').doc(uid).get();
                const usuario = userDoc.data();
                const presupuestoUsuario = usuario.presupuesto || 0;
                const limiteMonto = categoria.limiteMonto !== undefined 
                    ? categoria.limiteMonto 
                    : Math.round(presupuestoUsuario * (categoria.porcentajeLimite / 100));

                if (limiteMonto > 0) {
                    const txSnapshot = await db.collection('usuario').doc(uid)
                        .collection('transaccion')
                        .where('categoriaNombre', '==', categoriaNombre)
                        .get();
                    let totalGastado = 0;
                    txSnapshot.forEach(doc => {
                        if (doc.id !== id) {
                            const tx = doc.data();
                            if (!tx.esIngreso) {
                                totalGastado += Math.abs(tx.monto);
                            }
                        }
                    });
                    const nuevoMonto = Math.abs(monto);
                    if (totalGastado + nuevoMonto > limiteMonto) {
                        return res.status(400).json({ 
                            message: 'El monto ingresado excede el presupuesto disponible de la categoría.' 
                        });
                    }
                }
            }
        }

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

// ==========================================
// ENDPOINTS BILLETERA COMPARTIDA
// ==========================================

app.get('/usuarios/:uid/shared-wallet-info', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const userDoc = await db.collection('usuario').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const userData = userDoc.data();

        // 1. Check if the user is the owner of a shared wallet
        if (userData.emailBilleteraCompartida) {
            const guestQuery = await db.collection('usuario')
                .where('email', '==', userData.emailBilleteraCompartida)
                .limit(1)
                .get();
            let sharedName = '';
            if (!guestQuery.empty) {
                sharedName = guestQuery.docs[0].data().nombre;
            }
            return res.json({
                hasSharedWallet: true,
                ownerId: uid,
                sharedEmail: userData.emailBilleteraCompartida,
                sharedName: sharedName,
                presupuestoCompartido: userData.presupuestoCompartido || 0
            });
        }

        // 2. Check if another user has shared their wallet with this user
        const userEmail = userData.email;
        const sharedQuery = await db.collection('usuario')
            .where('emailBilleteraCompartida', '==', userEmail)
            .limit(1)
            .get();

        if (!sharedQuery.empty) {
            const ownerDoc = sharedQuery.docs[0];
            const ownerData = ownerDoc.data();
            return res.json({
                hasSharedWallet: true,
                ownerId: ownerDoc.id,
                sharedEmail: ownerData.email,
                sharedName: ownerData.nombre,
                presupuestoCompartido: ownerData.presupuestoCompartido || 0
            });
        }

        // 3. No shared wallet
        res.json({ hasSharedWallet: false });
    } catch (error) {
        res.status(500).send('Error al obtener info de billetera compartida: ' + error.message);
    }
});

app.patch('/usuarios/:uid/shared-wallet-info', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const { emailBilleteraCompartida, presupuestoCompartido } = req.body;
        
        let sharedName = '';
        // Verify if the email to share with actually exists in database
        if (emailBilleteraCompartida) {
            const targetQuery = await db.collection('usuario')
                .where('email', '==', emailBilleteraCompartida)
                .limit(1)
                .get();
            if (targetQuery.empty) {
                return res.status(404).json({ message: 'El correo especificado no está registrado' });
            }
            
            sharedName = targetQuery.docs[0].data().nombre;

            // Prevent sharing with oneself
            const currentUserDoc = await db.collection('usuario').doc(uid).get();
            if (currentUserDoc.data().email === emailBilleteraCompartida) {
                return res.status(400).json({ message: 'No puedes compartir tu billetera contigo mismo' });
            }
        }

        // Update user doc
        const updates = {};
        if (emailBilleteraCompartida !== undefined) updates.emailBilleteraCompartida = emailBilleteraCompartida;
        if (presupuestoCompartido !== undefined) updates.presupuestoCompartido = Number(presupuestoCompartido) || 0;

        await db.collection('usuario').doc(uid).update(updates);
        
        // Return updated info
        res.json({
            hasSharedWallet: !!emailBilleteraCompartida,
            ownerId: uid,
            sharedEmail: emailBilleteraCompartida || null,
            sharedName: sharedName,
            presupuestoCompartido: Number(presupuestoCompartido) || 0
        });
    } catch (error) {
        res.status(500).send('Error al actualizar billetera compartida: ' + error.message);
    }
});

app.get('/usuarios/:uid/categorias-compartidas', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection('usuario').doc(uid).collection('categoriaCompartida').get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        res.json(data);
    } catch (error) {
        res.status(500).send('Error al obtener categorías compartidas: ' + error.message);
    }
});

app.post('/usuarios/:uid/categorias-compartidas', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const category = req.body;
        const newCategoryRef = await db.collection('usuario').doc(uid).collection('categoriaCompartida').add(category);
        const newCategoryDoc = await newCategoryRef.get();
        res.status(201).json({ id: newCategoryRef.id, ...newCategoryDoc.data() });
    } catch (error) {
        res.status(500).send('Error al crear categoría compartida: ' + error.message);
    }
});

app.patch('/usuarios/:uid/categorias-compartidas/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        const updates = req.body;
        await db.collection('usuario').doc(uid).collection('categoriaCompartida').doc(id).update(updates);
        const updatedDoc = await db.collection('usuario').doc(uid).collection('categoriaCompartida').doc(id).get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        res.status(500).send('Error al actualizar categoría compartida: ' + error.message);
    }
});

app.delete('/usuarios/:uid/categorias-compartidas/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        await db.collection('usuario').doc(uid).collection('categoriaCompartida').doc(id).delete();
        res.json({ message: 'Categoría compartida eliminada con éxito' });
    } catch (error) {
        res.status(500).send('Error al eliminar categoría compartida: ' + error.message);
    }
});

app.get('/usuarios/:uid/transacciones-compartidas', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection('usuario').doc(uid).collection('transaccionCompartida')
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
        res.status(500).send('Error al obtener transacciones compartidas: ' + error.message);
    }
});

app.post('/usuarios/:uid/transacciones-compartidas', validarJWT, async (req, res) => {
    try {
        const { uid } = req.params;
        const transaction = req.body;
        const fecha = transaction.fecha ? new Date(transaction.fecha) : new Date();
        const newTransactionRef = await db.collection('usuario').doc(uid).collection('transaccionCompartida').add({
            ...transaction,
            fecha: admin.firestore.Timestamp.fromDate(fecha)
        });
        const newTransactionDoc = await newTransactionRef.get();
        const data = newTransactionDoc.data();
        const dateValue = data?.fecha && data.fecha.toDate ? data.fecha.toDate().toISOString() : data?.fecha;
        res.status(201).json({ id: newTransactionRef.id, ...data, fecha: dateValue });
    } catch (error) {
        res.status(500).send('Error al crear transacción compartida: ' + error.message);
    }
});

app.patch('/usuarios/:uid/transacciones-compartidas/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        const updates = req.body;
        if (updates.fecha) {
            updates.fecha = admin.firestore.Timestamp.fromDate(new Date(updates.fecha));
        }
        await db.collection('usuario').doc(uid).collection('transaccionCompartida').doc(id).update(updates);
        const updatedDoc = await db.collection('usuario').doc(uid).collection('transaccionCompartida').doc(id).get();
        const data = updatedDoc.data();
        const dateValue = data?.fecha && data.fecha.toDate ? data.fecha.toDate().toISOString() : data?.fecha;
        res.json({ id: updatedDoc.id, ...data, fecha: dateValue });
    } catch (error) {
        res.status(500).send('Error al actualizar transacción compartida: ' + error.message);
    }
});

app.delete('/usuarios/:uid/transacciones-compartidas/:id', validarJWT, async (req, res) => {
    try {
        const { uid, id } = req.params;
        await db.collection('usuario').doc(uid).collection('transaccionCompartida').doc(id).delete();
        res.json({ message: 'Transacción compartida eliminada correctamente' });
    } catch (error) {
        res.status(500).send('Error al eliminar transacción compartida: ' + error.message);
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userRef = await db.collection('usuario').add({
            nombre,
            saldo,
            email,
            password: hashedPassword,
            presupuesto,
            ingresoMensual
        });
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
            .limit(1)
            .get();
        if (snapshot.empty) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        const doc = snapshot.docs[0];
        const userData = { id: doc.id, ...doc.data() };
        
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        
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
    let fromEmail = 'no-reply@chanchitoapp.com';

    if (process.env.SENDGRID_API_KEY) {
        transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
        fromEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@chanchitoapp.com';
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        fromEmail = process.env.EMAIL_USER;
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
        from: `"ChanchitoApp Notificaciones" <${fromEmail}>`,
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
