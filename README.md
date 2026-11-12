# Stride & Co.

## Equipo de Trabajo

| ID     | Nombre                        | Rol          |
|--------|-------------------------------|--------------|
| 385540 | Alexander Chacon Ramirez      | Product Owner|
| 385500 | Luis Felipe Domínguez Chávez  | Scrum Master |
| 385660 | Diego Flores Verdad Grijalva  | Developer    |
| 385596 | Danna Karely Lopez Rea        | Developer    |

Sistema integral de gestión de inventario, logística de despachos y seguimiento de pedidos en tiempo real.

## Descripción del Proyecto

Stride & Co. enfrenta una falta de integración en tiempo real entre la gestión de inventario en almacén, la logística de despachos y la experiencia del cliente final. Esto genera opacidad en el estado de los envíos y cuellos de botella en la preparación de pedidos.

Este sistema busca resolver esa brecha proporcionando una plataforma centralizada que conecte la operación interna del almacén con la experiencia digital del cliente, eliminando procesos manuales y comunicación informal.

## Objetivos del Producto

- **Trazabilidad total:** Proporcionar al cliente una interfaz clara de seguimiento de su pedido con notificaciones digitales de estado.
- **Eficiencia en almacenes:** Centralizar la actualización de inventarios y el flujo de trabajo para empaque y expedición.
- **Integración omnicanal:** Conectar la gestión operativa de la tienda física con la plataforma de comercio y distribución digital.

## Tecnologías

- Node.js y Express (estructura generada con Express Generator)
- Pug para las vistas
- Morgan para el logging de solicitudes HTTP
- Sequelize + PostgreSQL para el modelo relacional (users, roles, permissions, products, variants, inventory)
- Mongoose + MongoDB para el modelo documental (customers, orders)
- bcrypt para almacenar contraseñas de forma segura
- jsonwebtoken (emitir) y express-jwt (verificar) para la autenticación con JWT
- AccessControl para la autorización por roles (RBAC)
- ESLint para la calidad de código
- Jest y Supertest para las pruebas automatizadas

## Requisitos

- Node.js 20.19 o superior
- npm
- PostgreSQL 16 y MongoDB en ejecución para `npm start`

## Instalación

```bash
git clone https://github.com/LF-Dguez/proyecto-Stride-Co.git
cd proyecto-Stride-Co
npm install
```

### Configuración y secretos

