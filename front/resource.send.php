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
use Glpi\Exception\Http\NotFoundHttpException;
use GlpiPlugin\Glpimod\BrandManager;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

if (!Plugin::isPluginActive("glpimod")) {
    throw new AccessDeniedHttpException();
}

Session::checkRight("config", UPDATE);

$key = $_GET['resource'] ?? '';
$variant = $_GET['variant'] ?? '';
if (!isset(BrandManager::IMAGE_RESOURCES[$key])) {
    throw new AccessDeniedHttpException();
}

// Logo colour variant: its own file if uploaded, otherwise the main logo
if ($variant !== '' && BrandManager::hasLogoVariant($key, $variant)) {
    $file = BrandManager::getLogoVariantPath($key, $variant);
} else {
    $file = BrandManager::IMAGE_RESOURCES[$key]["current"];
}
if (!file_exists($file)) {
    throw new NotFoundHttpException();
}

// BinaryFileResponse handles Range requests, so the video preview can be played and seeked
$response = new BinaryFileResponse($file);
$response->headers->set('Content-Type', mime_content_type($file) ?: 'application/octet-stream');
$response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate');
$response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, basename($file));
$response->prepare(Request::createFromGlobals());
return $response;
