"""
Builds the glpimod translations (locales/*.po, *.mo and glpimod.pot) without gettext tools.
Usage (from the plugin root):  python3 tools/i18n.py locales
Add new strings to the "es" dictionary below; the script fails if one is missing.
"""
import glob, re, struct, sys, os

ids = []
for f in sorted(glob.glob('**/*.php', recursive=True) + glob.glob('templates/*.twig')):
    for m in re.finditer(r"__\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'glpimod'\s*\)", open(f, encoding='utf-8').read()):
        t = m.group(1).replace("\\'", "'")
        if t not in ids:
            ids.append(t)
es = {
'GLPI Mod - Branding': 'GLPI Mod - Imagen de marca',
'Please activate the plugin': 'Por favor active el plugin',
'the file exceeds the maximum upload size of the server': 'el archivo supera el tamaño máximo de subida del servidor',
'invalid file': 'archivo no válido',
'Upload of %1$s failed: %2$s': 'No se pudo subir %1$s: %2$s',
'%1$s was rejected: only %2$s files are accepted': '%1$s fue rechazado: solo se aceptan archivos %2$s',
'%1$s was rejected: its content (%2$s) does not match the .%3$s extension': '%1$s fue rechazado: su contenido (%2$s) no corresponde a la extensión .%3$s',
'could not be saved': 'no se pudo guardar',
'Background video uploaded': 'Video de fondo cargado',
'Configuration saved': 'Configuración guardada',
'Background video removed: the login page now uses the background image': 'Video de fondo eliminado: el inicio de sesión ahora usa la imagen de fondo',
'Colour-specific logo removed: the main logo is used instead': 'Logo por color eliminado: se usa el logo principal',
'Small logo': 'Logo pequeño',
'Collapsed side menu': 'Menú lateral contraído',
'Medium logo': 'Logo mediano',
'Side menu and header': 'Menú lateral y encabezado',
'Large logo': 'Logo grande',
'Login page': 'Inicio de sesión',
'For light backgrounds': 'Para fondos claros',
'For dark backgrounds': 'Para fondos oscuros',
'User menu': 'Menú de usuario',
'Branding': 'Imagen de marca',
'Login background': 'Fondo del login',
'Disabled': 'Desactivado',
'Video': 'Video',
'Image': 'Imagen',
'Logos': 'Logos',
'Custom': 'Personalizado',
'Favicon': 'Favicon',
'Title and favicon': 'Título y favicon',
'Page title': 'Título de la página',
'Shown in the browser tab and as the application name.': 'Se muestra en la pestaña del navegador y como nombre de la aplicación.',
'Use custom favicon': 'Usar favicon personalizado',
'If disabled, the original GLPI favicon is restored.': 'Si se desactiva, se restaura el favicon original de GLPI.',
'ICO file, 16×16 or 32×32 px.': 'Archivo ICO de 16×16 o 32×32 px.',
'Preview': 'Vista previa',
'Customize the login page': 'Personalizar la página de inicio de sesión',
'Background image or video, and login box transparency.': 'Imagen o video de fondo, y transparencia de la caja de acceso.',
'Login box opacity': 'Opacidad de la caja de acceso',
'Transparent': 'Transparente',
'Solid': 'Sólida',
'Background video': 'Video de fondo',
'optional': 'opcional',
'Video uploaded': 'Video cargado',
'Remove the background video? The login page will use the background image.': '¿Eliminar el video de fondo? El inicio de sesión usará la imagen de fondo.',
'Remove video': 'Quitar video',
'The video is larger than %s. Every visitor downloads it when opening the login page; compress it (for example 1080p, 20-30 seconds, H.264) for a faster login.': 'El video pesa más de %s. Cada visitante lo descarga al abrir el inicio de sesión; comprímelo (por ejemplo 1080p, 20-30 segundos, H.264) para que cargue más rápido.',
'No video uploaded: the login page uses the background image.': 'No hay video cargado: el inicio de sesión usa la imagen de fondo.',
'MP4 (H.264), 1920×1080 recommended, ideally under 10 MB.': 'MP4 (H.264), se recomienda 1920×1080 y menos de 10 MB.',
'Server upload limit: %s.': 'Límite de subida del servidor: %s.',
'Background image': 'Imagen de fondo',
'Used when there is no video, and while the video loads.': 'Se usa cuando no hay video y mientras el video carga.',
'JPG, 1920×1080 recommended.': 'JPG, se recomienda 1920×1080.',
'Approximate preview. Changes are applied when you save.': 'Vista previa aproximada. Los cambios se aplican al guardar.',
'Use custom logos': 'Usar logos personalizados',
'If disabled, the original GLPI logos are restored. Uploaded files are kept.': 'Si se desactiva, se restauran los logos originales de GLPI. Los archivos cargados se conservan.',
'Main logo on light background': 'Logo principal sobre fondo claro',
'Main logo on dark background': 'Logo principal sobre fondo oscuro',
'Logos by colour (optional)': 'Logos por color (opcional)',
'in use': 'en uso',
'GLPI uses a different version of the logo depending on the background. Upload one only if the main logo does not look good there.': 'GLPI usa una versión distinta del logo según el fondo. Sube una solo si el logo principal no se ve bien en ese fondo.',
'Own file': 'Archivo propio',
'Uses main logo': 'Usa el logo principal',
'Remove this colour-specific logo and use the main logo instead?': '¿Quitar este logo por color y usar el logo principal?',
'Use main logo': 'Usar logo principal',
'Logos and favicon may need a hard refresh (Ctrl+F5) to show up.': 'Puede que los logos y el favicon necesiten recargar con Ctrl+F5 para verse.',
'Compressing the background video in the background. You can keep working; the login page keeps the current video until it finishes.': 'Comprimiendo el video de fondo en segundo plano. Puedes seguir trabajando; el inicio de sesión mantiene el video actual hasta que termine.',
'The video compression could not be started.': 'No se pudo iniciar la compresión del video.',
'The video is being compressed: wait for it to finish before uploading another one.': 'El video se está comprimiendo: espera a que termine antes de cambiarlo.',
'Video compressed: %1$s → %2$s. The login page already uses the new version.': 'Video comprimido: %1$s → %2$s. El inicio de sesión ya usa la nueva versión.',
'The video was already optimized: compressing it would not make it smaller, so the original was kept.': 'El video ya estaba optimizado: comprimirlo no lo hacía más liviano, así que se conservó el original.',
'The video could not be compressed. The original video was kept.': 'No se pudo comprimir el video. Se conservó el video original.',
'Compressing the video in the background…': 'Comprimiendo el video en segundo plano…',
'You can leave this page; the login page keeps the current video until it finishes.': 'Puedes salir de esta página; el inicio de sesión mantiene el video actual hasta que termine.',
'Compress the background video? It runs in the background and replaces the video only if the result is smaller.': '¿Comprimir el video de fondo? Se hace en segundo plano y solo reemplaza el video si el resultado es más liviano.',
'Compress': 'Comprimir',
'The video is larger than %s. Every visitor downloads it when opening the login page: use "Compress" to reduce it.': 'El video pesa más de %s. Cada visitante lo descarga al abrir el inicio de sesión: usa "Comprimir" para reducirlo.',
'To compress it from here, install ffmpeg on the server:': 'Para comprimirlo desde aquí, instala ffmpeg en el servidor:',
'Preparing the video compressor in the background. It takes about a minute.': 'Preparando el compresor de video en segundo plano. Tarda alrededor de un minuto.',
'The video compressor could not be prepared.': 'No se pudo preparar el compresor de video.',
'Preparing the video compressor in the background (downloading ffmpeg). Reload this page in a minute.': 'Preparando el compresor de video en segundo plano (descargando ffmpeg). Recarga esta página en un minuto.',
'The video compressor is not available: this server does not allow PHP to run external programs (exec).': 'El compresor de video no está disponible: este servidor no permite que PHP ejecute programas externos (exec).',
'The video compressor could not be downloaded (the server needs Internet access).': 'No se pudo descargar el compresor de video (el servidor necesita acceso a Internet).',
'The video compressor (ffmpeg) is not installed yet.': 'El compresor de video (ffmpeg) aún no está instalado.',
'Retry': 'Reintentar',
'Install compressor': 'Instalar compresor',
'Alternatively, install it on the server:': 'También puedes instalarlo en el servidor:',
'Self-service portal': 'Portal de autoservicio',
'Clock': 'Reloj',
'Show the real time on the clock of the illustration': 'Mostrar la hora real en el reloj de la ilustración',
'Replaces the fixed "9:00" with the current time of each user\'s device.': 'Reemplaza el "9:00" fijo por la hora actual del dispositivo de cada usuario.',
'12 hours (4:35)': '12 horas (4:35)',
'24 hours (16:35)': '24 horas (16:35)',
'Seasonal mode': 'Modo de temporada',
'Off': 'Desactivado',
'Automatic: Christmas from 1 December to 6 January': 'Automático: Navidad del 1 de diciembre al 6 de enero',
'Christmas (always on)': 'Navidad (siempre activo)',
'Christmas effects:': 'Efectos navideños:',
'Snow on the furniture, baubles on the plant and a gift': 'Nieve sobre los muebles, bolitas en la planta y un regalo',
'String of lights along the top': 'Guirnalda de luces en la parte superior',
'Gentle snowfall': 'Nieve cayendo suavemente',
'Animations are disabled for users who ask their system to reduce motion.': 'Las animaciones se desactivan para quienes configuraron su sistema para reducir el movimiento.',
'The clock and the furniture decoration apply to the default illustrations of the portal. If an entity uses other illustrations, only the lights and the snowfall are shown.': 'El reloj y la decoración de los muebles aplican a las ilustraciones predeterminadas del portal. Si una entidad usa otras ilustraciones, solo se muestran las luces y la nieve.',
'How can we help you?': '¿Cómo podemos ayudarte?',
'Automatic mode: the preview shows the Christmas decoration even outside the season.': 'Modo automático: la vista previa muestra la decoración navideña aunque no sea temporada.',
'Today: active, until 6 January': 'Hoy: activo, hasta el 6 de enero',
'Today: inactive · it turns on by itself on 1 December': 'Hoy: inactivo · se activa solo el 1 de diciembre',
'Active every day': 'Activo todos los días',
'Christmas and Día de las Velitas': 'Navidad y Día de las Velitas',
'1 December – 6 January (candles on 7 and 8 December)': '1 de diciembre – 6 de enero (velitas el 7 y 8 de diciembre)',
'Hay Festival and Cartagena Music Festival': 'Hay Festival y Festival de Música de Cartagena',
'7 – 31 January': '7 – 31 de enero',
'Fiestas de la Candelaria': 'Fiestas de la Candelaria',
'30 January – 2 February': '30 de enero – 2 de febrero',
'Barranquilla Carnival': 'Carnaval de Barranquilla',
'the 10 days before Ash Wednesday': 'los 10 días antes del Miércoles de Ceniza',
"Women's Day": 'Día de la Mujer',
'4 – 8 March': '4 – 8 de marzo',
'Holy Week (rest week)': 'Semana Santa (semana de descanso)',
'Palm Sunday to Easter Sunday': 'Domingo de Ramos a Domingo de Resurrección',
"Mother's Day": 'Día de la Madre',
'week of the 2nd Sunday of May': 'semana del 2.º domingo de mayo',
"Father's Day and mid-year holidays": 'Día del Padre y vacaciones de mitad de año',
'week of the 3rd Sunday of June': 'semana del 3.er domingo de junio',
'Independence of Colombia': 'Independencia de Colombia',
'14 – 20 July': '14 – 20 de julio',
'Kite season (Battle of Boyacá)': 'Temporada de cometas (Batalla de Boyacá)',
'August': 'agosto',
'Love and Friendship': 'Amor y Amistad',
'the two weeks up to the 3rd Saturday of September': 'las dos semanas hasta el 3.er sábado de septiembre',
"Halloween and Children's Day": 'Halloween y Día de los Niños',
'24 – 31 October': '24 – 31 de octubre',
'Independence of Cartagena': 'Independencia de Cartagena',
'1 – 15 November': '1 – 15 de noviembre',
'Seasonal themes': 'Temporadas',
'Automatic: follows the calendar of celebrations': 'Automático: sigue el calendario de celebraciones',
'Fixed theme (every day)': 'Tema fijo (todos los días)',
'Today: %s': 'Hoy: %s',
'Today: no celebration · next: %1$s, from %2$s': 'Hoy: ninguna celebración · próxima: %1$s, desde el %2$s',
'Celebrations included in the automatic calendar:': 'Celebraciones incluidas en el calendario automático:',
'Effects of the themes:': 'Efectos de las temporadas:',
'Decoration on the illustration': 'Adornos sobre la ilustración',
'Garland, pennants or lights along the top': 'Guirnalda, banderines o luces en la parte superior',
'Animated effect (snow, confetti, petals, hearts...)': 'Efecto animado (nieve, confeti, pétalos, corazones...)',
'Show in the preview:': 'Ver en la vista previa:',
'GLPI page': 'Página de GLPI',
'External link': 'Enlace externo',
'Form': 'Formulario',
'%d texts of the self-service portal updated': 'Se actualizaron %d textos del portal de autoservicio',
'The custom texts could not be saved: check the permissions of the files folder of GLPI.': 'No se pudieron guardar los textos personalizados: revise los permisos de la carpeta files de GLPI.',
'Custom GLPI texts saved for %1$s: %2$d': 'Textos personalizados de GLPI guardados para %1$s: %2$d',
'Texts': 'Textos',
'Tiles of the self-service home page': 'Tarjetas del inicio del portal de autoservicio',
'Use all the suggestions': 'Usar todas las sugerencias',
'GLPI saves these texts in the database when it creates the tiles, in the language used at that moment, so the language files do not translate them. Edit them here; the changes apply to everyone.': 'GLPI guarda estos textos en la base de datos al crear las tarjetas, en el idioma que se usaba en ese momento, por eso los archivos de idioma no los traducen. Edítelos aquí; los cambios aplican para todos.',
'No tiles found (GLPI 11 or later is needed).': 'No se encontraron tarjetas (se necesita GLPI 11 o posterior).',
'Tile': 'Tarjeta',
'Use suggestion': 'Usar sugerencia',
'Suggestion:': 'Sugerencia:',
'Form tiles show the name and description of the form: changing them here also changes them in the service catalog. If a tile has a translation for the user language (Setup > General > Helpdesk translations), that translation is shown instead.': 'Las tarjetas de formulario muestran el nombre y la descripción del formulario: cambiarlos aquí también los cambia en el catálogo de servicios. Si una tarjeta tiene traducción para el idioma del usuario (Configuración > General > Traducciones del helpdesk), se muestra esa traducción.',
'GLPI interface texts': 'Textos de la interfaz de GLPI',
'Replace any text of GLPI that is untranslated or badly translated. The changes are kept apart from GLPI, so they survive its updates, and stop applying if the plugin is disabled.': 'Reemplace cualquier texto de GLPI que esté sin traducir o mal traducido. Los cambios se guardan aparte de GLPI, así que se conservan al actualizarlo, y dejan de aplicar si se desactiva el plugin.',
'Suggested corrections': 'Correcciones sugeridas',
'the GLPI translation has texts that do not fit this language (for example the "voseo": "Solicitá", "Usá").': 'la traducción de GLPI tiene textos que no corresponden a este idioma (por ejemplo el voseo: "Solicitá", "Usá").',
'Add %d corrections': 'Agregar %d correcciones',
'Search a text as you see it in GLPI (in English or in the translation)...': 'Busque un texto tal como lo ve en GLPI (en inglés o en la traducción)...',
'No custom texts yet: search for a text above to change it.': 'Aún no hay textos personalizados: busque un texto arriba para cambiarlo.',
'Remove': 'Quitar',
'Singular': 'Singular',
'Plural': 'Plural',
'(untranslated)': '(sin traducir)',
'No texts found': 'No se encontraron textos',
'Change': 'Cambiar',
'Already in the list': 'Ya está en la lista',
'Original text (English)': 'Texto original (inglés)',
'Current GLPI translation': 'Traducción actual de GLPI',
'Your text': 'Su texto',
'Changes apply when you press Save. Texts of other plugins are not included.': 'Los cambios se aplican al pulsar Guardar. No incluye los textos de otros plugins.',
}
missing = [i for i in ids if i not in es]
if missing:
    sys.exit('Missing: %r' % missing)

