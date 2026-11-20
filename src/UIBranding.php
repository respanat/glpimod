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

use Glpi\Application\View\TemplateRenderer;
use Session;

if (!defined('GLPI_ROOT')) {
    die("Sorry. You can't access directly to this file");
}

class UIBranding
{

    /**
     * Saves the configuration page.
     *
     * @param array $data
     * @param array $files
     * @return void
     */
    public function save(array $data, array $files): void
    {
        $brandManager = new BrandManager();

        // --- Portable ffmpeg download (normally done automatically on plugin install/update)
        if (isset($data['install_ffmpeg'])) {
            if (FfmpegInstaller::start()) {
                Session::addMessageAfterRedirect(__('Preparing the video compressor in the background. It takes about a minute.', 'glpimod'));
            } else {
                Session::addMessageAfterRedirect(__('The video compressor could not be prepared.', 'glpimod'), false, ERROR);
            }
            return;
        }

        // --- Background video compression (runs in the background)
        if (isset($data['compress_video'])) {
            if (VideoCompressor::start()) {
                Session::addMessageAfterRedirect(__('Compressing the background video in the background. You can keep working; the login page keeps the current video until it finishes.', 'glpimod'));
            } else {
                Session::addMessageAfterRedirect(__('The video compression could not be started.', 'glpimod'), false, ERROR);
            }
            return;
        }

        // --- Deletions requested through the "remove" buttons
        if (!empty($data['delete_resource'])) {
            $this->delete($brandManager, (string) $data['delete_resource']);
            return;
        }

        $backgroundChanged = false;
        $logosChanged = false;
        $faviconChanged = false;

        // --- Uploads
        if ($this->hasUpload($files, 'background')) {
            $backgroundChanged = $brandManager->uploadResource("background", $files['background']);
        }
        if ($this->hasUpload($files, 'background_video')) {
            if (VideoCompressor::isRunning()) {
                Session::addMessageAfterRedirect(__('The video is being compressed: wait for it to finish before uploading another one.', 'glpimod'), false, ERROR);
            } else if ($brandManager->uploadResource("background_video", $files['background_video'])) {
                VideoCompressor::clearResult();
                Session::addMessageAfterRedirect(__('Background video uploaded', 'glpimod'));
            }
        }
        foreach (BrandManager::LOGO_RESOURCES as $logo) {
            if ($this->hasUpload($files, $logo)) {
                $logosChanged = $brandManager->uploadResource($logo, $files[$logo]) || $logosChanged;
            }
            foreach (BrandManager::LOGO_VARIANTS as $variant) {
                $field = $logo . '__' . $variant;
                if ($this->hasUpload($files, $field)) {
                    $logosChanged = $brandManager->uploadLogoVariant($logo, $variant, $files[$field]) || $logosChanged;
                }
            }
        }
        if ($this->hasUpload($files, 'favicon')) {
            $faviconChanged = $brandManager->uploadResource("favicon", $files['favicon']);
        }

        // --- Login page background
        if (isset($data['show_background'])) {
            if ($data['show_background'] === '1') {
                if ($backgroundChanged || !$brandManager::isLoginPageModified()) {
                    $brandManager->applyResource("background");
                }
                $brandManager->applyLoginPageModifier();
            } else if ($brandManager::isLoginPageModified()) {
                // background image/video have no backup: they are only disabled
                $brandManager->disableLoginPageModifier();
            }
        }

        // --- Logos
        $showLogos = isset($data['show_custom_logos'])
            ? $data['show_custom_logos'] === '1'
            : self::areCustomLogosActive();
        if ($showLogos) {
            if ($logosChanged || !self::areCustomLogosActive()) {
                $this->applyLogos($brandManager);
            }
        } else if (self::areCustomLogosActive()) {
            foreach (BrandManager::LOGO_RESOURCES as $logo) {
                $brandManager->restoreResource($logo);
            }
        }

        // --- Favicon
        $showFavicon = isset($data['show_custom_favicon'])
            ? $data['show_custom_favicon'] === '1'
            : BrandManager::isActiveResourceModified("favicon");
        if ($showFavicon) {
            if ($faviconChanged || !$brandManager::isActiveResourceModified("favicon")) {
                $brandManager->applyResource("favicon");
            }
        } else if ($brandManager::isActiveResourceModified("favicon")) {
            $brandManager->restoreResource("favicon");
        }

        // --- Title and login box
        if (isset($data['title'])) {
            $brandManager->changeTitle($data["title"]);
        }
        if (isset($data['login_opacity'])) {
            $brandManager->setLoginOpacity((float) $data['login_opacity']);
        }

        // --- Self-service home page
        if (isset($data['helpdesk_clock'])) {
            $season = (string) ($data['season'] ?? 'none');
            $enabled = array_values(array_intersect(BrandManager::HELPDESK_THEMES, (array) ($data['seasons'] ?? [])));
            $brandManager->setModifiers([
                'helpdesk_clock' => $data['helpdesk_clock'] === '1' ? '1' : '0',
                'clock_format' => ($data['clock_format'] ?? '12') === '24' ? '24' : '12',
                'season' => in_array($season, array_merge(['none', 'auto'], BrandManager::HELPDESK_THEMES), true) ? $season : 'none',
                'seasons' => implode(',', $enabled),
                'fx_decor' => ($data['fx_decor'] ?? '0') === '1' ? '1' : '0',
                'fx_top' => ($data['fx_top'] ?? '0') === '1' ? '1' : '0',
                'fx_particles' => ($data['fx_particles'] ?? '0') === '1' ? '1' : '0',
            ]);
        }

        // --- Texts: helpdesk tiles and GLPI core strings
        if (isset($data['texts_lang'])) {
            $tiles = TextFixer::saveTiles(is_array($data['tiles'] ?? null) ? $data['tiles'] : []);
            if ($tiles > 0) {
                Session::addMessageAfterRedirect(sprintf(__('%d texts of the self-service portal updated', 'glpimod'), $tiles));
            }
            $lang = (string) $data['texts_lang'];
            $saved = TextFixer::saveOverrides($lang, is_array($data['overrides'] ?? null) ? $data['overrides'] : []);
            if ($saved === -1) {
                Session::addMessageAfterRedirect(__('The custom texts could not be saved: check the permissions of the files folder of GLPI.', 'glpimod'), false, ERROR);
            } else if ($saved >= 0) {
                Session::addMessageAfterRedirect(sprintf(__('Custom GLPI texts saved for %1$s: %2$d', 'glpimod'), $lang, $saved));
            }
        }

        Session::addMessageAfterRedirect(__('Configuration saved', 'glpimod'));
    }

