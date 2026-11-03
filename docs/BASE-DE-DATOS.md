# Base de datos y panel de administración (Supabase)

La web funciona sin base de datos (wiki, facciones y fotos son contenido propio). La base de datos añade:
panel `/admin`, catálogo comercial de miniaturas, eventos con inscripción, centro de descargas y artículos propios.

**Por qué Supabase y no la base de datos de Hostinger:** el proyecto usa PostgreSQL con usuarios, permisos por fila y
almacenamiento de archivos de Supabase. Hostinger ofrece MySQL, que no es compatible. El plan gratuito de Supabase basta para empezar.

## 1. Crear el proyecto (5 min)
1. Entra en https://supabase.com, crea una cuenta y pulsa **New project**.
2. Elige una región europea (por ejemplo *Frankfurt*) y guarda la contraseña de la base de datos en un lugar seguro.

## 2. Crear las tablas
1. En el proyecto: **SQL Editor → New query**.
2. Abre `supabase/setup.sql`, copia **todo** su contenido, pégalo y pulsa **Run**. Debe terminar sin errores (se ejecuta una sola vez).
3. Esto crea 20 tablas, los permisos, el flujo editorial, las 4 facciones, las 12 categorías de la wiki y el almacén de archivos `media`.

## 3. Crear tu usuario administrador
1. **Authentication → Users → Add user → Create new user**: tu correo y una contraseña larga. Marca *Auto Confirm User*.
2. De vuelta en **SQL Editor**, ejecuta (cambia el correo):

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu@correo.com');
```

Roles: `admin` (todo, publica y elimina), `editor` (crea y edita, envía a revisión), `reviewer` (aprueba).
Para más usuarios: créalos igual y cambia su rol con la misma sentencia.

## 4. Copiar las claves
**Project Settings → API**. Necesitas solo dos:
- **Project URL** (`https://xxxx.supabase.co`)
- **anon public key**

La clave `service_role` **no** va en esa lista pública. Solo la necesita la tienda (para crear pedidos y confirmar pagos) y se guarda como variable secreta de servidor `SUPABASE_SERVICE_ROLE_KEY`; ver `TIENDA.md`. Sin tienda, no la uses.

## 5. Ponerlas en Hostinger y volver a desplegar
En la aplicación Node.js de Hostinger → **Variables de entorno**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon public key |
| `NEXT_PUBLIC_SITE_URL` | `https://tu-dominio.com` |

Después **vuelve a desplegar**: estas variables se incrustan al compilar, así que hay que recompilar para que surtan efecto.

## 6. Avisar a Supabase del dominio
**Authentication → URL Configuration → Site URL**: `https://tu-dominio.com`.

## 7. Probar
- Entra en `https://tu-dominio.com/admin/login` con tu correo y contraseña.
- Crea un artículo o un evento, pásalo a **Publicado** y mira que aparece en la web pública.

## Seguridad
- Cada tabla tiene permisos por fila (RLS): el público solo ve lo publicado.
- Los cambios de estado los hace cumplir la propia base de datos según el rol.
- Las inscripciones a eventos no pueden superar el aforo.
- Activa las copias de seguridad diarias en Supabase (planes de pago) o exporta el esquema y los datos de forma periódica.
- Antes de lanzar, añade limitación de peticiones a la inscripción (Cloudflare o WAF del hosting).
