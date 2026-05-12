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

const db= admin.firestore();

app.use(express.json());

app.listen(port, ()=>{
    console.log(`Servidor funcionando en el puerto: ${port}`);
});

app.get('/usuarios', async (req, res)=>{
    try{
        const coleccionRef = db.collection('usuario');
        const snapshot = await coleccionRef.get();
        const data = [];

        snapshot.forEach(doc => {
            data.push({id:doc.id, ...doc.data()});
        });

        res.json(data);

    }catch(error){
        res.status(500).send('Error al conectarse' + error.message)
    }
});
