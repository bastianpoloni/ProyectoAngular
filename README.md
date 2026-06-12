# ChanchitoApp - Billetera Digital

ChanchitoApp es una billetera digital interactiva desarrollada para la gestión inteligente de finanzas personales, presupuestos por categorías y flujo de transacciones.

El proyecto está diseñado bajo una arquitectura limpia y modular de **Angular Standalone (Frontend)** y una API REST construida con **Express, Node.js y Firestore (Backend)**.

---

## 🚀 Requisitos Previos

- **Node.js** (versión LTS recomendada)
- **npm** (gestor de paquetes)
- Una cuenta en **Firebase Console** (para configurar la base de datos Firestore)

---

## 📁 Estructura del Proyecto

- `backend/`: API REST que expone endpoints seguros de usuarios, categorías, transacciones y autenticación por JWT.
- `frontend/`: Aplicación cliente en Angular 18+ que utiliza servicios independientes descentralizados por feature y signals para la reactividad.

---

## 🔧 Configuración del Backend

### 1. Variables de Entorno (.env)
Dentro de la carpeta `backend/`, crea un archivo llamado `.env` con el siguiente contenido:

```env
FIREBASE_CREDENTIALS_PATH=./nombre-de-tu-archivo-firebase.json
JWT_SECRET=supersecreto_del_chanchito_123
```

### 2. Credenciales de Firebase (Base de Datos)
Para conectar el backend con la base de datos de Firebase:
1. Ve a **Firebase Console** > **Configuración del Proyecto** > **Cuentas de Servicio**.
2. Haz clic en **Generar nueva clave privada**. Esto descargará un archivo `.json`.
3. Guarda ese archivo dentro de la carpeta `backend/` y asegúrate de que su nombre coincida exactamente con el valor definido en `FIREBASE_CREDENTIALS_PATH` dentro de tu `.env`.

### 3. Iniciar el Backend
Desde la terminal, navega a la carpeta `backend` y ejecuta:

```bash
cd backend
npm install
npm start
```
*El backend se levantará usando `nodemon` en el puerto `3000` (`http://localhost:3000`).*

---

## 💻 Configuración del Frontend

### 1. Iniciar el Frontend
En otra ventana de la terminal, navega a la carpeta `frontend` y ejecuta:

```bash
cd frontend
npm install
npm start
```
*Esto iniciará el servidor de desarrollo de Angular y abrirá la aplicación en tu navegador en `http://localhost:4200/`.*

---

## 🔑 Autenticación y Cuentas de Prueba

La aplicación cuenta con seguridad **JWT (JSON Web Tokens)**. Todas las peticiones al backend (a excepción de Login y Registro) requieren un token de portador (`Bearer Token`) válido enviado automáticamente por el interceptor del frontend.

### Credenciales Base de Prueba
Para iniciar sesión inmediatamente en la plataforma, puedes usar el usuario de pruebas pre-registrado en la base de datos:
- **Correo:** `user@test.com`
- **Contraseña:** `password123`

### ¿Cómo registrar un usuario nuevo?
Para registrar un usuario personalizado, realiza una petición `POST` al endpoint `/auth/register` usando cualquiera de los siguientes métodos:

#### Opción A: Desde PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -ContentType "application/json" -Body '{"nombre":"Tu Nombre","email":"correo@ejemplo.com","password":"password123","saldo":100000,"presupuesto":200000,"ingresoMensual":350000}'
```

#### Opción B: Desde cURL (Clásico CMD / Git Bash)
```bash
curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Tu Nombre","email":"correo@ejemplo.com","password":"password123","saldo":100000,"presupuesto":200000,"ingresoMensual":350000}'
```

---

## 🛠️ Tecnologías y Arquitectura Utilizadas

- **Servicios Descentralizados (Frontend):** Cada módulo/pantalla posee su propio servicio independiente (`Ajustes`, `Categorias`, `Dashboard`, `Detalle`, `Historial`) para el consumo de datos específico, eliminando el acoplamiento a servicios monolíticos.
- **Interfaces por Feature:** Modelos y contratos de datos distribuidos modularmente en cada directorio de feature correspondiente para mayor orden y escalabilidad.
- **Flujo de Control Moderno:** Migración total de directivas tradicionales a sintaxis nativa `@if` y `@for`.
- **Manejo del Estado:** Uso de Angular `signal` y `computed` para la reactivación reactiva de la interfaz en tiempo real.
- **Seguridad Angular:** `AuthGuard` para restringir el acceso a usuarios no logueados y `AuthInterceptor` para adjuntar de forma transparente el Bearer token JWT a las peticiones HTTP.

---

## Autores
- **Bastián Poloni**
- **Joaquín Contreras**