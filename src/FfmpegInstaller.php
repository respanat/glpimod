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
 * glpimod is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * glpimod is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with glpimod. If not, see <http://www.gnu.org/licenses/>.
 * -------------------------------------------------------------------------
 * @copyright Copyright (C) 2026 by Ramiro España (glpimod modifications).
 * @license   GPLv3 https://www.gnu.org/licenses/gpl-3.0.html
 * @link      https://github.com/respanat/glpimod
 * -------------------------------------------------------------------------
 */

namespace GlpiPlugin\Glpimod;

if (!defined('GLPI_ROOT')) {
    die("Sorry. You can't access directly to this file");
}

/**
 * Makes ffmpeg (needed to compress the login video) available without root access.
 *
 * GLPI installs plugins as the web server user, which cannot run "apt install". When ffmpeg is not
 * installed on the system, a portable static build is downloaded into the plugin data folder
 * (files/_plugins/glpimod/bin/ffmpeg) by a detached background job, so the GLPI "Install"/"Update"
 * button is not blocked by the download.
 *
 * Sources (checksum verified before use, binary tested before being installed):
 *   1. https://johnvansickle.com/ffmpeg/   (release static build, MD5)
 *   2. https://github.com/BtbN/FFmpeg-Builds (latest static build, SHA-256) - fallback
 */
class FfmpegInstaller
{
    public const BIN_DIR = BrandManager::FILES_DIR . "/bin";
    public const BUNDLED_FFMPEG = self::BIN_DIR . "/ffmpeg";
    public const WORK_DIR = BrandManager::FILES_DIR . "/ffmpeg-install";

    /**
     * ffmpeg installed on the system (preferred), or null.
     */
    public static function getSystemFfmpeg(): ?string
    {
        if (!VideoCompressor::canLaunchProcesses()) {
            return null;
        }
        foreach (['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'] as $candidate) {
            if (is_file($candidate) && is_executable($candidate)) {
                return $candidate;
            }
        }
        $found = trim((string) @exec('command -v ffmpeg 2>/dev/null'));
        return $found !== '' && is_executable($found) ? $found : null;
    }

    /**
     * ffmpeg downloaded by the plugin, or null.
     */
    public static function getBundledFfmpeg(): ?string
    {
        return is_file(self::BUNDLED_FFMPEG) && is_executable(self::BUNDLED_FFMPEG) ? self::BUNDLED_FFMPEG : null;
    }

    public static function isRunning(): bool
    {
        $pidFile = self::WORK_DIR . '/job.pid';
        if (!file_exists($pidFile)) {
            return false;
        }
        $pid = (int) file_get_contents($pidFile);
        if ($pid > 0 && file_exists("/proc/$pid")) {
            return true;
        }
        @unlink($pidFile);
        return false;
    }

    /**
     * @return string system | bundled | installing | failed | missing | unsupported
     */
    public static function getStatus(): string
    {
        if (!VideoCompressor::canLaunchProcesses()) {
            return 'unsupported';
        }
        if (self::getSystemFfmpeg() !== null) {
            return 'system';
        }
        if (self::getBundledFfmpeg() !== null) {
            return 'bundled';
        }
        if (self::isRunning()) {
            return 'installing';
        }
        return file_exists(self::WORK_DIR . '/state') ? 'failed' : 'missing';
    }

    /**
     * Called on plugin install/update: starts the download only when ffmpeg is not available yet.
     * Never blocks nor fails the plugin installation.
     */
    public static function ensure(): void
    {
        try {
            if (in_array(self::getStatus(), ['missing', 'failed'], true)) {
                self::start();
            }
        } catch (\Throwable $e) {
            // ffmpeg is optional: the plugin works without it
        }
    }

    /**
     * Launches the background download of the portable ffmpeg.
     */
    public static function start(): bool
    {
        if (!VideoCompressor::canLaunchProcesses() || self::isRunning()) {
            return false;
        }
        $dir = self::WORK_DIR;
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            return false;
        }
        @unlink("$dir/state");

        $script = <<<'SH'
#!/bin/sh
# glpimod - download of a portable ffmpeg (generated)
WORK="$1"; DEST="$2"
TMP="$WORK/tmp"; STATE="$WORK/state"
rm -rf "$TMP"; mkdir -p "$TMP" || { echo "failed mkdir" > "$STATE"; exit 1; }

case "$(uname -m)" in
  x86_64|amd64)  JV=amd64; BT=linux64 ;;
  aarch64|arm64) JV=arm64; BT=linuxarm64 ;;
  *) echo "failed unsupported-architecture" > "$STATE"; rm -rf "$TMP"; exit 1 ;;
esac

dl() {
  if command -v curl >/dev/null 2>&1; then curl -fsSL --retry 2 --connect-timeout 20 --max-time 1800 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then wget -q -T 60 -O "$2" "$1"
  else return 1; fi
}

OK=0
# 1) johnvansickle.com static release build (MD5)
URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-$JV-static.tar.xz"
if dl "$URL" "$TMP/a.tar.xz" && dl "$URL.md5" "$TMP/a.md5"; then
  if [ "$(md5sum "$TMP/a.tar.xz" | cut -d' ' -f1)" = "$(cut -d' ' -f1 "$TMP/a.md5")" ]; then
    tar -xJf "$TMP/a.tar.xz" -C "$TMP" --wildcards '*/ffmpeg' 2>/dev/null && OK=1
  fi
fi
rm -f "$TMP/a.tar.xz"

# 2) BtbN static build on GitHub (SHA-256)
if [ $OK -eq 0 ]; then
  NAME="ffmpeg-master-latest-$BT-gpl.tar.xz"
  BASE="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest"
  if dl "$BASE/$NAME" "$TMP/b.tar.xz" && dl "$BASE/checksums.sha256" "$TMP/sums"; then
    EXPECTED=$(grep " $NAME\$" "$TMP/sums" | cut -d' ' -f1)
    if [ -n "$EXPECTED" ] && [ "$(sha256sum "$TMP/b.tar.xz" | cut -d' ' -f1)" = "$EXPECTED" ]; then
      tar -xJf "$TMP/b.tar.xz" -C "$TMP" --wildcards '*/bin/ffmpeg' 2>/dev/null && OK=1
    fi
  fi
  rm -f "$TMP/b.tar.xz"
fi

BIN=$(find "$TMP" -type f -name ffmpeg 2>/dev/null | head -n 1)
if [ $OK -eq 1 ] && [ -n "$BIN" ]; then
  chmod 755 "$BIN"
  if "$BIN" -hide_banner -version >/dev/null 2>&1 && "$BIN" -hide_banner -encoders 2>/dev/null | grep -q libx264; then
    mkdir -p "$(dirname "$DEST")" && mv -f "$BIN" "$DEST" && echo "done" > "$STATE"
  else
    echo "failed binary-test" > "$STATE"
  fi
else
  echo "failed download" > "$STATE"
fi
rm -rf "$TMP"
SH;
        file_put_contents("$dir/job.sh", $script);

        $launcher = 'nohup nice -n 15 sh ' . escapeshellarg("$dir/job.sh") . ' '
            . escapeshellarg($dir) . ' ' . escapeshellarg(self::BUNDLED_FFMPEG)
            . ' > ' . escapeshellarg("$dir/job.log") . ' 2>&1 & echo $!';
        $pid = (int) trim((string) exec($launcher));
        if ($pid <= 0) {
            return false;
        }
        file_put_contents("$dir/job.pid", (string) $pid);
        return true;
    }
}