    /**
     * Handles a "remove" button: background_video, or <logo>__<variant> for a colour-specific logo.
     */
    private function delete(BrandManager $brandManager, string $target): void
    {
        if ($target === 'background_video') {
            if (VideoCompressor::isRunning()) {
                Session::addMessageAfterRedirect(__('The video is being compressed: wait for it to finish before uploading another one.', 'glpimod'), false, ERROR);
                return;
            }
            VideoCompressor::clearResult();
            if ($brandManager->deleteBackgroundVideo()) {
                Session::addMessageAfterRedirect(__('Background video removed: the login page now uses the background image', 'glpimod'));
            }
            return;
        }

        [$logo, $variant] = array_pad(explode('__', $target, 2), 2, '');
        if ($brandManager->deleteLogoVariant($logo, $variant)) {
            // re-apply so that this variant goes back to the main logo
            if (self::areCustomLogosActive()) {
                $brandManager->applyResource($logo);
            }
            Session::addMessageAfterRedirect(__('Colour-specific logo removed: the main logo is used instead', 'glpimod'));
        }
    }

    private function applyLogos(BrandManager $brandManager): void
    {
        foreach (BrandManager::LOGO_RESOURCES as $logo) {
            $brandManager->applyResource($logo);
        }
    }

    private function hasUpload(array $files, string $field): bool
    {
        return isset($files[$field]['name']) && $files[$field]['name'] !== '';
    }

