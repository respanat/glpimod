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

use Glpi\Plugin\Hooks;
use GlpiPlugin\Glpimod\BrandManager;

const PLUGIN_GLPIMOD_VERSION = "1.0.2";

function plugin_init_glpimod()
{
    global $PLUGIN_HOOKS, $CFG_GLPI;

    $PLUGIN_HOOKS['config_page']['glpimod'] = './front/uibranding.php';
    if (Plugin::isPluginActive("glpimod")) {
        $CFG_GLPI["app_name"] = BrandManager::getCurrentTitle();
        if (BrandManager::isLoginPageModified()) {
            // Allow public/background.php (login background image/video) to be served without an active session
            \Glpi\Http\Firewall::addPluginStrategyForLegacyScripts("glpimod", '/^\/background.php$/', \Glpi\Http\Firewall::STRATEGY_NO_CHECK);

            $PLUGIN_HOOKS[Hooks::ADD_CSS_ANONYMOUS_PAGE]["glpimod"] = "./css/glpimod_anonymous.css";

            // Applies the configured login box opacity and the optional background video
            $PLUGIN_HOOKS[Hooks::ADD_JAVASCRIPT_ANONYMOUS_PAGE]["glpimod"] = "./public/login_video.js";
        }
    }
}

function plugin_version_glpimod()
{
    return [
        'name' => 'GLPI Mod',
        'version' => PLUGIN_GLPIMOD_VERSION,
        'author' => '<a href="https://github.com/respanat">Ramiro España</a> (based on UI Branding by <a href="https://www.i-vertix.com/">i-Vertix</a>)',
        'license' => 'GPLv3',
        'homepage' => 'https://github.com/respanat/glpimod',
        'requirements' => [
            'glpi' => [
                'min' => "11.0",
                'max' => "13.0"
            ]
        ]
    ];
}
