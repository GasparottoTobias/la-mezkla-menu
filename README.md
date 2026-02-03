# La Mezkla – Menú Digital con Panel Admin

## Descripción general

**La Mezkla** es un menú/carta digital pensado para ser accedido mediante código QR en un restaurante (La Mezkla Pub & Eventos). El proyecto incluye un **panel de administración protegido** que permite gestionar los productos del menú y, a futuro, sus categorías.

Está diseñado para **un solo local**, priorizando simplicidad y control.

---

## Objetivo del proyecto

* Mostrar un menú digital accesible desde QR
* Centralizar la gestión del menú en un panel admin interno
* Evitar backend propio usando Supabase como BaaS
* Mantener una base clara y extensible

---

## Stack tecnológico

### Frontend

* **Next.js** (App Router)
* **TypeScript**
* **Tailwind CSS**

### Backend / BaaS

* **Supabase**

  * Auth: Email + Password
  * Database: PostgreSQL
  * Row Level Security (RLS)

No existe backend propio: toda la lógica de datos y autenticación se maneja vía Supabase.

---

## Funcionalidades

### Implementadas

* Login de administrador
* Protección de la ruta `/admin`
* Panel de administración
* CRUD de productos
* Vista pública del menú

### Pendientes

* CRUD de categorías desde el panel
* Activar / desactivar productos desde el panel

---

## Modelo de datos

El modelo de datos actual está definido en Supabase mediante PostgreSQL.

### Categories

```sql
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  order_index int not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Products

```sql
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price int not null,
  image_url text,
  category_id uuid not null references categories(id) on delete restrict,
  order_index int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

> Nota: algunos campos como `description` o `image_url` no se usan actualmente en la UI, pero se mantienen como precedente para futuras extensiones sin afectar la funcionalidad actual.

---

## Seguridad

* El acceso al panel `/admin` está protegido mediante **Supabase Auth**
* Las tablas `categories` y `products` tienen **RLS habilitado**
* Solo el usuario administrador puede modificar datos
* Actualmente **no existe** aún una distinción entre productos activos/inactivos en la vista pública

---

## Estructura del proyecto

```
app/
 ├─ admin/        # Panel de administración
 ├─ login/        # Login de administrador
 ├─ page.tsx      # Vista pública del menú
 ├─ layout.tsx
 └─ globals.css

lib/
 ├─ supabase.ts   # Cliente Supabase
 └─ menu.ts       # Acceso a datos del menú
```

---

## Instalación y ejecución

1. Clonar el repositorio
2. Instalar dependencias:

```bash
npm install
```

3. Crear archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Ejecutar en desarrollo:

```bash
npm run dev
```

---

## Estado del proyecto

Proyecto **en desarrollo activo**, con foco en:

* Completar gestión de categorías
* Mejorar control de visibilidad de productos
* Refinar el panel de administración

---

## Público objetivo del README

Este README está pensado para:

* Otros desarrolladores
* El autor del proyecto a futuro (documentación técnica clara y sin relleno)
