<?php

/**
 * -------------------------------------------------------------------------
 * glpimod - GLPI Mod (based on "UI Branding plugin for GLPI" by i-Vertix)
 * -------------------------------------------------------------------------
 *
 * LICENSE
 *
 * This file is part of glpimod, a derivative work of "UI Branding plugin for GLPI".
 *
 * "UI Branding plugin for GLPI" is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * "UI Branding plugin for GLPI" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "UI Branding plugin for GLPI". If not, see <http://www.gnu.org/licenses/>.
 * -------------------------------------------------------------------------
 * @copyright Copyright (C) 2025-2026 by i-Vertix/PGUM (original plugin).
 * @copyright Copyright (C) 2026 by Ramiro España (glpimod modifications).
 * @license   GPLv3 https://www.gnu.org/licenses/gpl-3.0.html
 * @link      https://github.com/respanat/glpimod
 * @link      https://github.com/i-Vertix/glpi-modifications (original)
 * -------------------------------------------------------------------------
 */

namespace GlpiPlugin\Glpimod;

use Glpi\Cache\CacheManager;
use Session;
use Toolbox;

if (!defined('GLPI_ROOT')) {
    die("Sorry. You can't access directly to this file");
}

/**
 * Text corrections:
 *  - helpdesk tiles and default forms whose title/description were stored in English (or with
 *    regional wording) when GLPI 11 created them: they are data, so the language files never reach them;
 *  - overrides of GLPI core strings, published in GLPI_LOCAL_I18N_DIR/core_glpimod/<lang>.php,
 *    a folder that GLPI itself loads after its own translations (survives GLPI upgrades).
 */
class TextFixer
{
    /** Master copy of the overrides (kept even when the plugin is disabled) */
    public const OVERRIDES_DIR = BrandManager::FILES_DIR . "/texts";
    /** Folder name inside GLPI_LOCAL_I18N_DIR: GLPI only loads "core" or "core_*" */
    public const PUBLISH_FOLDER = "core_glpimod";

    private const CONTEXT_SEPARATOR = "\x04";
    private const SEARCH_LIMIT = 40;

    /**
     * Neutral Spanish for the texts GLPI writes in the default tiles and forms
     * (English originals and known regional variants). Keys are compared case-insensitively.
     */
    private const TILE_SUGGESTIONS_ES = [
        'browse help articles' => 'Consultar artículos de ayuda',
        'explorar artículos de ayuda' => 'Consultar artículos de ayuda',
        'see all available help articles and our faq.' => 'Revisa los artículos de ayuda y las preguntas frecuentes.',
        'create a ticket' => 'Crear un ticket',
        'go to our service catalog and pick a form to create a new ticket.' => 'Entra al catálogo de servicios y elige un formulario para crear un ticket.',
        'see your tickets' => 'Mis tickets',
        'ver sus tickets' => 'Mis tickets',
        'view all the tickets that you have created.' => 'Consulta todos los tickets que has creado.',
        'make a reservation' => 'Crear reservación',
        'pick an available asset and reserve it for a given date.' => 'Elige un equipo disponible y resérvalo para una fecha.',
        'report an issue' => 'Reportar un problema',
        'ask for support from our helpdesk team.' => 'Solicita soporte a nuestra mesa de ayuda.',
        'solicitá soporte a nuestro equipo de mesa de ayuda.' => 'Solicita soporte a nuestra mesa de ayuda.',
        'request a service' => 'Solicitar un servicio',
        'ask for a service to be provided by our team.' => 'Solicita la prestación de un servicio a nuestro equipo.',
        'solicitá la prestación de un servicio a nuestro equipo.' => 'Solicita la prestación de un servicio a nuestro equipo.',
    ];