    private static function areCustomLogosActive(): bool
    {
        foreach (BrandManager::LOGO_RESOURCES as $logo) {
            if (BrandManager::isActiveResourceModified($logo)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Seasonal themes with their label and dates (in the user language).
     *
     * @return array<string, array{label: string, dates: string}>
     */
    public static function getHelpdeskThemes(): array
    {
        return [
            'january_festivals' => ['label' => __('Hay Festival and Cartagena Music Festival', 'glpimod'), 'dates' => __('7 – 31 January', 'glpimod')],
            'candelaria' => ['label' => __('Fiestas de la Candelaria', 'glpimod'), 'dates' => __('30 January – 2 February', 'glpimod')],
            'carnival' => ['label' => __('Barranquilla Carnival', 'glpimod'), 'dates' => __('the 10 days before Ash Wednesday', 'glpimod')],
            'womens_day' => ['label' => __("Women's Day", 'glpimod'), 'dates' => __('4 – 8 March', 'glpimod')],
            'rest_week' => ['label' => __('Holy Week (rest week)', 'glpimod'), 'dates' => __('Palm Sunday to Easter Sunday', 'glpimod')],
            'mothers_day' => ['label' => __("Mother's Day", 'glpimod'), 'dates' => __('week of the 2nd Sunday of May', 'glpimod')],
            'fathers_day' => ['label' => __("Father's Day and mid-year holidays", 'glpimod'), 'dates' => __('week of the 3rd Sunday of June', 'glpimod')],
            'independence' => ['label' => __('Independence of Colombia', 'glpimod'), 'dates' => __('14 – 20 July', 'glpimod')],
            'kites' => ['label' => __('Kite season (Battle of Boyacá)', 'glpimod'), 'dates' => __('August', 'glpimod')],
            'love_friendship' => ['label' => __('Love and Friendship', 'glpimod'), 'dates' => __('the two weeks up to the 3rd Saturday of September', 'glpimod')],
            'halloween' => ['label' => __("Halloween and Children's Day", 'glpimod'), 'dates' => __('24 – 31 October', 'glpimod')],
            'cartagena' => ['label' => __('Independence of Cartagena', 'glpimod'), 'dates' => __('1 – 15 November', 'glpimod')],
            'christmas' => ['label' => __('Christmas and Día de las Velitas', 'glpimod'), 'dates' => __('1 December – 6 January (candles on 7 and 8 December)', 'glpimod')],
        ];
    }

    /**
     * Converts a php.ini size ("64M") to bytes.
     */
    private static function iniBytes(string $value): int
    {
        $value = trim($value);
        $number = (int) $value;
        return match (strtolower(substr($value, -1))) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }

    /**
     * @return bool
     */
    public function display(): bool
    {
        global $CFG_GLPI;

        $logos = [];
        $sizes = [
            'logo_s' => ['label' => __('Small logo', 'glpimod'), 'hint' => '53×53 px', 'where' => __('Collapsed side menu', 'glpimod')],
            'logo_m' => ['label' => __('Medium logo', 'glpimod'), 'hint' => '100×55 px', 'where' => __('Side menu and header', 'glpimod')],
            'logo_l' => ['label' => __('Large logo', 'glpimod'), 'hint' => '250×138 px', 'where' => __('Login page', 'glpimod')],
        ];
        $variants = [
            'black' => ['label' => __('For light backgrounds', 'glpimod'), 'bg' => 'light'],
            'white' => ['label' => __('For dark backgrounds', 'glpimod'), 'bg' => 'dark'],
            'grey' => ['label' => __('User menu', 'glpimod'), 'bg' => 'light'],
        ];
        foreach ($sizes as $logo => $meta) {
            $logoVariants = [];
            foreach ($variants as $variant => $vmeta) {
                $logoVariants[$variant] = $vmeta + [
                    'custom' => BrandManager::hasLogoVariant($logo, $variant),
                    'info' => BrandManager::getResourceInfo($logo, BrandManager::hasLogoVariant($logo, $variant) ? $variant : null),
                ];
            }
            $logos[$logo] = $meta + [
                'info' => BrandManager::getResourceInfo($logo),
                'variants' => $logoVariants,
                'has_variants' => count(array_filter($logoVariants, static fn($v) => $v['custom'])) > 0,
            ];
        }

        $video = BrandManager::getResourceInfo('background_video');
        $compression = VideoCompressor::getStatus();
        if (in_array($compression['state'], ['done', 'nogain', 'failed'], true)) {
            // final results are shown once
            VideoCompressor::clearResult();
        }
        $compression['old_label'] = \Toolbox::getSize($compression['old_size']);
        $compression['new_label'] = \Toolbox::getSize($compression['new_size']);
        $textsLang = (string) ($_GET['texts_lang'] ?? ($_SESSION['glpilanguage'] ?? 'en_GB'));
        if (!TextFixer::isValidLanguage($textsLang)) {
            $textsLang = TextFixer::isValidLanguage((string) ($_SESSION['glpilanguage'] ?? '')) ? (string) $_SESSION['glpilanguage'] : 'en_GB';
        }
        $tiles = TextFixer::getTiles();

        $maxUpload = min(self::iniBytes((string) ini_get('upload_max_filesize')), self::iniBytes((string) ini_get('post_max_size')));

        TemplateRenderer::getInstance()->display('@glpimod/uibranding.html.twig', [
            "url" => $CFG_GLPI['root_doc'] . "/plugins/glpimod/front/uibranding.php",
            "preview_url" => $CFG_GLPI['root_doc'] . "/plugins/glpimod/front/resource.send.php",
            "show_background" => BrandManager::isLoginPageModified(),
            "show_custom_logos" => self::areCustomLogosActive(),
            "show_custom_favicon" => BrandManager::isActiveResourceModified("favicon"),
            "title" => BrandManager::getCurrentTitle(),
            "login_opacity" => BrandManager::getLoginOpacity(),
            "background" => BrandManager::getResourceInfo('background'),
            "video" => $video,
            "video_warning" => $video['size'] > BrandManager::VIDEO_WARNING_SIZE,
            "compression" => $compression,
            "ffmpeg_available" => VideoCompressor::isAvailable(),
            "ffmpeg_status" => FfmpegInstaller::getStatus(),
            "compress_status_url" => $CFG_GLPI['root_doc'] . "/plugins/glpimod/front/compress.status.php",
            "max_upload" => \Toolbox::getSize($maxUpload),
            "video_warning_label" => \Toolbox::getSize(BrandManager::VIDEO_WARNING_SIZE),
            "logos" => $logos,
            "favicon" => BrandManager::getResourceInfo('favicon'),
            "version" => PLUGIN_GLPIMOD_VERSION,
            "helpdesk" => BrandManager::getHelpdeskSettings(),
            "helpdesk_themes" => self::getHelpdeskThemes(),
            "plugin_url" => $CFG_GLPI['root_doc'] . "/plugins/glpimod",
            "tiles" => $tiles,
            "tiles_suggestions" => count(array_filter($tiles, static fn($t) => $t['has_suggestion'])),
            "texts_lang" => $textsLang,
            "texts_languages" => TextFixer::getLanguages(),
            "overrides" => TextFixer::getOverrideRows($textsLang),
            "override_suggestions" => TextFixer::getSuggestions($textsLang),
            "texts_search_url" => $CFG_GLPI['root_doc'] . "/plugins/glpimod/front/texts.search.php",
        ]);
        return true;
    }

}
