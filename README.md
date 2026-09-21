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

No se requiere archivo `.env` en esta etapa. El puerto por defecto es `3000` y se puede cambiar con la variable de entorno `PORT`.

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

Las pruebas están en la carpeta `test/` (un archivo por recurso) y verifican el código HTTP, la estructura básica de la respuesta y el manejo de rutas inexistentes. En esta etapa se trabaja con datos mock.

## Arquitectura

El flujo de cada solicitud es:

```
HTTP Request → Express → Route → Controller → Response (mock)
```

Las rutas definen los endpoints y dirigen la solicitud al controlador; los controladores procesan la solicitud y responden.

```
stride-co/
├── bin/www              arranque del servidor
├── controllers/         lógica de cada recurso (respuestas mock)
├── routes/              endpoints de cada recurso
├── test/                pruebas automatizadas
├── public/              archivos estáticos
├── views/               vistas Pug
├── app.js               configuración de Express, logging y manejo de errores
├── eslint.config.js     configuración de ESLint
└── package.json
```

- **Logging:** todas las solicitudes HTTP se registran con Morgan.
- **Rutas inexistentes:** responden `404`. Bajo `/api` la respuesta es JSON: `{ "error": { "message": "...", "status": 404 } }`.

## API

Todos los endpoints responden con `{ "message": "...", "data": ... }`. Por ahora los datos son mock; la persistencia (ORM/ODM), la autenticación y las reglas de negocio se agregan en las siguientes etapas.

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

## Control de cambios

- Los commits siguen la especificación [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- El trabajo se hace en ramas por funcionalidad (por ejemplo `feat/...`, `test/...`) y se integra a `main` mediante Pull Request.
- No se suben `node_modules/` ni archivos `.env`; están incluidos en `.gitignore`.