    /**
     * Built-in corrections of GLPI core strings for Spanish (msgid => text).
     * Today they replace the "voseo" (Argentinian wording) that slipped into es_MX.
     */
    private const CORE_SUGGESTIONS_ES = [
        'Ask for support from our helpdesk team.' => 'Solicita soporte a nuestra mesa de ayuda.',
        'Ask for a service to be provided by our team.' => 'Solicita la prestación de un servicio a nuestro equipo.',
        'Use a backup code' => 'Usa un código de respaldo',
    ];

    /** Spanish variants that use "tú/usted" (the corrections must not be offered for es_AR) */
    private const NEUTRAL_SPANISH = ['es_MX', 'es_419', 'es_CO', 'es_ES', 'es_EC', 'es_VE', 'es_CL', 'es_PE'];

    /** @var array<string, array<string, string>> parsed .mo files */
    private static array $catalogs = [];
    /** @var array<string, array<string, string>> singular key => full plural key */
    private static array $plurals = [];

    // ------------------------------------------------------------------
    // Helpdesk tiles and forms
    // ------------------------------------------------------------------

    /**
     * Tiles of the self-service home page with their texts and a suggestion when one is known.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getTiles(): array
    {
        global $DB;

        $suggest = str_starts_with((string) ($_SESSION['glpilanguage'] ?? ''), 'es_')
            && ($_SESSION['glpilanguage'] ?? '') !== 'es_AR';
        $owners = self::getTileOwners();
        $tiles = [];

        $tables = [
            'glpipage' => ['table' => 'glpi_helpdesks_tiles_glpipagetiles', 'class' => 'Glpi\\Helpdesk\\Tile\\GlpiPageTile', 'label' => __('GLPI page', 'glpimod')],
            'externalpage' => ['table' => 'glpi_helpdesks_tiles_externalpagetiles', 'class' => 'Glpi\\Helpdesk\\Tile\\ExternalPageTile', 'label' => __('External link', 'glpimod')],
        ];
        foreach ($tables as $type => $meta) {
            if (!$DB->tableExists($meta['table'])) {
                continue;
            }
            foreach ($DB->request(['FROM' => $meta['table'], 'ORDER' => 'id']) as $row) {
                $tiles[] = self::tileEntry($type, (int) $row['id'], $meta['label'],
                    (string) ($row['title'] ?? ''), (string) ($row['description'] ?? ''),
                    $owners[$meta['class']][(int) $row['id']] ?? [], $suggest);
            }
        }

        // Form tiles show the name and description of the form
        if ($DB->tableExists('glpi_helpdesks_tiles_formtiles') && $DB->tableExists('glpi_forms_forms')) {
            $done = [];
            $request = $DB->request([
                'SELECT' => ['glpi_helpdesks_tiles_formtiles.id AS tile_id', 'glpi_forms_forms.id', 'glpi_forms_forms.name', 'glpi_forms_forms.description'],
                'FROM' => 'glpi_helpdesks_tiles_formtiles',
                'INNER JOIN' => [
                    'glpi_forms_forms' => ['ON' => ['glpi_helpdesks_tiles_formtiles' => 'forms_forms_id', 'glpi_forms_forms' => 'id']],
                ],
                'ORDER' => 'glpi_helpdesks_tiles_formtiles.id',
            ]);
            foreach ($request as $row) {
                $formId = (int) $row['id'];
                $tileOwners = $owners['Glpi\\Helpdesk\\Tile\\FormTile'][(int) $row['tile_id']] ?? [];
                if (isset($done[$formId])) {
                    // same form in several tiles: one row, all the owners
                    $tiles[$done[$formId]]['owners'] = array_values(array_unique(array_merge($tiles[$done[$formId]]['owners'], $tileOwners)));
                    continue;
                }
                $done[$formId] = count($tiles);
                $tiles[] = self::tileEntry('form', $formId, __('Form', 'glpimod'),
                    (string) ($row['name'] ?? ''), self::htmlToText((string) ($row['description'] ?? '')),
                    $tileOwners, $suggest);
            }
        }

        return $tiles;
    }

    private static function tileEntry(string $type, int $id, string $label, string $title, string $description, array $owners, bool $suggest): array
    {
        $sTitle = $suggest ? self::suggestTile($title) : null;
        $sDescription = $suggest ? self::suggestTile($description) : null;
        return [
            'type' => $type,
            'id' => $id,
            'label' => $label,
            'title' => $title,
            'description' => $description,
            'owners' => $owners,
            'suggested_title' => $sTitle,
            'suggested_description' => $sDescription,
            'has_suggestion' => $sTitle !== null || $sDescription !== null,
        ];
    }

    private static function suggestTile(string $text): ?string
    {
        $key = mb_strtolower(trim($text));
        return self::TILE_SUGGESTIONS_ES[$key] ?? null;
    }

    /**
     * "Profile: Self-Service", "Entity: Root entity"... for each tile.
     *
     * @return array<string, array<int, string[]>>
     */
    private static function getTileOwners(): array
    {
        global $DB;

        $owners = [];
        if (!$DB->tableExists('glpi_helpdesks_tiles_items_tiles')) {
            return $owners;
        }
        foreach ($DB->request(['FROM' => 'glpi_helpdesks_tiles_items_tiles']) as $row) {
            $itemtype = (string) $row['itemtype_item'];
            $name = '';
            if (is_a($itemtype, \CommonDBTM::class, true)) {
                $item = new $itemtype();
                if ($item->getFromDB((int) $row['items_id_item'])) {
                    $name = $itemtype::getTypeName(1) . ': ' . $item->getName();
                }
            }
            if ($name !== '') {
                $owners[(string) $row['itemtype_tile']][(int) $row['items_id_tile']][] = $name;
            }
        }
        return $owners;
    }

