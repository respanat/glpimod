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

use Glpi\Exception\Http\AccessDeniedHttpException;
use GlpiPlugin\Glpimod\BrandManager;
use function Safe\readfile;

if (!Plugin::isPluginActive("glpimod")) {
    throw new AccessDeniedHttpException();
}

Session::checkRight("config", UPDATE);

$key = $_GET['resource'] ?? '';
if ($key === "") {
    throw new AccessDeniedHttpException();
}

// Soporte completo para todos los recursos (incluyendo background_video)
if (!isset(BrandManager::IMAGE_RESOURCES[$key])) {
    throw new AccessDeniedHttpException();
}

$file = BrandManager::IMAGE_RESOURCES[$key]["current"];
if (!file_exists($file)) {
    throw new AccessDeniedHttpException();
}

// MIME type automático (soporta video/mp4 + imágenes)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file);
finfo_close($finfo);

header('Content-Type: ' . $mime);
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: Sun, 30 Jan 1966 06:30:00 GMT');
header('Content-disposition: filename="' . basename($file) . '"');

readfile($file);
