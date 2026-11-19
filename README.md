# glpimod — GLPI Mod

Plugin para GLPI 11 y 12 que permite personalizar la imagen de marca de la instancia: logos, favicon, título de la página y fondo del login (imagen o video), con mejoras de usabilidad sobre el plugin original.

> [!NOTE]
> **Aviso / Disclaimer:** este proyecto es una derivación (fork) de
> [**UI Branding** de i-Vertix](https://github.com/i-Vertix/glpi-modifications)
> (a su vez derivado de [stdonato/glpi-modifications](https://github.com/stdonato/glpi-modifications)).
> Se basa en su código, agrega funciones nuevas y mejora otras.
> Se distribuye bajo la misma licencia **GPLv3** y conserva los créditos de copyright de los autores originales.
> No está afiliado a i-Vertix ni al proyecto GLPI.

## Funcionalidades

Del plugin original:
- Logos personalizados (pequeño, mediano y grande).
- Favicon personalizado.
- Título de la página (pestaña del navegador).
- Imagen de fondo en la página de login.

Agregado en glpimod:
- **Video de fondo en el login** (MP4, opcional), con botón para quitarlo y aviso cuando pesa demasiado. Si no hay video se usa la imagen JPG.
- **Compresión del video desde la configuración**: botón *Comprimir* que reduce el video (máx. 1080p, H.264, sin audio) en segundo plano y con baja prioridad, con barra de progreso. Solo reemplaza el video si el resultado es más liviano. El plugin prepara `ffmpeg` automáticamente (ver abajo).
- **Opacidad de la caja de login** configurable.
- **Portal de autoservicio** ("¿Cómo podemos ayudarte?"):
  - el reloj de la ilustración muestra la **hora real** (12 o 24 horas) en lugar del "9:00" fijo, con el mismo estilo de píxeles y los colores del tema;
  - **modo Navidad** (siempre o automático del 1 de diciembre al 6 de enero): nieve sobre los muebles, bolitas en la planta, un regalo, guirnalda de luces y nieve cayendo suavemente; cada efecto se puede desactivar y las animaciones respetan la preferencia de "reducir movimiento" del sistema.
- **Logos por color**: GLPI usa una versión del logo para fondos claros, otra para fondos oscuros y otra para el menú de usuario; se puede subir una distinta para cada caso (opcional).
- **Página de configuración rediseñada**: pestañas, estado actual de cada elemento y vista previa del login, del título y del favicon antes de guardar.
- Traducción al español (es_CO, es_ES, es_MX, es_419).
- Validación del contenido real de los archivos cargados (no solo la extensión).
- Funciona instalado en `plugins` o en `marketplace`.
- Identificador propio (`glpimod`) para que pueda convivir con el plugin original.

## Compatibilidad

| GLPI | PHP |
|------|-----|
| 11.0 – 12.x | ≥ 8.2 |

### Requisito opcional: ffmpeg (compresión del video)

No hay que instalar nada a mano. Al pulsar **Instalar** o **Actualizar** el plugin en GLPI:

1. Si el servidor ya tiene `ffmpeg` (por ejemplo `/usr/bin/ffmpeg`), se usa ese.
2. Si no, el plugin descarga en segundo plano una versión portátil de `ffmpeg` en
   `files/_plugins/glpimod/bin/` (sin permisos de administrador y sin bloquear el botón de GLPI):
   primero desde [johnvansickle.com](https://johnvansickle.com/ffmpeg/) (verificada con MD5) y,
   si falla, desde [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) (verificada con SHA-256).
   El ejecutable se prueba antes de usarlo. Tarda alrededor de un minuto.

Necesita que el servidor tenga salida a Internet, `curl` o `wget`, `tar` y `xz` (presentes por defecto en Debian/Ubuntu)
y que PHP pueda ejecutar programas (`exec`). Si la descarga falla, la configuración muestra un botón para reintentar,
o se puede instalar en el sistema con `sudo apt install ffmpeg`. Sin `ffmpeg`, todo lo demás funciona igual.
Al desinstalar el plugin se borra también la copia portátil.

## Instalación

1. Descargar o clonar este repositorio dentro de la carpeta `plugins` (o `marketplace`) de GLPI. **La carpeta debe llamarse `glpimod`.**

   ```shell
   cd /var/www/glpi/plugins
   git clone https://github.com/respanat/glpimod.git glpimod
   ```

2. Ajustar permisos (cambiar `www-data` por el usuario del servidor web y la ruta de GLPI según corresponda):

   ```shell
   chown -R www-data: /var/www/glpi/public/pics
   chown -R www-data: /var/www/glpi/plugins/glpimod
   find /var/www/glpi/plugins/glpimod -type f -exec chmod 0644 {} \;
   find /var/www/glpi/plugins/glpimod -type d -exec chmod 0755 {} \;
   ```

   El plugin reemplaza los logos y el favicon en `public/pics` (con copia de respaldo), por eso necesita permiso de escritura ahí.

3. Entrar a GLPI con un super-admin → **Configuración → Plugins** → instalar y activar **GLPI Mod**.

4. Configurar desde el botón de configuración del plugin.

> [!IMPORTANT]
> Si vienes del plugin original (`mod`), desactívalo y desinstálalo antes de activar `glpimod`: ambos modifican los mismos logos y el favicon. Las imágenes personalizadas no se migran; vuelve a cargarlas desde la configuración de glpimod.

## Uso

La configuración está en **Configuración → Plugins → GLPI Mod** (botón de configuración) y tiene cuatro pestañas:

- **Título y favicon**: texto de la pestaña del navegador y favicon (.ico), con vista previa.
- **Inicio de sesión**: activar la personalización, opacidad de la caja (0.05 transparente – 1 sólida), video de fondo (.mp4, recomendado 1920×1080 y menos de 10 MB) e imagen de fondo (.jpg). Vista previa en vivo.
- **Logos**: logo pequeño, mediano y grande (.png), vistos sobre fondo claro y oscuro; y, opcionalmente, un archivo distinto por color.
- **Portal de autoservicio**: reloj con la hora real y modo de temporada, con vista previa.

> [!TIP]
> Al actualizar el plugin con `git pull`, si cambia la versión, GLPI lo marca como "pendiente de actualizar" y deja de aplicarlo
> hasta que en **Configuración → Plugins** se pulse **Actualizar** y luego **Activar**. La configuración y las imágenes se conservan.

### Traducciones

Los textos están en inglés y se traducen desde `locales/`. Para regenerar los archivos después de cambiar textos:

```shell
python3 tools/i18n.py locales
```

Los archivos cargados se guardan en `files/_plugins/glpimod/` (fuera de la carpeta del plugin).

## Uso con SAML SSO (plugin samlsso)

El plugin **samlsso** guarda como destino post-login la última URL que el navegador pidió antes de iniciar sesión.
El video de fondo se sigue descargando mientras el login está abierto, así que después de autenticarse
el usuario puede terminar en `.../background.php?type=video` en lugar del inicio de GLPI.

Solución: en la configuración de samlsso, agregar una **exclusión** con la ruta:

```
/plugins/glpimod/background.php
```

y la acción *excluir / no aplicar SAML*. Esa URL solo entrega el fondo del login (es pública de todas formas),
por lo que excluirla no expone nada.

## Licencia

GPLv3 — ver [LICENSE.txt](LICENSE.txt) y [COPYRIGHT](COPYRIGHT).

- Copyright (C) 2025-2026 i-Vertix/PGUM — plugin original *UI Branding*.
- Copyright (C) 2026 Ramiro España — modificaciones de glpimod.