    /**
     * Saves the edited tile texts (only those that changed).
     *
     * @return int number of updated items
     */
    public static function saveTiles(array $input): int
    {
        global $DB;

        $tables = [
            'glpipage' => ['table' => 'glpi_helpdesks_tiles_glpipagetiles', 'title' => 'title'],
            'externalpage' => ['table' => 'glpi_helpdesks_tiles_externalpagetiles', 'title' => 'title'],
            'form' => ['table' => 'glpi_forms_forms', 'title' => 'name'],
        ];
        $updated = 0;
        foreach ($tables as $type => $meta) {
            if (empty($input[$type]) || !is_array($input[$type]) || !$DB->tableExists($meta['table'])) {
                continue;
            }
            foreach ($input[$type] as $id => $values) {
                $id = (int) $id;
                if ($id <= 0 || !is_array($values)) {
                    continue;
                }
                $current = $DB->request(['FROM' => $meta['table'], 'WHERE' => ['id' => $id], 'LIMIT' => 1])->current();
                if (!$current) {
                    continue;
                }
                $changes = [];
                $title = trim((string) ($values['title'] ?? ''));
                if ($title !== '' && $title !== (string) $current[$meta['title']]) {
                    $changes[$meta['title']] = mb_substr($title, 0, 255);
                }
                if (array_key_exists('description', $values)) {
                    $description = trim((string) $values['description']);
                    $oldDescription = (string) ($current['description'] ?? '');
                    if ($type === 'form') {
                        if ($description !== self::htmlToText($oldDescription)) {
                            $changes['description'] = self::textToHtml($description, $oldDescription);
                        }
                    } else if ($description !== $oldDescription) {
                        $changes['description'] = $description;
                    }
                }
                if ($changes && $DB->update($meta['table'], $changes, ['id' => $id])) {
                    $updated++;
                }
            }
        }
        return $updated;
    }

    private static function htmlToText(string $html): string
    {
        if ($html === '' || !str_contains($html, '<')) {
            return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        $text = preg_replace('#<\s*(br|/p|/div|/li)\b[^>]*>#i', "\n", $html);
        $text = html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace("/\n{2,}/", "\n", $text));
    }

