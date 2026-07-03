const express = require('express');
const app = express();
const port = 3000;
const admin = require('firebase-admin');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
