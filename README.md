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

## 🔧 Configuración del Backend y Firebase

Para que el backend funcione correctamente, necesitas configurar un proyecto en Firebase y habilitar la base de datos Cloud Firestore. Sigue estos pasos detallados:

### 1. Crear un Proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Haz clic en **Agregar proyecto** (o **Crear un proyecto**).
3. Escribe el nombre de tu proyecto (por ejemplo, `ChanchitoApp`) y haz clic en **Continuar**.
4. Puedes dejar habilitado o deshabilitar Google Analytics según prefieras, y haz clic en **Crear proyecto**.
5. Espera a que se cree y presiona **Continuar**.

### 2. Configurar la Base de Datos Cloud Firestore
1. En el menú lateral izquierdo de Firebase Console, ve a **Compilación** (Build) > **Firestore Database**.
2. Haz clic en el botón **Crear base de datos**.
3. Selecciona la ubicación del servidor que prefieras (por ejemplo, `us-east1` o la más cercana a tu ubicación) y haz clic en **Siguiente**.
4. Selecciona **Comenzar en modo de prueba** (esto permitirá lecturas y escrituras inmediatas sin restricciones iniciales de reglas) o **Comenzar en modo de producción**.
5. Haz clic en **Crear** (Habilitar).

### 3. Descargar las Credenciales de la Cuenta de Servicio (Clave Privada JSON)
El backend utiliza el SDK de administración de Firebase (`firebase-admin`) para conectarse de forma segura a Firestore mediante una cuenta de servicio:
1. En Firebase Console, haz clic en el ícono de engranaje ⚙️ junto a *Descripción general del proyecto* (en la esquina superior izquierda) y selecciona **Configuración del proyecto**.
2. Ve a la pestaña **Cuentas de servicio** (Service accounts).
3. Asegúrate de tener seleccionado **Node.js** y haz clic en el botón **Generar nueva clave privada**.
4. Confirma haciendo clic en **Generar clave**. Esto descargará automáticamente un archivo con extensión `.json` (por ejemplo, `chanchitoapp-firebase-adminsdk-xxxxx.json`) a tu computadora.

### 4. Configurar las Variables de Entorno del Backend
1. Mueve el archivo `.json` descargado adentro de la carpeta `backend/` de este proyecto.
2. Dentro de la carpeta `backend/`, crea un archivo llamado `.env` (si aún no lo has creado) y define las siguientes variables:

```env
FIREBASE_CREDENTIALS_PATH=./tu-archivo-descargado.json
JWT_SECRET=tu_clave_secreta
```

> [!IMPORTANT]
> * Reemplaza `./tu-archivo-descargado.json` por el nombre exacto del archivo `.json` que moviste a la carpeta `backend` (por ejemplo, `./chanchitoapp-firebase-adminsdk-xxxxx.json`).
> * El archivo `.json` contiene credenciales sensibles y privadas de tu base de datos, por lo que **nunca** debes subirlo a repositorios públicos como GitHub (ya se encuentra configurado en el `.gitignore` por seguridad).

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

## 🐳 Despliegue con Docker (Recomendado)

El proyecto cuenta con soporte para **Docker** y **Docker Compose** para compilar y levantar tanto el frontend como el backend de forma automatizada en contenedores aislados y optimizados.

### 1. Requisitos Previos
- Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/) ejecutándose en tu sistema.

### 2. Configuración de Credenciales
Dado que el contenedor de backend lee la clave privada de Firebase, asegúrate de tener:
1. El archivo JSON de credenciales de Firebase en la carpeta `backend/`.
2. Un archivo `.env` en la carpeta `backend/` configurado con el nombre correcto del archivo de credenciales y tu secreto JWT:
   ```env
   FIREBASE_CREDENTIALS_PATH=./tu-archivo-de-firebase.json
   JWT_SECRET=tu_secreto_jwt
   ```

### 3. Levantar los Contenedores
Desde la raíz del proyecto (donde se encuentra `docker-compose.yml`), ejecuta:

```bash
# Construir imágenes y levantar servicios en segundo plano (detached)
docker compose up --build -d
```

*Esto compilará el frontend en modo de producción, configurará Nginx para servir los archivos estáticos y arrancará el servidor de Node en segundo plano.*