    /** Keeps the rich-text format when the form description already was HTML */
    private static function textToHtml(string $text, string $previous): string
    {
        if (!str_contains($previous, '<') || $text === '') {
            return $text;
        }
        $paragraphs = array_filter(array_map('trim', explode("\n", $text)), static fn($p) => $p !== '');
        return implode('', array_map(static fn($p) => '<p>' . htmlspecialchars($p, ENT_QUOTES, 'UTF-8') . '</p>', $paragraphs));
    }

    // ------------------------------------------------------------------
    // GLPI core string overrides
    // ------------------------------------------------------------------

    /**
     * Languages offered in the editor: [code => name], current language first.
     */
    public static function getLanguages(): array
    {
        global $CFG_GLPI;

        $languages = [];
        if (class_exists(\Glpi\Locale\LanguageRegistry::class)) {
            foreach (\Glpi\Locale\LanguageRegistry::all() as $code => $language) {
                $languages[$code] = (string) ($language->name ?? $code);
            }
        } else {
            foreach ($CFG_GLPI['languages'] ?? [] as $code => $info) {
                $languages[$code] = (string) ($info[0] ?? $code);
            }
        }
        // only languages whose files exist, current one first
        $languages = array_filter($languages, static fn($c) => self::getMoFile((string) $c) !== null, ARRAY_FILTER_USE_KEY);
        $current = (string) ($_SESSION['glpilanguage'] ?? '');
        if (isset($languages[$current])) {
            $languages = [$current => $languages[$current]] + $languages;
        }
        return $languages;
    }

    public static function isValidLanguage(string $lang): bool
    {
        return preg_match('/^[a-z]{2,3}(_[A-Za-z0-9]{2,4})?$/', $lang) === 1 && self::getMoFile($lang) !== null;
    }

    /** File name of the core translation of a language ("es_MX.mo") */
    private static function getMoFile(string $lang): ?string
    {
        global $CFG_GLPI;

        $file = null;
        if (class_exists(\Glpi\Locale\LanguageRegistry::class)) {
            $file = \Glpi\Locale\LanguageRegistry::tryGet($lang)?->mo_file;
        } else if (isset($CFG_GLPI['languages'][$lang][1])) {
            $file = $CFG_GLPI['languages'][$lang][1];
        }
        if (!$file || !is_file(GLPI_I18N_DIR . '/' . $file)) {
            return null;
        }
        return basename($file);
    }

    /**
     * Saved overrides for a language: key (context\x04msgid) => text or [singular, plural...].
     *
     * @return array<string, string|string[]>
     */
    public static function getOverrides(string $lang): array
    {
        $file = self::overrideFile($lang);
        if ($file === null || !is_file($file)) {
            return [];
        }
        $data = include $file;
        return is_array($data) ? $data : [];
    }

    /**
     * Rows for the editor: key, English original, GLPI translation and the custom text.
     */
    public static function getOverrideRows(string $lang): array
    {
        $rows = [];
        foreach (self::getOverrides($lang) as $key => $value) {
            $rows[] = self::describe((string) $key, $lang) + ['custom' => array_values((array) $value)];
        }
        return $rows;
    }

    /**
     * Built-in corrections for this language that are not overridden yet.
     */
    public static function getSuggestions(string $lang): array
    {
        if (!in_array($lang, self::NEUTRAL_SPANISH, true)) {
            return [];
        }
        $overrides = self::getOverrides($lang);
        $rows = [];
        foreach (self::CORE_SUGGESTIONS_ES as $key => $text) {
            if (isset($overrides[$key])) {
                continue;
            }
            $row = self::describe($key, $lang);
            if (!$row['known'] || ($row['translation'][0] ?? '') === $text) {
                continue;
            }
            $rows[] = $row + ['custom' => [$text]];
        }
        return $rows;
    }

