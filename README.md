# Sistema 3LD — Guía de Desarrollo Local

## Requisitos
- XAMPP con Apache y MySQL activos
- Node.js 18+ / npm
- PHP 8.2 (incluido en XAMPP)

---

## Inicio Rápido

### 1. Iniciar XAMPP
Abrí XAMPP Control Panel y activá:
- ✅ Apache
- ✅ MySQL

### 2. Iniciar el Frontend (desarrollo con hot reload)
```bash
cd frontend
npm run dev
```
El frontend corre en: **http://localhost:5173**

La API se accede en: **http://localhost/sistema3ld/backend/public/api/v1**

### 3. Credenciales por defecto
- **Email:** admin@3ld.com.ar
- **Password:** password

---

## Estructura del Proyecto
```
sistema3ld/
├── frontend/           ← React App (npm run dev para desarrollo)
├── backend/            ← PHP REST API (servida por XAMPP Apache)
│   └── public/         ← Entry point de la API
├── database/
│   └── schema.sql      ← Schema MySQL completo
└── xampp-vhost.conf    ← Configuración Apache (opcional)
```

---

## Configuración de XAMPP (solo necesario una vez)

### Opción A: Sin VirtualHost (más simple — RECOMENDADA para desarrollo)

El backend se accede como:
`http://localhost/sistema3ld/backend/public/api/v1`

Para esto, el proyecto debe estar en `C:\xampp\htdocs\sistema3ld` o crear un symlink:
```powershell
# En PowerShell como Administrador
New-Item -ItemType SymbolicLink -Path "C:\xampp\htdocs\sistema3ld" -Target "C:\Proyectos\sistema3ld"
```

### Opción B: Con VirtualHost (más profesional)

1. Agregar al final de `C:\xampp\apache\conf\extra\httpd-vhosts.conf` el contenido de `xampp-vhost.conf`
2. Agregar a `C:\Windows\System32\drivers\etc\hosts`:
   ```
   127.0.0.1  sistema3ld.local
   ```
3. Reiniciar Apache en XAMPP

---

## Build para Producción (subir a Hostinger)

```bash
cd frontend
npm run build
```

Los archivos compilados quedan en `frontend/dist/`. Subir a Hostinger:
1. `frontend/dist/` → `public_html/`
2. `backend/` → `public_html/api/` (sin la carpeta vendor si la instalas en el servidor)
3. `database/schema.sql` → Importar en phpMyAdmin de Hostinger
4. Actualizar `backend/config/config.php` con credenciales de Hostinger

---

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost/sistema3ld/backend/public/api/v1
```

### Backend (`backend/config/config.php`)
Editar directamente el archivo con las credenciales MySQL.

---

## Comandos útiles

```bash
# Iniciar desarrollo frontend
cd frontend && npm run dev

# Build producción
cd frontend && npm run build

# Ver tablas MySQL
C:\xampp\mysql\bin\mysql.exe -u root sistema3ld -e "SHOW TABLES"

# Reinstalar DB (¡borra todo!)
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql
```
