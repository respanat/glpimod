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
 * Compresses the login background video with ffmpeg in a detached, low-priority background process,
 * so the web request returns immediately and the user can keep working.
 *
 * Files used (in files/_plugins/glpimod/compress/):
 *   job.sh       generated shell script
 *   job.pid      PID of the running job
 *   job.log      ffmpeg output (also used to read the video duration)
 *   progress     ffmpeg -progress output (current position)
 *   state        final result: "done <old> <new>", "nogain <old> <new>" or "failed <code>"
 *
 * The original video is only replaced when the compressed file is valid and smaller.
 */
class VideoCompressor
{
    public const WORK_DIR = BrandManager::FILES_DIR . "/compress";

    /** Target encoding: max 1080p, H.264 CRF 28, no audio (the login video is always muted) */
    private const FFMPEG_ARGS = '-y -nostdin -hide_banner -i %1$s -map 0:v:0 '
        . '-vf "scale=-2:\'trunc(min(1080,ih)/2)*2\'" '
        . '-c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -an -movflags +faststart '
        . '-progress %2$s %3$s';

    /**
     * Path of the ffmpeg binary: the system one, or the portable one downloaded by the plugin.
     * Null when none is available or processes cannot be launched.
     */
    public static function getFfmpegPath(): ?string
    {
        if (!self::canLaunchProcesses()) {
            return null;
        }
        return FfmpegInstaller::getSystemFfmpeg() ?? FfmpegInstaller::getBundledFfmpeg();
    }

    public static function isAvailable(): bool
    {
        return self::getFfmpegPath() !== null;
    }

    public static function canLaunchProcesses(): bool
    {
        if (!function_exists('exec') || DIRECTORY_SEPARATOR !== '/') {
            return false;
        }
        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        return !in_array('exec', $disabled, true);
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
        // process ended: the pid file is obsolete
        @unlink($pidFile);
        return false;
    }

    /**
     * Starts the background compression.
     *
     * @return bool true if the job was launched
     */
    public static function start(): bool
    {
        $ffmpeg = self::getFfmpegPath();
        $input = BrandManager::IMAGE_RESOURCES['background_video']['current'];
        if ($ffmpeg === null || !file_exists($input) || self::isRunning()) {
            return false;
        }
        if (!is_dir(self::WORK_DIR) && !mkdir(self::WORK_DIR, 0755, true) && !is_dir(self::WORK_DIR)) {
            return false;
        }
        self::clearResult();

        $dir = self::WORK_DIR;
        $tmp = "$dir/compressed.mp4";
        $state = "$dir/state";
        $command = escapeshellarg($ffmpeg) . ' ' . sprintf(
            self::FFMPEG_ARGS,
            escapeshellarg($input),
            escapeshellarg("$dir/progress"),
            escapeshellarg($tmp)
        );

        $script = "#!/bin/sh\n"
            . "# glpimod - background video compression (generated)\n"
            . "IN=" . escapeshellarg($input) . "\n"
            . "TMP=" . escapeshellarg($tmp) . "\n"
            . "STATE=" . escapeshellarg($state) . "\n"
            . "$command\n"
            . "RC=\$?\n"
            . "if [ \$RC -eq 0 ] && [ -s \"\$TMP\" ]; then\n"
            . "  OLD=\$(stat -c%s \"\$IN\"); NEW=\$(stat -c%s \"\$TMP\")\n"
            . "  if [ \"\$NEW\" -lt \"\$OLD\" ]; then\n"
            . "    mv -f \"\$TMP\" \"\$IN\" && echo \"done \$OLD \$NEW\" > \"\$STATE\"\n"
            . "  else\n"
            . "    rm -f \"\$TMP\"; echo \"nogain \$OLD \$NEW\" > \"\$STATE\"\n"
            . "  fi\n"
            . "else\n"
            . "  rm -f \"\$TMP\"; echo \"failed \$RC\" > \"\$STATE\"\n"
            . "fi\n";
        file_put_contents("$dir/job.sh", $script);

        // detached and with low CPU/IO priority, so GLPI keeps responding normally
        $launcher = 'nohup nice -n 15 sh ' . escapeshellarg("$dir/job.sh")
            . ' > ' . escapeshellarg("$dir/job.log") . ' 2>&1 & echo $!';
        $pid = (int) trim((string) exec($launcher));
        if ($pid <= 0) {
            return false;
        }
        file_put_contents("$dir/job.pid", (string) $pid);
        return true;
    }

    /**
     * Current status for the configuration page and the status endpoint.
     *
     * @return array{state: string, percent: int, old_size: int, new_size: int}
     */
    public static function getStatus(): array
    {
        $status = ['state' => 'idle', 'percent' => 0, 'old_size' => 0, 'new_size' => 0];

        if (self::isRunning()) {
            $status['state'] = 'running';
            $status['percent'] = self::getProgress();
            return $status;
        }

        $stateFile = self::WORK_DIR . '/state';
        if (file_exists($stateFile)) {
            $parts = explode(' ', trim((string) file_get_contents($stateFile)));
            $status['state'] = in_array($parts[0], ['done', 'nogain', 'failed'], true) ? $parts[0] : 'failed';
            $status['old_size'] = (int) ($parts[1] ?? 0);
            $status['new_size'] = (int) ($parts[2] ?? 0);
            $status['percent'] = 100;
        } elseif (file_exists(self::WORK_DIR . '/job.log')) {
            // the process ended without writing a result (killed, server restart...)
            $status['state'] = 'failed';
        }
        return $status;
    }

    /**
     * Forgets the last result (after it has been shown to the user, or before a new job/upload).
     */
    public static function clearResult(): void
    {
        foreach (['state', 'progress', 'job.log', 'job.sh', 'compressed.mp4'] as $file) {
            @unlink(self::WORK_DIR . '/' . $file);
        }
    }

    /**
     * Percentage done, from the video duration (ffmpeg log) and the current position (-progress file).
     */
    private static function getProgress(): int
    {
        $log = @file_get_contents(self::WORK_DIR . '/job.log') ?: '';
        $progress = @file_get_contents(self::WORK_DIR . '/progress') ?: '';
        if (!preg_match('/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/', $log, $d)) {
            return 0;
        }
        $duration = $d[1] * 3600 + $d[2] * 60 + (float) $d[3];
        if ($duration <= 0 || !preg_match_all('/out_time_us=(\d+)/', $progress, $t)) {
            return 0;
        }
        $position = end($t[1]) / 1000000;
        return (int) max(0, min(99, floor($position / $duration * 100)));
    }
}