    /**
     * Searches GLPI core strings by English original or by current translation.
     */
    public static function search(string $lang, string $query): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 3 || !self::isValidLanguage($lang)) {
            return [];
        }
        $english = self::catalog('en_GB');
        $translated = self::catalog($lang);
        $needle = mb_strtolower($query);
        $results = [];
        foreach ($english + $translated as $key => $value) {
            if ($key === '') {
                continue;
            }
            $haystack = mb_strtolower(str_replace("\0", ' ', $key . ' ' . ($english[$key] ?? '') . ' ' . ($translated[$key] ?? '')));
            if (str_contains($haystack, $needle)) {
                $results[] = self::describe(self::singularKey($key), $lang);
                if (count($results) >= self::SEARCH_LIMIT) {
                    break;
                }
            }
        }
        return $results;
    }

    /**
     * Saves the overrides of a language and publishes them.
     *
     * @param array<int, array{key?: string, forms?: string[], delete?: string}> $rows
     * @return int number of saved texts, -1 on error, -2 when nothing changed
     */
    public static function saveOverrides(string $lang, array $rows): int
    {
        if (!self::isValidLanguage($lang)) {
            return 0;
        }
        $overrides = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !empty($row['delete'])) {
                continue;
            }
            $key = base64_decode((string) ($row['key'] ?? ''), true);
            if ($key === false || $key === '' || !self::describe($key, $lang)['known']) {
                continue;
            }
            $forms = array_map(static fn($f) => trim((string) $f), array_values((array) ($row['forms'] ?? [])));
            if (($forms[0] ?? '') === '') {
                continue;
            }
            $overrides[$key] = count($forms) > 1 ? $forms : $forms[0];
        }

        if ($overrides === self::getOverrides($lang)) {
            return -2; // nothing changed
        }
        $file = self::overrideFile($lang);
        if (!is_dir(self::OVERRIDES_DIR) && !mkdir(self::OVERRIDES_DIR, 0755, true) && !is_dir(self::OVERRIDES_DIR)) {
            return -1;
        }
        if ($overrides) {
            $php = "<?php\n// Generated by glpimod (" . date('Y-m-d H:i') . "): custom GLPI texts for $lang\nreturn " . var_export($overrides, true) . ";\n";
            if (file_put_contents($file, $php) === false) {
                return -1;
            }
            self::invalidateOpcache($file);
        } else if (is_file($file)) {
            unlink($file);
        }
        self::publish();
        return count($overrides);
    }

    /**
     * Copies the overrides into the folder GLPI loads, or removes them (plugin disabled/uninstalled).
     */
    public static function publish(bool $enabled = true): bool
    {
        if (!defined('GLPI_LOCAL_I18N_DIR')) {
            return false;
        }
        $target = GLPI_LOCAL_I18N_DIR . '/' . self::PUBLISH_FOLDER;
        if (is_dir($target)) {
            foreach (glob($target . '/*.php') ?: [] as $old) {
                self::invalidateOpcache($old);
            }
            Toolbox::deleteDir($target);
        }
        $files = is_dir(self::OVERRIDES_DIR) ? glob(self::OVERRIDES_DIR . '/*.php') : [];
        $ok = true;
        if ($enabled && $files) {
            if (!is_dir($target) && !mkdir($target, 0755, true) && !is_dir($target)) {
                $ok = false;
            } else {
                foreach ($files as $file) {
                    $ok = copy($file, $target . '/' . basename($file)) && $ok;
                    // GLPI includes these files: make sure OPcache does not keep an old copy
                    self::invalidateOpcache($target . '/' . basename($file));
                }
            }
        }
        self::clearTranslationCache();
        return $ok;
    }

    public static function countOverrides(): int
    {
        $count = 0;
        foreach (is_dir(self::OVERRIDES_DIR) ? glob(self::OVERRIDES_DIR . '/*.php') : [] as $file) {
            $data = include $file;
            $count += is_array($data) ? count($data) : 0;
        }
        return $count;
    }

    private static function invalidateOpcache(string $file): void
    {
        if (function_exists('opcache_invalidate')) {
            @opcache_invalidate($file, true);
        }
    }

    private static function clearTranslationCache(): void
    {
        try {
            (new CacheManager())->getTranslationsCacheInstance()->clear();
        } catch (\Throwable $e) {
            // the overrides show up once the cache expires
        }
    }

    /** Overrides file of a language, named like the core .mo file (es_MX.php) */
    private static function overrideFile(string $lang): ?string
    {
        $mo = self::getMoFile($lang);
        return $mo === null ? null : self::OVERRIDES_DIR . '/' . preg_replace('/\.mo$/', '.php', $mo);
    }

    /**
     * Information about a core string.
     *
     * @return array{key: string, key64: string, context: string, msgid: string, plural: bool, english: string[], translation: string[], forms: int, known: bool}
     */
    private static function describe(string $key, string $lang): array
    {
        $english = self::catalog('en_GB');
        $translated = self::catalog($lang);
        $full = self::fullKey($key, 'en_GB') ?? self::fullKey($key, $lang);

        $context = '';
        $ids = $full ?? $key;
        if (str_contains($ids, self::CONTEXT_SEPARATOR)) {
            [$context, $ids] = explode(self::CONTEXT_SEPARATOR, $ids, 2);
        }
        $ids = explode("\0", $ids);
        $translation = $full !== null && isset($translated[$full]) ? explode("\0", $translated[$full]) : [];
        return [
            'key' => $key,
            'key64' => base64_encode($key),
            'context' => $context,
            'msgid' => $ids[0],
            'plural' => count($ids) > 1,
            'english' => $full !== null && isset($english[$full]) ? explode("\0", $english[$full]) : $ids,
            'translation' => $translation,
            // number of inputs in the editor: plural forms of the language (es_MX has 3)
            'forms' => count($ids) > 1 ? max(2, count($translation)) : 1,
            'known' => $full !== null,
        ];
    }

    /** Catalog key (including the plural msgid) of a singular key, or null if GLPI does not have it */
    private static function fullKey(string $key, string $lang): ?string
    {
        $catalog = self::catalog($lang);
        if ($key !== '' && isset($catalog[$key])) {
            return $key;
        }
        return self::$plurals[$lang][$key] ?? null;
    }

    private static function singularKey(string $key): string
    {
        return explode("\0", $key, 2)[0];
    }

    /**
     * Reads a core .mo file: key => translation (plural ids/forms joined with \0).
     *
     * @return array<string, string>
     */
    private static function catalog(string $lang): array
    {
        if (isset(self::$catalogs[$lang])) {
            return self::$catalogs[$lang];
        }
        $mo = self::getMoFile($lang);
        self::$catalogs[$lang] = $mo === null ? [] : self::readMo(GLPI_I18N_DIR . '/' . $mo);
        self::$plurals[$lang] = [];
        foreach (self::$catalogs[$lang] as $k => $v) {
            if (str_contains($k, "\0")) {
                self::$plurals[$lang][self::singularKey($k)] = $k;
            }
        }
        return self::$catalogs[$lang];
    }

    /**
     * Minimal GNU gettext .mo reader.
     *
     * @return array<string, string>
     */
    public static function readMo(string $path): array
    {
        $data = @file_get_contents($path);
        if ($data === false || strlen($data) < 28) {
            return [];
        }
        $magic = unpack('V', substr($data, 0, 4))[1];
        $format = match ($magic) {
            0x950412de => 'V',
            0xde120495 => 'N',
            default => null,
        };
        if ($format === null) {
            return [];
        }
        [, $count, $originals, $translations] = array_values(unpack($format . '4', substr($data, 4, 16)));
        $entries = [];
        for ($i = 0; $i < $count; $i++) {
            [$olen, $ooff] = array_values(unpack($format . '2', substr($data, $originals + $i * 8, 8)));
            [$tlen, $toff] = array_values(unpack($format . '2', substr($data, $translations + $i * 8, 8)));
            $entries[substr($data, $ooff, $olen)] = substr($data, $toff, $tlen);
        }
        return $entries;
    }
}
