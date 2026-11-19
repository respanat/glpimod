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
- **Opacidad de la caja de login** configurable.
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

La configuración está en **Configuración → Plugins → GLPI Mod** (botón de configuración) y tiene tres pestañas:

- **Título y favicon**: texto de la pestaña del navegador y favicon (.ico), con vista previa.
- **Inicio de sesión**: activar la personalización, opacidad de la caja (0.05 transparente – 1 sólida), video de fondo (.mp4, recomendado 1920×1080 y menos de 10 MB) e imagen de fondo (.jpg). Vista previa en vivo.
- **Logos**: logo pequeño, mediano y grande (.png), vistos sobre fondo claro y oscuro; y, opcionalmente, un archivo distinto por color.

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
