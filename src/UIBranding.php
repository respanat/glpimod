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
        ]);
        return true;
    }

}
