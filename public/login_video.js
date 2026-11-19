/*
 * glpimod - GLPI Mod (based on "UI Branding plugin for GLPI" by i-Vertix)
 * Injects the optional login background video.
 * Only loaded by setup.php when a background video has been uploaded.
 */
(function () {
    'use strict';

    // Build the video URL relative to this script, so it works whatever the GLPI root URL is
    const script = document.currentScript;
    const videoUrl = script && script.src
        ? script.src.replace(/login_video\.js(\?.*)?$/, 'background.php?type=video')
        : null;

    let attempts = 0;
    const maxAttempts = 50;

    function injectVideo() {
        const container = document.querySelector('.welcome-anonymous');
        if (!container || !videoUrl) {
            return false;
        }

        // Fallback opacity (to be replaced by the configured value)
        document.documentElement.style.setProperty('--login-opacity', '0.65');

        const existingVideo = container.querySelector('video.glpimod-background');
        if (existingVideo) {
            return true;
        }

        const video = document.createElement('video');
        video.className = 'glpimod-background';
        video.src = videoUrl;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        container.classList.add('glpimod-has-video');
        container.prepend(video);
        video.play().catch(function (e) {
            console.log('glpimod: video play error', e);
        });

        return true;
    }

    function tryInject() {
        attempts++;
        if (injectVideo()) {
            return;
        }
        if (attempts < maxAttempts) {
            setTimeout(tryInject, 100);
        }
    }

    tryInject();
    ['DOMContentLoaded', 'load'].forEach(function (event) {
        document.addEventListener(event, tryInject, {once: true});
    });
})();
