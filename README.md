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
- Sequelize + MySQL para el modelo relacional (users, roles, permissions, products, variants, inventory)
- Mongoose + MongoDB para el modelo documental (customers, orders)
- bcrypt para almacenar contraseñas de forma segura
- jsonwebtoken (emitir) y express-jwt (verificar) para la autenticación con JWT
- AccessControl para la autorización por roles (RBAC)
- ESLint para la calidad de código
- Jest y Supertest para las pruebas automatizadas

## Requisitos

- Node.js 20.19 o superior
- npm
- MySQL 8 (o MariaDB) y MongoDB en ejecución para `npm start`

## Instalación

```bash
git clone https://github.com/LF-Dguez/proyecto-Stride-Co.git
cd proyecto-Stride-Co
npm install
```

Crea un archivo `.env` a partir de `.env.example` y llena tus datos locales:

```bash
cp .env.example .env
```

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a MySQL (Sequelize) |
| `MONGO_URI` | Conexión a MongoDB (Mongoose) |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `BCRYPT_SALT_ROUNDS` | Autenticación (ver [Autenticación](#autenticación)) |
| `SEED_USER_PASSWORD` | Contraseña de los usuarios de prueba que crea el seed |

Si falta alguna variable de JWT, el servidor no arranca y muestra cuál falta.

`npm start` y `npm run dev` necesitan MySQL y MongoDB corriendo: al arrancar, el servidor se conecta a ambas, sincroniza las tablas y carga los permisos RBAC antes de aceptar peticiones. `npm test` no los necesita: las pruebas simulan las consultas a la base de datos.

Para poblar roles, permisos y usuarios de prueba (`admin@stride.co`, `sales@stride.co` y `user@stride.co`, con la contraseña de `SEED_USER_PASSWORD`):

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

Las pruebas están en la carpeta `test/` (un archivo por recurso) y verifican el código HTTP, la estructura de la respuesta, los errores (400, 404, 409), la autenticación (login, token y `/api/auth/me`) y los escenarios de autorización (ver [Control de acceso basado en roles](#control-de-acceso-basado-en-roles)). Ninguna prueba depende de que MySQL o MongoDB estén corriendo: las consultas a la base de datos se simulan con `jest.mock` y `jest.spyOn` (`test/helpers/`).

## Arquitectura

El flujo de cada solicitud es:

```
HTTP Request → Express → authenticate (JWT) → Route → authorize (RBAC) → Controller → Response
```

`authenticate` verifica el token y deja al usuario en `req.user`; cada ruta pasa por `authorize()` para comprobar el permiso y después llega al controlador, que procesa la solicitud y responde.

```
stride-co/
├── bin/www              arranque del servidor: conecta MySQL/MongoDB y carga RBAC
├── config/              conexión a MySQL (sequelize.js) y MongoDB (mongoose.js)
├── models/
│   ├── relationals/     modelos Sequelize (users, roles, permissions, products, variants, inventory)
│   └── documents/       modelos Mongoose (customers, orders)
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
├── .env.example         variables de entorno requeridas
└── package.json
```

- **Logging:** todas las solicitudes HTTP se registran con Morgan.
- **Errores:** bajo `/api` todos los errores responden JSON con la forma `{ "error": { "message": "...", "status": 404 } }`. Un error `500` responde `Error interno del servidor` y no expone el detalle.

## API

Todos los endpoints responden con `{ "message": "...", "data": ... }` y leen o escriben en la base de datos: MySQL para los recursos relacionales y MongoDB para `customers` y `orders`. Todos los recursos bajo `/api` requieren un token JWT (ver [Autenticación](#autenticación)) y están protegidos con RBAC (ver [Control de acceso basado en roles](#control-de-acceso-basado-en-roles)).

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
| `400` | Datos inválidos, ID mal formado, registro relacionado inexistente o body sin campos editables |
| `401` | Sin token, token inválido o expirado, o usuario inactivo |
| `403` | El rol del usuario no tiene el permiso requerido (RBAC) |
| `404` | El registro o la ruta no existe |
| `409` | Valor único repetido (email, sku, nombre de rol, key de permiso), registro en uso o rol con usuarios asignados |
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
| `hashPassword(password)` | `bcrypt.genSalt(BCRYPT_SALT_ROUNDS)` genera el `salt_key` y `bcrypt.hash(password, salt_key)` el `password_hash` |
| `verifyPassword(password, passwordHash)` | Compara con `bcrypt.compare` (nunca recalcula el hash para compararlo con `===`) |

- **Factor de costo:** se lee de `BCRYPT_SALT_ROUNDS` (por defecto `10`).
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
  -d '{"email":"admin@stride.co","password":"<tu SEED_USER_PASSWORD>"}'
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

El token se firma con `jwt.sign()` usando `HS256`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER` y `JWT_AUDIENCE`. Su payload lleva **solo** `sub` (el id del usuario), además de los campos estándar `iat`, `exp`, `iss` y `aud`:

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

El token expira según `JWT_EXPIRES_IN`, configurado en **15 minutos** (`15m`). Después hay que volver a hacer login.

### Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `JWT_SECRET` | (sin valor en el repositorio) | Clave para firmar y verificar los tokens |
| `JWT_EXPIRES_IN` | `15m` | Tiempo de expiración del token |
| `JWT_ISSUER` | `stride-co` | Emisor (`iss`) que se firma y se valida |
| `JWT_AUDIENCE` | `stride-co-api` | Audiencia (`aud`) que se firma y se valida |
| `BCRYPT_SALT_ROUNDS` | `10` | Factor de costo de bcrypt |

El valor real de `JWT_SECRET` nunca se sube al repositorio: `.env` está en `.gitignore` y `.env.example` lo deja vacío. Para generar uno local:

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
|---|---|---|---|
| users, roles, permissions · create/read/update/delete | any | — | — |
| products · read | any | any | any |
| products · create/update/delete | any | — | — |
| variants · read | any | any | any |
| variants · create/update/delete | any | — | — |
| inventory · read, update | any | any | — |
| inventory · create, delete | any | — | — |
| customers · create | any | any | — |
| customers · read, update | any | any | own |
| customers · delete | any | — | — |
| orders · create | any | any | any |
| orders · read, update | any | any | own |
| orders · delete | any | — | — |

Esta matriz coincide con los registros de `roles`, `permissions` y `role_permission` que siembra `npm run seed` (definidos en `seeders/rbacMatrix.js`) y con el comportamiento de la API: `GET /api/roles` la devuelve tal como está en la base de datos.

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

## Control de cambios

- Los commits siguen la especificación [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- El trabajo se hace en ramas por funcionalidad (por ejemplo `feat/...`, `test/...`) y se integra a `main` mediante Pull Request con merge commit.
- Cada actividad conserva su rama en el remoto después del merge: `feat/jwt-authentication` (Actividad 4) y `feat/rbac-authorization` (Tarea 6).
- No se suben `node_modules/` ni archivos `.env`; están incluidos en `.gitignore`.
