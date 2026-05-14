# ChanchitoApp

ChanchitoApp es una billetera digital para llevar seguimiento de gastos sobre presupuesto. El proyecto está dividido en un backend con Express/Firebase y un frontend en Angular 21.

## Requisitos

- Node.js instalado
- npm disponible en la terminal

## Estructura

- `backend/`: API con Express y Firebase Admin
- `frontend/`: aplicación Angular

## Ejecutar el backend

1. Abre una terminal en la carpeta `backend`.
2. Instala dependencias si todavía no lo hiciste:

```bash
npm install
```

3. Inicia el servidor:

```bash
npm start
```

El backend usa `nodemon` y por defecto levanta la API con `server.js`.

## Ejecutar el frontend

1. Abre otra terminal en la carpeta `frontend`.
2. Instala dependencias si todavía no lo hiciste:

```bash
npm install
```

3. Inicia Angular abriendo el navegador automáticamente:

```bash
ng serve -o
```

La app queda disponible en `http://localhost:4200/`.

Autores: 
Bastián Poloni | Joaquin Contreras