def po_escape(s):
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

def write_po(path, lang, trans):
    out = ['msgid ""', 'msgstr ""',
           '"Project-Id-Version: glpimod\\n"',
           '"Content-Type: text/plain; charset=UTF-8\\n"',
           '"Content-Transfer-Encoding: 8bit\\n"',
           f'"Language: {lang}\\n"' if lang else '"Language: \\n"',
           '"Plural-Forms: nplurals=2; plural=(n != 1);\\n"', '']
    for i in ids:
        out += [f'msgid "{po_escape(i)}"', f'msgstr "{po_escape(trans.get(i, ""))}"', '']
    open(path, 'w', encoding='utf-8').write('\n'.join(out))

def write_mo(path, lang, trans):
    header = ('Project-Id-Version: glpimod\nContent-Type: text/plain; charset=UTF-8\n'
              'Content-Transfer-Encoding: 8bit\nLanguage: %s\nPlural-Forms: nplurals=2; plural=(n != 1);\n' % lang)
    entries = {'': header}
    entries.update({i: trans[i] for i in ids})
    keys = sorted(entries)
    kb = [k.encode('utf-8') for k in keys]
    vb = [entries[k].encode('utf-8') for k in keys]
    n = len(keys)
    off_k = 7 * 4
    off_v = off_k + n * 8
    data_start = off_v + n * 8
    kdata = b''; ktab = []
    for b in kb:
        ktab.append((len(b), data_start + len(kdata))); kdata += b + b'\0'
    vstart = data_start + len(kdata)
    vdata = b''; vtab = []
    for b in vb:
        vtab.append((len(b), vstart + len(vdata))); vdata += b + b'\0'
    out = struct.pack('<7I', 0x950412de, 0, n, off_k, off_v, 0, 0)
    for l, o in ktab: out += struct.pack('<2I', l, o)
    for l, o in vtab: out += struct.pack('<2I', l, o)
    out += kdata + vdata
    open(path, 'wb').write(out)

base = sys.argv[1]
write_po(os.path.join(base, 'glpimod.pot'), '', {})
for lang in ['es_ES', 'es_MX', 'es_CO', 'es_419']:
    write_po(os.path.join(base, lang + '.po'), lang, es)
    write_mo(os.path.join(base, lang + '.mo'), lang, es)
print('ok', len(ids))
