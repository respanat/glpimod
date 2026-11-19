/*
 * glpimod - GLPI Mod (based on "UI Branding plugin for GLPI" by i-Vertix)
 * Self-service home page ("¿Cómo podemos ayudarte?"):
 *   - real time on the clock of the native "shelves" illustration (drawn over the original "9:00")
 *   - seasonal decoration (Christmas): snow caps, baubles, gift, string of lights and gentle snowfall
 *
 * The native scenes are SVG sprites referenced with <use>, whose content cannot be modified from the
 * page, so everything is drawn in an overlay with the same viewBox (842x596), using the same GLPI
 * illustration colour variables so it follows the active palette.
 * Scene-specific overlays are only drawn when the entity uses the default scenes (shelves / desk).
 */
(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const FACE = 'var(--glpi-illustrations-color, var(--glpi-illustrations-gradient-1, #E5EAF6))';
    const INK = 'var(--glpi-illustrations-color-3, var(--glpi-illustrations-gradient-3, #85A0D8))';
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 5x7 pixel font, same style as the original clock digits
    const FONT = {
        '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
        '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
        '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
        '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
        '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
        '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
        '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
        '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
        '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
        '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    };

    function el(tag, attrs, parent) {
        const node = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
        if (parent) parent.appendChild(node);
        return node;
    }

    function sceneId(scene) {
        const use = scene && scene.querySelector('svg use');
        if (!use) return null;
        const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
        const i = href.lastIndexOf('#');
        return i >= 0 ? href.slice(i + 1) : null;
    }

    function overlayFor(scene) {
        let svg = scene.querySelector(':scope > svg.glpimod-overlay');
        if (!svg) {
            svg = el('svg', {viewBox: '0 0 842 596', class: 'glpimod-overlay', 'aria-hidden': 'true', focusable: 'false'});
            scene.appendChild(svg);
            // same box as the illustration, so both use the same 842x596 coordinates
            const art = scene.querySelector('svg:not(.glpimod-overlay)');
            const place = function () {
                if (!art) return;
                const a = art.getBoundingClientRect(), s = scene.getBoundingClientRect();
                svg.style.left = (a.left - s.left) + 'px';
                svg.style.top = (a.top - s.top) + 'px';
                svg.style.width = a.width + 'px';
                svg.style.height = a.height + 'px';
            };
            place();
            if (window.ResizeObserver && art) {
                new ResizeObserver(place).observe(art);
            } else {
                window.addEventListener('resize', place);
            }
        }
        return svg;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function isChristmas(mode, now) {
        if (mode === 'christmas') return true;
        if (mode !== 'auto') return false;
        const month = now.getMonth(), day = now.getDate();
        return month === 11 || (month === 0 && day <= 6); // 1 December - 6 January
    }

    // ---------------------------------------------------------------- clock

    function timeText(format, now) {
        const minutes = String(now.getMinutes()).padStart(2, '0');
        let hours = now.getHours();
        if (format !== '24') {
            hours = hours % 12 || 12;
            return String(hours) + ':' + minutes;
        }
        return String(hours).padStart(2, '0') + ':' + minutes;
    }

    function drawDigits(group, text) {
        clear(group);
        // clock screen: x 398.7-530.9, digits area centred on x 464.8, y 209-242.3
        const digits = text.replace(':', '').length;
        const p = digits <= 3 ? 4.75 : 4.2;           // pixel size (3 digits = original size)
        const gap = p * 1.37, colonW = p * 1.1;
        const width = digits * 5 * p + (digits - 2) * gap + gap * 2 + colonW;
        let x = 464.8 - width / 2;
        const top = 225.65 - 3.5 * p;
        let first = true;
        text.split('').forEach(function (ch) {
            if (ch === ':') {
                const colon = el('g', {class: 'glpimod-colon'}, group);
                el('rect', {x: x + gap, y: top + 1.5 * p, width: colonW, height: colonW, fill: INK}, colon);
                el('rect', {x: x + gap, y: top + 4.5 * p, width: colonW, height: colonW, fill: INK}, colon);
                x += gap * 2 + colonW;
                first = true;
                return;
            }
            if (!first) x += gap;
            (FONT[ch] || FONT['0']).forEach(function (row, r) {
                for (let c = 0; c < 5; c++) {
                    if (row[c] === '1') {
                        el('rect', {x: (x + c * p).toFixed(2), y: (top + r * p).toFixed(2), width: (p + 0.05).toFixed(2), height: (p + 0.05).toFixed(2), fill: INK}, group);
                    }
                }
            });
            x += 5 * p;
            first = false;
        });
    }

    function drawClock(overlay, format) {
        const clock = el('g', {class: 'glpimod-clock'}, overlay);
        // hide the static "9:00" with the colour of the clock screen
        el('rect', {x: 404, y: 203, width: 122, height: 45, rx: 3, fill: FACE}, clock);
        const digits = el('g', {}, clock);
        let last = '';
        function tick() {
            const text = timeText(format, new Date());
            if (text !== last) {
                drawDigits(digits, text);
                last = text;
            }
        }
        tick();
        return setInterval(tick, 1000);
    }

    // ---------------------------------------------------------------- christmas decoration

    function snowCap(parent, x1, x2, y) {
        // soft snow layer resting on a horizontal edge, with a few drips
        const w = x2 - x1;
        let d = 'M' + x1 + ' ' + (y + 1.5);
        const bumps = Math.max(3, Math.round(w / 38));
        for (let i = 0; i < bumps; i++) {
            const a = x1 + (w * i) / bumps, b = x1 + (w * (i + 1)) / bumps;
            const h = 4 + ((i * 7) % 4);
            d += ' C' + (a + 2) + ' ' + (y - h) + ' ' + (b - 2) + ' ' + (y - h) + ' ' + b + ' ' + (y + 1.5);
        }
        d += ' L' + x2 + ' ' + (y + 2.5);
        for (let i = bumps; i > 0; i--) {
            const cx = x1 + (w * (i - 0.5)) / bumps;
            if (i % 2) {
                d += ' L' + (cx + 4) + ' ' + (y + 2.5) + ' Q' + cx + ' ' + (y + 9 + (i % 3) * 2) + ' ' + (cx - 4) + ' ' + (y + 2.5);
            }
        }
        d += ' L' + x1 + ' ' + (y + 2.5) + ' Z';
        el('path', {d: d, fill: '#ffffff', stroke: 'rgba(133,160,216,.35)', 'stroke-width': '0.8'}, parent);
    }

    function bauble(parent, cx, cy, color) {
        el('line', {x1: cx, y1: cy - 15, x2: cx, y2: cy - 7, stroke: INK, 'stroke-width': '1.2'}, parent);
        el('rect', {x: cx - 2.5, y: cy - 9.5, width: 5, height: 3.5, rx: 1, fill: '#c9a227'}, parent);
        el('circle', {cx: cx, cy: cy, r: 7, fill: color}, parent);
        el('circle', {cx: cx - 2.4, cy: cy - 2.4, r: 1.8, fill: 'rgba(255,255,255,.65)'}, parent);
    }

    function gift(parent, x, y, w, h) {
        el('rect', {x: x, y: y + 7, width: w, height: h - 7, rx: 2, fill: '#d94b4b'}, parent);
        el('rect', {x: x - 2, y: y + 1, width: w + 4, height: 8, rx: 2, fill: '#e65c5c'}, parent);
        el('rect', {x: x + w / 2 - 3, y: y + 1, width: 6, height: h - 1, fill: '#f2c14e'}, parent);
        el('path', {d: 'M' + (x + w / 2) + ' ' + (y + 1) + ' c-9 -10 -16 -2 -6 1 Z M' + (x + w / 2) + ' ' + (y + 1) + ' c9 -10 16 -2 6 1 Z', fill: '#f2c14e'}, parent);
    }

    function decorateShelves(overlay) {
        const g = el('g', {class: 'glpimod-xmas'}, overlay);
        snowCap(g, 381, 531, 198);          // clock
        snowCap(g, 214, 577, 255.6);        // shelf
        snowCap(g, 137, 334, 314.3);        // speech bubble (left)
        snowCap(g, 0, 842, 555);            // desk
        bauble(g, 262, 150, '#d94b4b');     // plant
        bauble(g, 330, 118, '#f2c14e');
        bauble(g, 393, 148, '#3aa76d');
    }

    function decorateDesk(overlay) {
        const g = el('g', {class: 'glpimod-xmas'}, overlay);
        snowCap(g, 283, 483, 171.6);        // speech bubble
        snowCap(g, 406, 667, 316.4);        // laptop
        snowCap(g, 0, 842, 555);            // desk
        gift(g, 626, 523, 42, 32);          // between laptop and lamp
    }

    function garland(banner) {
        const svg = el('svg', {class: 'glpimod-garland', 'aria-hidden': 'true', focusable: 'false'});
        banner.appendChild(svg);
        function build() {
            clear(svg);
            const w = banner.clientWidth || 1200;
            const span = 110, sag = 16;
            svg.setAttribute('viewBox', '0 0 ' + w + ' 42');
            let d = 'M0 4';
            for (let x = 0; x < w; x += span) d += ' Q' + (x + span / 2) + ' ' + (4 + sag * 2) + ' ' + (x + span) + ' 4';
            el('path', {d: d, fill: 'none', stroke: 'rgba(40,60,90,.55)', 'stroke-width': '1.6'}, svg);
            const colors = ['#e5484d', '#f2c14e', '#3aa76d', '#4c8dff'];
            let n = 0;
            for (let x = 0; x < w; x += span) {
                [0.25, 0.5, 0.75].forEach(function (t) {
                    const px = x + span * t;
                    const py = 4 + 2 * (1 - t) * t * (sag * 2) + 2; // point on the curve
                    el('rect', {x: px - 2, y: py - 1, width: 4, height: 4, rx: 1, fill: 'rgba(40,60,90,.6)'}, svg);
                    el('ellipse', {cx: px, cy: py + 8, rx: 4.2, ry: 6.5, fill: colors[n % 4], class: 'glpimod-bulb glpimod-bulb-' + (n % 3)}, svg);
                    n++;
                });
            }
        }
        build();
        let timer = null;
        window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(build, 200); });
        return svg;
    }

    function snowfall(banner) {
        if (reducedMotion) return null;
        const canvas = document.createElement('canvas');
        canvas.className = 'glpimod-snow';
        canvas.setAttribute('aria-hidden', 'true');
        banner.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let flakes = [], w = 0, h = 0;
        function resize() {
            const ratio = window.devicePixelRatio || 1;
            w = banner.clientWidth; h = banner.clientHeight;
            canvas.width = w * ratio; canvas.height = h * ratio;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.min(70, Math.round(w / 25));
            flakes = Array.from({length: count}, function () {
                return {x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.2, s: 0.25 + Math.random() * 0.55, a: Math.random() * Math.PI * 2};
            });
        }
        resize();
        window.addEventListener('resize', resize);
        (function frame() {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,.85)';
            flakes.forEach(function (f) {
                f.y += f.s; f.a += 0.01; f.x += Math.sin(f.a) * 0.3;
                if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
                ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
            });
            if (canvas.isConnected) requestAnimationFrame(frame);
        })();
        return canvas;
    }

    // ---------------------------------------------------------------- entry point

    let state = {timer: null, nodes: []};

    /**
     * Draws everything inside a banner.
     * @param {HTMLElement} banner  element containing .scene-left / .scene-right
     * @param {{clock:boolean, clock_format:string, season:string, effects?:object}} config
     */
    function render(banner, config) {
        // reset (the configuration page re-renders on every change)
        if (state.timer) clearInterval(state.timer);
        state.nodes.forEach(function (n) { n.remove(); });
        state = {timer: null, nodes: []};
        banner.querySelectorAll('svg.glpimod-overlay').forEach(function (n) { n.remove(); });
        banner.classList.remove('glpimod-season-christmas');

        const left = banner.querySelector('.scene-left');
        const right = banner.querySelector('.scene-right');
        const leftIsShelves = sceneId(left) === 'shelves';
        const rightIsDesk = sceneId(right) === 'desk';
        const effects = Object.assign({snow: true, lights: true, decor: true}, config.effects || {});

        if (config.clock && leftIsShelves) {
            state.timer = drawClock(overlayFor(left), config.clock_format);
        }
        if (isChristmas(config.season, new Date())) {
            banner.classList.add('glpimod-season-christmas');
            if (effects.decor && leftIsShelves) decorateShelves(overlayFor(left));
            if (effects.decor && rightIsDesk) decorateDesk(overlayFor(right));
            if (effects.lights) state.nodes.push(garland(banner));
            if (effects.snow) {
                const snow = snowfall(banner);
                if (snow) state.nodes.push(snow);
            }
        }
    }

    window.GlpimodHelpdeskScene = {render: render};

    // Self-service home page: load the configuration and render
    const script = document.currentScript;
    function init() {
        const banner = document.querySelector('.helpdesk-home-container .search-banner');
        if (!banner || !script || !script.src) return;
        const url = script.src.replace(/(public\/)?helpdesk_scene\.js(\?.*)?$/, 'background.php?type=config');
        fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (config) { if (config && config.helpdesk) render(banner, config.helpdesk); })
            .catch(function () {});
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
