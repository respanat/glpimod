/*
 * glpimod - GLPI Mod (based on "UI Branding plugin for GLPI" by i-Vertix)
 * Login page: applies the configured login box opacity and injects
 * the optional background video.
 */
(function () {
    'use strict';

    // URLs relative to this script, so they work whatever the GLPI root URL is
    const script = document.currentScript;
    const base = script && script.src ? script.src.replace(/login_video\.js(\?.*)?$/, 'background.php') : null;
    if (!base) {
        return;
    }

    function whenContainerReady(callback) {
        let attempts = 0;
        (function check() {
            const container = document.querySelector('.welcome-anonymous');
            if (container) {
                callback(container);
            } else if (++attempts < 50) {
                setTimeout(check, 100);
            }
        })();
    }

    function applyOpacity(opacity) {
        if (typeof opacity === 'number' && opacity >= 0.05 && opacity <= 1) {
            document.documentElement.style.setProperty('--login-opacity', String(opacity));
        }
    }

    function injectVideo(container) {
        if (container.querySelector('video.glpimod-background')) {
            return;
        }
        const video = document.createElement('video');
        video.className = 'glpimod-background';
        video.src = base + '?type=video';
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
    }

    fetch(base + '?type=config', {credentials: 'same-origin'})
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (config) {
            applyOpacity(config.opacity);
            if (config.video) {
                whenContainerReady(injectVideo);
            }
        })
        .catch(function (e) {
            console.log('glpimod: could not load login settings', e);
        });
})();