La configuración se lee con la librería [config](https://www.npmjs.com/package/config) (`config.get('clave')`); el código no lee `process.env`. Solo dos variables de entorno existen: `NODE_ENV` (modo: `development` por defecto, `test` o `production`) y `PORT` (se enlaza con `server.port`).

| Dónde | Qué contiene | ¿Va en git? |
|---|---|---|
| `config/default.json`, `development.json`, `test.json`, `production.json` | Configuración no secreta (expiración del JWT, costo de bcrypt, SSL, etc.) | Sí |
| `config/custom-environment-variables.json` | `PORT` -> `server.port` | Sí |
| `config/local-<entorno>.example.json` | Plantillas de secretos | Sí |
| `config/local-development.json`, `config/local-production.json` | Secretos: `jwt.secret`, `postgres.uri` y `mongo.uri` | **No** (`.gitignore` y `.dockerignore`) |

Para trabajar en local, crea tu archivo de secretos a partir de la plantilla y llénalo:

```bash
cp config/local-development.example.json config/local-development.json
```

Genera un `jwt.secret` propio con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Si falta `jwt.secret` o alguna URI, el servidor no arranca y muestra qué falta. `npm test` no necesita secretos reales: usa `config/test.json`.

```bash
npm start                                  # development, puerto 3000
NODE_ENV=production PORT=8080 npm start    # production, puerto 8080
```

**PostgreSQL:** la URI se define en `postgres.uri` de `config/local-development.json`. Para tener PostgreSQL local con Docker:

```bash
docker run -d --name stride-pg -e POSTGRES_PASSWORD=CAMBIAR -e POSTGRES_DB=stride_co -p 5432:5432 postgres:16
```

Con esa contraseña, la URI queda `postgres://postgres:CAMBIAR@localhost:5432/stride_co`. Para la External Database URL de Render PostgreSQL se necesita SSL: `postgres.ssl` es `true` en `config/production.json`.

**MongoDB:** `mongo.uri`. En desarrollo puede apuntar a una instalación local (`mongodb://localhost:27017/stride_co`) o, si no quieres instalar MongoDB en tu máquina, a un cluster gratuito de [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (`mongodb+srv://usuario:CAMBIAR@cluster.mongodb.net/stride_co`). Cualquiera de las dos opciones va en el mismo campo `mongo.uri` de `config/local-development.json`.

#### Render PostgreSQL (producción)

La base relacional de producción es una instancia **Free** de Render PostgreSQL:

| Dato | Valor |
|---|---|
| Proveedor / región | Render, Oregon (US West) |
| Plan | Free, sin tarjeta |
| Creada | 11 de noviembre de 2026 |
| **Caduca** | **11 de diciembre de 2026** (30 días desde su creación; 14 días de gracia y después se borra con sus datos) |

> ⚠️ Solo se permite una base Free por workspace. Si caduca antes de la entrega, hay que recrearla y volver a correr `npm run seed`.

Render da dos cadenas de conexión distintas:

| URL | Uso |
|---|---|
| **Internal Database URL** | La usa el Web Service de Render, porque está en la misma región (más rápida, no sale a internet) |
| **External Database URL** | Para conectarte desde una computadora local (por ejemplo, para correr el seed o probar la conexión). Requiere SSL: `postgres.ssl` es `true` en `config/production.json` |

La que corresponda va en `postgres.uri` de `config/local-production.json`. Para comprobar la conexión desde una computadora local (con la External Database URL):

```bash
NODE_ENV=production node -e "require('./config/sequelize').authenticate().then(() => console.log('OK')).catch((e) => console.error(e.message))"
```

#### MongoDB Atlas (producción)

La base documental de producción es un cluster **M0 (gratuito)** de MongoDB Atlas:

| Dato | Valor |
|---|---|
| Proveedor / región | AWS, Oregon (us-west-2) |
| Tier | M0 Free |
| Usuario de base de datos | Exclusivo del proyecto, con el rol `readWriteAnyDatabase` (no `Atlas Admin`) |
| Network Access | `0.0.0.0/0`, porque el plan gratuito de Render no tiene IP fija. Por eso la contraseña del usuario es robusta y la URI **nunca** se publica (solo vive en `config/local-production.json`, fuera de git) |
| Creado | 11 de noviembre de 2026 |

Esta URI va en `mongo.uri` de `config/local-production.json`. Para comprobar la conexión desde una computadora local:

```bash
NODE_ENV=production node -e "require('./config/mongoose')().then(() => console.log('OK')).catch((e) => console.error(e.message))"
```

`npm start` y `npm run dev` necesitan PostgreSQL y MongoDB corriendo: al arrancar, el servidor se conecta a ambas, sincroniza las tablas y carga los permisos RBAC antes de aceptar peticiones. `npm test` no los necesita: las pruebas simulan las consultas a la base de datos.

Para poblar roles, permisos y usuarios de prueba (`admin@stride.co`, `sales@stride.co` y `user@stride.co`, cada uno con su propia contraseña de demostración, definida en seed.demoPasswords de config/default.json; son datos ficticios exclusivos de esas cuentas):

```bash
npm run seed
```

## Ejecución

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el servidor en `http://localhost:3000` |
| `npm run dev` | Inicia el servidor con recarga automática (nodemon) |
| `npm run lint` | Revisa el código con ESLint |
| `npm test` | Ejecuta las pruebas automatizadas |
| `npm run seed` | Siembra roles, permisos y usuarios de prueba |

Para comprobar que el servidor responde, con `npm start` en ejecución abre `http://localhost:3000/health`. Los endpoints bajo `/api` requieren un token (ver [Autenticación](#autenticación)).

## Pruebas y calidad de código

```bash
npm run lint
npm test
```

Las pruebas están en la carpeta `test/` (un archivo por recurso) y verifican el código HTTP, la estructura de la respuesta, los errores (400, 404, 409), la autenticación (login, token y `/api/auth/me`) y los escenarios de autorización (ver [Control de acceso basado en roles](#control-de-acceso-basado-en-roles)). Ninguna prueba depende de que PostgreSQL o MongoDB estén corriendo: las consultas a la base de datos se simulan con `jest.mock` y `jest.spyOn` (`test/helpers/`).

### Pruebas E2E (end-to-end)

Las pruebas E2E viven en `test/e2e/` y **no usan mocks**: se ejecutan con Jest + Supertest contra la API en ejecución y con PostgreSQL y MongoDB reales. Por eso están separadas: `npm test` las ignora y sigue funcionando sin bases de datos.

| Comando | Qué ejecuta |
|---|---|
| `npm test` | Solo las pruebas con mocks (ignora `test/e2e/`) |
| `npm run test:e2e` | Solo las pruebas E2E, contra la API en ejecución |

Para correrlas en local:

```bash
npm run seed       # roles, permisos y usuarios de demostración (admin, sales y user)
npm start          # API en http://localhost:3000, con PostgreSQL y MongoDB corriendo
npm run test:e2e   # en otra terminal
```

La URL de la API sale de `e2e.baseUrl` (por defecto `http://localhost:3000`). Para ejecutar la misma suite contra el despliegue se permite `E2E_BASE_URL`, solo para este runner:

```bash
E2E_BASE_URL=https://<servicio>.onrender.com npm run test:e2e
```

Antes de empezar, las pruebas esperan hasta 90 segundos a que `GET /health` responda (el plan gratuito de Render tarda cerca de un minuto en despertar). `test/e2e/helpers.js` ofrece `login(rol)` (JWT de los usuarios de demostración), `authHeader(rol)` y `createCleanup()`, que elimina al terminar los datos que cada prueba creó para poder repetir la suite.

## Arquitectura

El flujo de cada solicitud es:

```
HTTP Request → Express → authenticate (JWT) → Route → authorize (RBAC) → Controller → Response
```

`authenticate` verifica el token y deja al usuario en `req.user`; cada ruta pasa por `authorize()` para comprobar el permiso y después llega al controlador, que procesa la solicitud y responde.

```
stride-co/
├── bin/www              arranque del servidor: conecta PostgreSQL/MongoDB y carga RBAC
├── config/              conexión a PostgreSQL (sequelize.js) y MongoDB (mongoose.js)
├── models/
│   ├── sql/             modelos Sequelize (users, roles, permissions, products, variants, inventory)
│   └── mongo/           modelos Mongoose (customers, orders)
├── controllers/         lógica de cada recurso
├── routes/              endpoints de cada recurso
├── middlewares/         authenticate.js (JWT) y authorize.js (RBAC)
├── services/            password.js (bcrypt), token.js (JWT), rbac.js (permisos desde la BD) y ownership.js (dueño real para `own`)
├── utils/               sequelizeHelpers.js: validación de IDs y traducción de errores de Sequelize a HTTP
├── seeders/             siembra roles, permisos y role_permission (seedRbac.js)
├── test/                pruebas automatizadas
├── public/              archivos estáticos
├── views/               vistas Pug
├── app.js               configuración de Express, logging y manejo de errores
├── eslint.config.js     configuración de ESLint
└── package.json
```

- **Logging:** todas las solicitudes HTTP se registran con Morgan.
- **Errores:** bajo `/api` todos los errores responden JSON con la forma `{ "error": { "message": "...", "status": 404 } }`. Un error `500` responde `Error interno del servidor` y no expone el detalle.

## API

Todos los endpoints responden con `{ "message": "...", "data": ... }` y leen o escriben en la base de datos: PostgreSQL para los recursos relacionales y MongoDB para `customers` y `orders`. Todos los recursos bajo `/api` requieren un token JWT (ver [Autenticación](#autenticación)) y están protegidos con RBAC (ver [Control de acceso basado en roles](#control-de-acceso-basado-en-roles)).

| Recurso | Modelo | Base |
|---------|--------|------|
| Users | Relacional (SQL) | `/api/users` |
| Roles | Relacional (SQL) | `/api/roles` |
| Permissions | Relacional (SQL) | `/api/permissions` |
| Products | Relacional (SQL) | `/api/products` |
| Variants | Relacional (SQL) | `/api/variants` |
| Inventory | Relacional (SQL) | `/api/inventory` |
| Customers | Documental (MongoDB) | `/api/customers` |
| Orders | Documental (MongoDB) | `/api/orders` |

Operaciones disponibles en cada recurso:

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/api/<recurso>` | Lista los registros | 200 |
| `GET` | `/api/<recurso>/:id` | Obtiene un registro | 200 |
| `POST` | `/api/<recurso>` | Crea un registro | 201 |
| `PUT` | `/api/<recurso>/:id` | Actualiza un registro | 200 |
| `DELETE` | `/api/<recurso>/:id` | Elimina un registro | 200 |

Códigos de error:

| Código | Cuándo ocurre |
|---|---|
| `400` | Datos inválidos, id mal formado o valor único repetido (email, sku, nombre de rol, key de permiso) |
| `401` | Sin token, token inválido o expirado, o usuario inactivo |
| `403` | El rol del usuario no tiene el permiso requerido (RBAC) |
| `404` | El registro o la ruta no existe |
| `409` | Registro en uso por otros registros o rol con usuarios asignados  |
| `500` | Error interno del servidor |

Notas:

- `POST` y `PUT /api/roles` aceptan `permission_ids: [1, 2]` para asignar permisos al rol (tabla `role_permission`).
- En `PUT /api/customers/:id` y `PUT /api/orders/:id` el dueño del registro (`userId` y `customerId`) no se puede cambiar.

Ejemplo:

```
GET /api/products
```

```json
{
  "message": "GET productos obtenido exitosamente",
  "data": [
    {
      "id": 1, "category_id": 10, "name": "Tenis Runner Pro", "brand": "Stride", "price": "1299.99", "active": true,
      "variants": [
        { "id": 1, "sku": "STR-RUN-BLK-27", "color": "Negro", "size": "27", "inventory": { "id": 1, "stock": 50 } }
      ]
    }
  ]
}
```

## Autenticación

La API autentica a los usuarios con **JSON Web Tokens (JWT)** y guarda las contraseñas con **bcrypt**. Esta sección cubre solo la autenticación; la autorización por roles está en [Control de acceso basado en roles](#control-de-acceso-basado-en-roles).

```
POST /api/auth/login → bcrypt.compare → jsonwebtoken firma el JWT
Petición con Bearer token → express-jwt lo verifica → authenticate carga al usuario → req.user
```

### Almacenamiento de contraseñas

La contraseña nunca se guarda ni se devuelve en texto plano. `services/password.js` separa esta lógica del controller de usuarios:

| Función | Qué hace |
|---|---|
| `hashPassword(password)` | `bcrypt.genSalt(bcrypt.saltRounds)` genera el `salt_key` y `bcrypt.hash(password, salt_key)` el `password_hash` |
| `verifyPassword(password, passwordHash)` | Compara con `bcrypt.compare` (nunca recalcula el hash para compararlo con `===`) |

- **Factor de costo:** se lee de `bcrypt.saltRounds` (por defecto `10`).
- **Campos:** `salt_key` y `password_hash` en la tabla `users`. Se guardan juntos y se regeneran juntos: al crear un usuario y cada vez que cambia su contraseña (`POST /api/users` y `PUT /api/users/:id` con `password`) se genera un salt nuevo y un hash nuevo.
- **Datos sensibles:** `User.toJSON()` elimina `password`, `password_hash` y `salt_key`, así que no aparecen en ninguna respuesta de la API. Tampoco van dentro del JWT.

### Librerías

| Librería | Uso |
|---|---|
| `bcrypt` | Generar y verificar el hash de las contraseñas |
| `jsonwebtoken` | Firmar el JWT en el login (`services/token.js`) |
| `express-jwt` | Verificar el JWT de cada petición protegida (`middlewares/authenticate.js`) |

### Login: `POST /api/auth/login`

Público. Busca al usuario por email, valida que exista y esté activo, verifica la contraseña con `bcrypt.compare` y, si todo es correcto, firma el token.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stride.co","password":"Admin-Demo-2026!"}'
```

```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "first_name": "Admin", "last_name": "Stride", "email": "admin@stride.co", "role_id": 1, "active": true }
}
```

Si el email no existe, la contraseña es incorrecta o el usuario está inactivo, la respuesta es siempre la misma, para no revelar qué cuentas existen:

```json
{ "message": "Invalid credentials" }
```

El token se firma con `jwt.sign()` usando `HS256`, `jwt.secret`, `jwt.expiresIn`, `jwt.issuer` y `jwt.audience`. Su payload lleva **solo** `sub` (el id del usuario), además de los campos estándar `iat`, `exp`, `iss` y `aud`:

```json
{ "sub": "1", "iat": 1792356802, "exp": 1792357702, "iss": "stride-co", "aud": "stride-co-api" }
```

### Usar el token

Todas las rutas bajo `/api`, excepto el login, requieren el header:

```
Authorization: Bearer <token>
```

El middleware reutilizable `authenticate` (`middlewares/authenticate.js`) se monta una sola vez por router en `app.js`:

1. `express-jwt` verifica la firma, la expiración, el `issuer` y el `audience`, con `algorithms: ['HS256']`, y deja el payload en `req.auth`.
2. Busca al usuario con `req.auth.sub`; si ya no existe o está inactivo responde `401`.
3. Deja al usuario en `req.user`, que después usa el middleware RBAC `authorize`.

Los errores de `express-jwt` (token inexistente, inválido o expirado) los atiende el manejador de errores de `app.js` y responden `401` en JSON:

```json
{ "error": { "message": "jwt expired", "status": 401 } }
```

### Usuario autenticado: `GET /api/auth/me`

Protegido con `authenticate`. Devuelve los datos seguros del usuario del token, sin `password_hash` ni `salt_key`.

```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

```json
{ "id": 1, "first_name": "Admin", "last_name": "Stride", "email": "admin@stride.co", "role_id": 1, "active": true }
```

### Expiración

El token expira según `jwt.expiresIn`, configurado en **15 minutos** (`15m`). Después hay que volver a hacer login.

### Configuración

| Clave de `config` | Valor | Descripción |
|---|---|---|
| `jwt.secret` | (en `config/local-<entorno>.json`; sin valor en el repositorio) | Clave para firmar y verificar los tokens |
| `jwt.expiresIn` | `15m` | Tiempo de expiración del token |
| `jwt.issuer` | `stride-co` | Emisor (`iss`) que se firma y se valida |
| `jwt.audience` | `stride-co-api` | Audiencia (`aud`) que se firma y se valida |
| `bcrypt.saltRounds` | `10` | Factor de costo de bcrypt |

El valor real de `jwt.secret` nunca se sube al repositorio: vive en `config/local-<entorno>.json`, que está en `.gitignore` y `.dockerignore`, y la plantilla `config/local-development.example.json` lo deja vacío. Para generar uno local:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Códigos HTTP

| Situación | Código |
|---|---|
| Login correcto | 200 |
| Datos de login incompletos (falta email o password, o no son texto) | 400 |
| Credenciales incorrectas | 401 |
| Usuario inactivo | 401 |
| Token inexistente | 401 |
| Token inválido o expirado | 401 |
| `/api/auth/me` con token válido | 200 |

## Control de acceso basado en roles

El proyecto implementa RBAC (Role-Based Access Control) con la librería [`accesscontrol`](https://www.npmjs.com/package/accesscontrol), usando como fuente de verdad las tablas `Role`, `Permission` y `Role_Permission` del modelo relacional. La API no tiene permisos escritos en el código: la matriz de `seeders/rbacMatrix.js` solo la usa el seed para llenar esas tablas.

### Roles

| Rol | Descripción |
|---|---|
| `admin` | Acceso total al sistema |
| `sales` | Catálogo en lectura; opera órdenes y clientes |
| `user` | Catálogo en lectura; solo sus propias órdenes y datos de cliente |

### Convención de `Permission.key`

Cada permiso sigue el formato `recurso:accion:alcance`, por ejemplo `orders:read:own`:

- **recurso:** el recurso sobre el que opera (`products`, `orders`, etc.)
- **acción:** `create`, `read`, `update` o `delete`
- **alcance (possession):** `any` (cualquier recurso de ese tipo) u `own` (solo los del usuario autenticado)

### Matriz RBAC

| Recurso · operación | ADMIN | SALES | USER |
|---|:---:|:---:|:---:|
| users · create | any | — | — |
| users · read | any | — | — |
| users · update | any | — | — |
| users · delete | any | — | — |
| roles · create | any | — | — |
| roles · read | any | — | — |
| roles · update | any | — | — |
| roles · delete | any | — | — |
| permissions · create | any | — | — |
| permissions · read | any | — | — |
| permissions · update | any | — | — |
| permissions · delete | any | — | — |
| products · create | any | — | — |
| products · read | any | any | any |
| products · update | any | — | — |
| products · delete | any | — | — |
| variants · create | any | — | — |
| variants · read | any | any | any |
| variants · update | any | — | — |
| variants · delete | any | — | — |
| inventory · create | any | — | — |
| inventory · read | any | any | — |
| inventory · update | any | any | — |
| inventory · delete | any | — | — |
| customers · create | any | any | — |
| customers · read | any | any | own |
| customers · update | any | any | own |
| customers · delete | any | — | — |
| orders · create | any | any | any |
| orders · read | any | any | own |
| orders · update | any | any | own |
| orders · delete | any | — | — |

Esta matriz se genera con `npm run matrix` desde `seeders/rbacMatrix.js` (la misma fuente del seed) y coincide con los registros de `roles`, `permissions` y `role_permission` que siembra `npm run seed` (definidos en `seeders/rbacMatrix.js`) y con el comportamiento de la API: `GET /api/roles` la devuelve tal como está en la base de datos.

### Endpoints protegidos

Los 40 endpoints de los 8 recursos pasan por `authorize(resource, action, possession)` antes del controller, con las cuatro operaciones `create`, `read`, `update` y `delete`:

| Recurso | Protegido | Alcance |
|---|---|---|
| `/api/users` | Sí | `any` |
| `/api/roles` | Sí | `any` |
| `/api/permissions` | Sí | `any` |
| `/api/products` | Sí | `any` |
| `/api/variants` | Sí | `any` |
| `/api/inventory` | Sí | `any` |
| `/api/orders` | Sí | `own` en lectura/actualización, `any` en creación/eliminación |
| `/api/customers` | Sí | `own` en lectura/actualización, `any` en creación/eliminación |

El middleware no compara nombres de rol (`if (user.role === 'admin')`) y los controllers no deciden permisos: solo `authorize()` lo hace, con la instancia de `AccessControl`.

### Ejemplo de permiso `any`

Cualquiera con `products:delete:any` (solo `admin`) puede eliminar cualquier producto:

```js
router.delete('/:id', authorize('products', 'delete', 'any'), controller.delete);
```

Con el rol `sales`, que no tiene ese permiso, la respuesta es:

```json
{ "error": { "message": "Acceso denegado", "status": 403 } }
```

### Ejemplo de permiso `own`

Con `own` no basta el rol: se compara el **dueño real** del recurso, tomado de la base de datos, contra el usuario autenticado. Nunca se confía en un id enviado por el cliente. Las funciones que resuelven al dueño están en `services/ownership.js`:

| Recurso | Dueño real |
|---|---|
| Orden | `Order.customerId` → `Customer.userId` |
| Cliente | `Customer.userId` |

```js
const { orderOwner } = require('../services/ownership');

router.get('/:id', authorize('orders', 'read', 'own', orderOwner), controller.getById);
```

1. Si el rol tiene `orders:read:any` (admin, sales), pasa sin comparar.
2. Si solo tiene `orders:read:own` (user), `orderOwner` busca la orden y su cliente; si `Customer.userId` coincide con `req.user.id` pasa, si no responde `403 Forbidden`.

En el listado (`GET /api/orders`), `authorize()` deja el alcance concedido en `req.rbac.possession` y `services/ownership.js` arma el filtro: con `own` solo se devuelven las órdenes de los clientes del usuario autenticado.

### Cómo se cargan los permisos desde la base de datos

La matriz se siembra en la base de datos con `npm run seed` (`seeders/seedRbac.js` lee `seeders/rbacMatrix.js` y llena `roles`, `permissions` y `role_permission`). A partir de ahí, la **base de datos es la única fuente de verdad**: la API no lee la matriz del código.

```
Role → Role_Permission → Permission  →  services/rbac.js (loadAccessControl)  →  AccessControl  →  authorize()
```

1. Al arrancar el servidor (`bin/www`), `loadAccessControl()` consulta `Role` con sus `Permission` (vía `role_permission`).
2. Separa cada `key` en `resource`, `action` y `possession` (`orders:read:own` → `orders`, `read`, `own`) y construye la instancia de `AccessControl`.
3. Cada vez que se crea, modifica o elimina un rol o un permiso desde `/api/roles` o `/api/permissions` (incluido asignar `permission_ids`), se vuelve a llamar a `loadAccessControl()`, así que el cambio aplica de inmediato sin reiniciar el servidor.
4. Una `key` que no siga `recurso:accion:alcance` se rechaza con `400` antes de guardarse.

### Usuario autenticado (`req.user`)

`authorize()` usa al usuario que deja el middleware `authenticate` (ver [Autenticación](#autenticación)): toma `req.auth.sub` del JWT, carga al usuario de la base de datos y lo pone en `req.user`, con su `role_id`. `services/rbac.js#getRoleName()` traduce ese `role_id` al nombre del rol cargado de la base de datos. Por eso sin token la respuesta es `401` y nunca se llega a `authorize()`, y con token pero sin permiso es `403`.

### Pruebas automatizadas

Los escenarios mínimos de la Tarea 6 están en `test/rbacScenarios.test.js`, uno por bloque:

| Escenario | Rol | Permiso | Resultado esperado |
|---|---|---|---|
| 11.1 Acceso permitido | admin | `products:delete:any` | 200 |
| 11.2 Acceso denegado | sales | `products:delete:any` | 403 |
| 11.3 Recurso propio | user | `orders:read:own` (orden propia) | 200 |
| 11.4 Recurso de otro usuario | user | `orders:read:own` (orden ajena) | 403 |
| 11.5 Permiso `any` no asignado | user | `orders:read:any` / `orders:delete:any` | 403 |

Además, cada recurso tiene pruebas de acceso permitido y denegado (`test/*.rbac.test.js` y los archivos de cada recurso), `test/authorize.test.js` prueba el middleware (401, 403, `any` y `own`) y `test/auth.integration.test.js` recorre el flujo completo con un JWT real: login → token → `authenticate` → `authorize` → 200 / 403.

## Internacionalización

La API responde en español (`es`, idioma por defecto) e inglés (`en`), con la librería [`i18n`](https://www.npmjs.com/package/i18n).

### Cómo se elige el idioma

El idioma se detecta en este orden:

1. **`?lang=es`** o **`?lang=en`** en la URL (tiene prioridad sobre todo lo demás).
2. Cabecera **`Accept-Language`** de la petición (acepta listas de preferencia y variantes regionales: `es-MX`, `en-US`, etc., que se resuelven a su idioma base).
3. Si no se reconoce ninguno de los dos (por ejemplo `fr`), se usa el idioma por defecto (`es`).

```bash
curl -H "Accept-Language: en" https://<url>/api/products/999
```

```json
{ "error": { "message": "Product not found", "status": 404 } }
```

### Qué está traducido

Todos los `message` de la API (éxito y error: 400, 401, 403, 404 y 500), incluidos los mensajes transversales (ruta inexistente, sin token, sin permiso, error inesperado) y la vista `index.pug`. En los controllers y middlewares se traduce con `req.__('clave', ...valores)`; no hay textos escritos directamente en el código.

### Archivos de traducción

```
locales/
├── es.json
└── en.json
```

Las claves están organizadas por recurso (`users`, `products`, `orders`, `common`, etc.) con la misma estructura en ambos archivos; `test/locales.test.js` comprueba que tengan exactamente las mismas claves, que ninguna quede vacía o sin traducir, y que conserven los mismos marcadores (`%s`).

### Cómo agregar un idioma nuevo

1. Crear `locales/<idioma>.json` con las mismas claves que `es.json`/`en.json` (mismo formato, mismos marcadores `%s`).
2. Agregar el código del idioma a `SUPPORTED_LOCALES` en `config/i18n.js`.
3. Correr `npm test`: `test/locales.test.js` avisa si falta alguna clave.

## Despliegue

### Docker

La imagen (`Dockerfile`) corre con `node:22-alpine`. Los secretos (`config/local-production.json`) **nunca** entran a la imagen: `.dockerignore` los excluye explícitamente. En su lugar, `docker-entrypoint.sh` los recibe en tiempo de ejecución desde `/etc/secrets/local-production.json` (donde Render monta los *Secret Files*), los copia a `config/` y recién entonces arranca el servidor. Si ese archivo no existe, el contenedor **no arranca** y lo dice en los logs.

Para probarlo en local, con un `local-production.json` propio (puede ser de prueba, con URIs y `jwt.secret` reales de un entorno que no sea el de producción):

```bash
docker build -t stride-co .
docker run -d --name stride-co -p 3000:3000 \
  -e PORT=3000 \
  -v "/ruta/completa/a/config/local-production.json:/etc/secrets/local-production.json:ro" \
  stride-co
curl http://localhost:3000/health
docker logs stride-co
```

### Cómo se entrega el secret file a Render

1. En el Web Service, ir a **Environment → Secret Files**.
2. Agregar un archivo con la ruta `/etc/secrets/local-production.json` (el nombre que Render le da en el contenedor) y como contenido el JSON de secretos (`jwt.secret`, `postgres.uri`, `mongo.uri` reales).
3. Render lo monta ahí automáticamente en cada despliegue; nunca se sube al repositorio.

## Control de cambios

- Los commits siguen la especificación [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- El trabajo se hace en ramas por funcionalidad (por ejemplo `feat/...`, `test/...`) y se integra a `main` mediante Pull Request con merge commit.
- Cada actividad conserva su rama en el remoto después del merge: `feat/jwt-authentication` (Actividad 4) y `feat/rbac-authorization` (Tarea 6).
- No se suben `node_modules/` ni los archivos `config/local*.json` (secretos); están incluidos en `.gitignore`.
