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
