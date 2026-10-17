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
- AccessControl para la autorización por roles (RBAC)
- ESLint para la calidad de código
- Jest y Supertest para las pruebas automatizadas

## Requisitos

- Node.js 20.19 o superior
- npm

## Instalación

```bash
git clone https://github.com/LF-Dguez/proyecto-Stride-Co.git
cd proyecto-Stride-Co
npm install
```

Crea un archivo `.env` a partir de `.env.example` con los datos de conexión a MySQL y MongoDB:

```bash
cp .env.example .env
```

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a MySQL (Sequelize) |
| `MONGO_URI` | Conexión a MongoDB (Mongoose) |

`npm start` y `npm run dev` necesitan MySQL y MongoDB corriendo: al arrancar, el servidor se conecta a ambas, sincroniza las tablas y carga los permisos RBAC antes de aceptar peticiones. `npm test` no los necesita: las pruebas simulan las consultas a la base de datos.

Para poblar roles, permisos y usuarios de prueba:

```bash
node seeders/seedRbac.js
```

## Ejecución

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el servidor en `http://localhost:3000` |
| `npm run dev` | Inicia el servidor con recarga automática (nodemon) |
| `npm run lint` | Revisa el código con ESLint |
| `npm test` | Ejecuta las pruebas automatizadas |

Para comprobar que el servidor responde, con `npm start` en ejecución abre `http://localhost:3000/api/products`.

## Pruebas y calidad de código

```bash
npm run lint
npm test
```

Las pruebas están en la carpeta `test/` (un archivo por recurso) y verifican el código HTTP, la estructura básica de la respuesta, el manejo de rutas inexistentes y, para los recursos protegidos, los escenarios de autorización (ver [Control de acceso basado en roles](#control-de-acceso-basado-en-roles)). Ninguna prueba depende de que MySQL o MongoDB estén corriendo: las consultas a la base de datos se simulan.

## Arquitectura

El flujo de cada solicitud es:

```
HTTP Request → Express → Route → Middleware RBAC (authorize) → Controller → Response
```

Las rutas definen los endpoints, pasan por `authorize()` cuando el recurso está protegido, y dirigen la solicitud al controlador; los controladores procesan la solicitud y responden.

```
stride-co/
├── bin/www              arranque del servidor: conecta MySQL/MongoDB y carga RBAC
├── config/              conexión a MySQL (sequelize.js) y MongoDB (mongoose.js)
├── models/
│   ├── relationals/     modelos Sequelize (users, roles, permissions, products, variants, inventory)
│   └── documents/       modelos Mongoose (customers, orders)
├── controllers/         lógica de cada recurso
├── routes/              endpoints de cada recurso
├── middlewares/         authorize.js: middleware de autorización RBAC
├── services/            rbac.js: carga los permisos desde la BD y arma el AccessControl
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
- **Rutas inexistentes:** responden `404`. Bajo `/api` la respuesta es JSON: `{ "error": { "message": "...", "status": 404 } }`.

## API

Todos los endpoints responden con `{ "message": "...", "data": ... }`. La mayoría de los recursos siguen usando datos mock; `orders` ya usa persistencia real (MongoDB) para resolver a quién pertenece cada orden. Siete de los ocho recursos están protegidos con RBAC (ver abajo); `/api/customers` todavía no. La autenticación (JWT) y las reglas de negocio completas se agregan en las siguientes etapas.

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

Ejemplo:

```
GET /api/products
```

```json
{
  "message": "GET productos obtenido exitosamente",
  "data": [
    { "id": 1, "category_id": 10, "name": "Tenis Runner Pro", "brand": "Stride", "price": 1299.99, "active": true }
  ]
}
```

## Control de acceso basado en roles

El proyecto implementa RBAC (Role-Based Access Control) con la librería [`accesscontrol`](https://www.npmjs.com/package/accesscontrol), usando como fuente de verdad las tablas `Role`, `Permission` y `Role_Permission` del modelo relacional. No hay permisos escritos en el código.

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

La definición vive en `seeders/rbacMatrix.js` y se siembra en la base de datos con `node seeders/seedRbac.js`.

### Endpoints protegidos

| Recurso | Protegido | Alcance |
|---|---|---|
| `/api/users` | Sí | `any` |
| `/api/roles` | Sí | `any` |
| `/api/permissions` | Sí | `any` |
| `/api/products` | Sí | `any` |
| `/api/variants` | Sí | `any` |
| `/api/inventory` | Sí | `any` |
| `/api/orders` | Sí | `own` en lectura/actualización, `any` en creación/eliminación |
| `/api/customers` | No todavía | — |

### Ejemplo de permiso `any`

Cualquiera con `products:delete:any` (solo `admin`) puede eliminar cualquier producto:

```js
router.delete('/:id', authorize('products', 'delete', 'any'), controller.delete);
```

### Ejemplo de permiso `own`

En `orders`, `own` no basta con el rol: se compara al dueño real del recurso contra el usuario autenticado (`Order.customerId → Customer.userId`). Un `resolver` hace esa comprobación antes de dejar pasar la petición:

```js
router.get('/:id', authorize('orders', 'read', 'own', controller.resolveOwner), controller.getById);
```

Con esto, un usuario con rol `user` puede consultar sus propias órdenes (200) pero recibe `403 Forbidden` al intentar consultar la de otra persona. En el listado (`GET /api/orders`), el alcance `own` se aplica dentro del controller, filtrando por los clientes del usuario autenticado.

### Cómo se cargan los permisos desde la base de datos

Al arrancar el servidor (`bin/www`), `services/rbac.js` consulta `Role` con sus `Permission` relacionados vía `Role_Permission`, separa cada `key` en `resource`/`action`/`possession`, y construye una instancia de `AccessControl` que queda en memoria para todas las peticiones:

```
Role → Role_Permission → Permission  →  services/rbac.js (loadAccessControl)  →  AccessControl
```

El middleware `middlewares/authorize(resource, action, possession, ownerResolver?)` usa esa instancia en cada petición: si el usuario autenticado no tiene el permiso, responde `403 Forbidden`; si no hay usuario autenticado, `401 Unauthorized`.

## Control de cambios

- Los commits siguen la especificación [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- El trabajo se hace en ramas por funcionalidad (por ejemplo `feat/...`, `test/...`) y se integra a `main` mediante Pull Request.
- No se suben `node_modules/` ni archivos `.env`; están incluidos en `.gitignore`.
