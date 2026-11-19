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

use GlpiPlugin\Glpimod\BrandManager;
use GlpiPlugin\Glpimod\FfmpegInstaller;

/**
 * Plugin install process
 */
function plugin_glpimod_install()
{
    $brandManager = new BrandManager();
    $brandManager->install();
    // optional dependency: portable ffmpeg for the video compression, downloaded in the background if missing
    FfmpegInstaller::ensure();
    return true;
}

/**
 * Plugin uninstall process
 */
function plugin_glpimod_uninstall()
{
    $brandManager = new BrandManager();
    $brandManager->uninstall();
    return true;
}

function plugin_glpimod_activate()
{
    $brandManager = new BrandManager();
    // Aplicar SOLO recursos con "active" (logos, favicon)
    foreach (BrandManager::IMAGE_RESOURCES as $resourceName => $paths) {
        if (isset($paths["active"])) {
            $brandManager->applyResource($resourceName);
        }
    }
    $brandManager->applyLoginPageModifier();
}

function plugin_glpimod_deactivate()
{
    $brandManager = new BrandManager();
    
    // Restaurar SOLO recursos con "backup" (logos, favicon)
    foreach (BrandManager::IMAGE_RESOURCES as $resourceName => $paths) {
        if (isset($paths["backup"])) {
            $brandManager->restoreResource($resourceName);
        }
    }
    $brandManager->disableLoginPageModifier();
}
