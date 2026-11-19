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

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

use GlpiPlugin\Glpimod\BrandManager;

// ?type=config -> login settings (JSON); ?type=video -> background video (MP4, optional); otherwise -> background image (JPG)
$type = $_GET['type'] ?? '';

if ($type === 'config') {
    $response = new Response(
        json_encode([
            'opacity' => (float) BrandManager::getLoginOpacity(),
            'video'   => BrandManager::hasBackgroundVideo(),
            'version' => BrandManager::getResourceInfo('background_video')['version'],
        ]),
        200,
        ['Content-Type' => 'application/json']
    );
    $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
    return $response;
}

if ($type === 'video') {
    $file = BrandManager::IMAGE_RESOURCES["background_video"]["current"];
    $mime = 'video/mp4';
} else {
    $file = BrandManager::IMAGE_RESOURCES["background"]["current"];
    $mime = 'image/jpeg';
}

if (!file_exists($file)) {
    return new Response('Background not found', 404);
}

$response = new BinaryFileResponse($file);
$response->headers->set('Content-Type', $mime);

// Cache optimizado (1 año, revalidado por ETag)
$response->setPublic();
$response->setMaxAge(31536000);
$response->setSharedMaxAge(31536000);
$response->setEtag(md5_file($file));
$response->setAutoLastModified();
$response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE);
$response->isNotModified(Request::createFromGlobals());

return $response;