### 4. Enlaces de Acceso
- **Frontend (Aplicación):** [http://localhost](http://localhost)
- **Backend (API):** [http://localhost:3000/usuarios](http://localhost:3000/usuarios)

### 5. Comandos Útiles de Mantenimiento
```bash
# Ver estado de los contenedores
docker compose ps

# Ver registros/logs en tiempo real
docker compose logs -f

# Detener y limpiar los contenedores y redes creadas
docker compose down
```

---

## 🔑 Autenticación y Cuentas de Prueba

La aplicación cuenta con seguridad **JWT (JSON Web Tokens)**. Todas las peticiones al backend (a excepción de Login y Registro) requieren un token de portador (`Bearer Token`) válido enviado automáticamente por el interceptor del frontend.

### ¿Cómo registrar un usuario nuevo?
Para registrar un usuario personalizado, realiza una petición `POST` al endpoint `/auth/register` usando cualquiera de los siguientes métodos (nota que solo se requiere el presupuesto base, y las contraseñas se almacenarán cifradas automáticamente):

#### Opción A: Desde PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -ContentType "application/json" -Body '{"nombre":"Tu Nombre","email":"correo@ejemplo.com","password":"password123","presupuesto":200000}'
```

#### Opción B: Desde cURL (Clásico CMD / Git Bash)
```bash
curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Tu Nombre","email":"correo@ejemplo.com","password":"password123","presupuesto":200000}'
```

---

## 🛠️ Tecnologías y Arquitectura Utilizadas

- **Billetera Compartida por Email (Multiusuario):** Se diseñó una segunda billetera que se comparte con otro usuario registrado mediante vinculación de email y presupuesto compartido en Ajustes. Cuenta con un selector global reactivo en la barra superior que muestra el nombre del compañero ("Billetera Compartida con {nombre}").
- **Servicio Central de Billetera (`WalletService`):** Se creó un servicio compartido para controlar la billetera activa y automatizar la reactivación y recarga de datos en todas las pantallas a través de efectos de Angular (`effect`).
- **Autenticación e Identidad Totalmente Reactiva:** Incorporación de una señal `currentUser` en `Auth` que desencadena una señal computada `myUid` en `WalletService`. Esto permite que la billetera compartida reaccione y sincronice la información de Firestore automáticamente ante inicios o cierres de sesión sin requerir recargas manuales.
- **Endpoints de Datos Compartidos en el Backend:** Se implementó una lógica de resolución bidireccional en el backend y colecciones de Firestore dedicadas (`categoriaCompartida`, `transaccionCompartida`) para aislar los flujos de dinero compartidos de las billeteras personales.
- **Configuración de Entorno Dinámica:** Implementación de entornos de Angular (`environment.ts`) que determinan la URL de la API de forma automática: `localhost:3000` en desarrollo y de manera 100% dinámica (`window.location.hostname:3000`) en servidores de producción.
- **Cifrado y Seguridad de Contraseñas:** Se implementó hasheo seguro con `bcryptjs` en el backend para proteger las contraseñas de los usuarios en Firestore. El inicio de sesión y la actualización de datos comparan los hashes de forma asíncrona.
- **Saldo Disponible Dinámico:** El saldo disponible se calcula "en caliente" en el frontend mediante signals computados (`presupuesto - gastos`), evitando mantener campos estáticos redundantes en la base de datos que causen inconsistencias.
- **Simplificación del Flujo Financiero:** Se simplificó el modelo eliminando por completo el concepto de **Ingreso Mensual / `monthlyIncome`** del frontend, backend y base de datos, enfocando la aplicación netamente en el presupuesto mensual establecido y el control de gastos reales.
- **Formulario de Registro Simplificado:** Se optimizó el flujo de registro solicitando únicamente el presupuesto base, eliminando campos innecesarios (como saldo inicial o ingresos del formulario de registro) para mejorar la experiencia de usuario.
- **Servicios Descentralizados (Frontend):** Cada feature posee su propio servicio independiente (`Ajustes`, `Categorias`, `Dashboard`, `Historial`) para el consumo de datos específico, eliminando el acoplamiento a servicios monolíticos.
- **Interfaces por Feature:** Modelos y contratos de datos distribuidos modularmente en cada directorio de feature correspondiente para mayor orden y escalabilidad.
- **Flujo de Control Moderno:** Migración total de directivas tradicionales a sintaxis nativa `@if` y `@for`.
- **Manejo del Estado Reactivo:** Uso de Angular `signal` y `computed` para la reactivación de la interfaz en tiempo real.
- **Seguridad en Angular:** `AuthGuard` para restringir el acceso a usuarios no logueados y `AuthInterceptor` para adjuntar de forma transparente el Bearer token JWT a las peticiones HTTP.
---

## Autores
- **Bastián Poloni**
- **Joaquín Contreras**