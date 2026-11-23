/*
 * glpimod - GLPI Mod (based on "UI Branding plugin for GLPI" by i-Vertix)
 * Self-service home page ("¿Cómo podemos ayudarte?"):
 *   - real time on the clock of the native "shelves" illustration (drawn over the original "9:00")
 *   - seasonal themes following a Colombian / Caribbean calendar (automatic) or a fixed theme
 *
 * The native scenes are SVG sprites referenced with <use>, whose content cannot be modified from the
 * page, so everything is drawn in an overlay with the same viewBox (842x596), using the GLPI
 * illustration colour variables so it follows the active palette.
 * Scene-specific decoration is only drawn when the entity uses the default scenes (shelves / desk).
 *
 * Each theme has three layers that can be switched off: decor (scene), top (garland / pennants...)
 * and particles (snow, confetti, petals...). Animations honour prefers-reduced-motion.
 */
(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const FACE = 'var(--glpi-illustrations-color, var(--glpi-illustrations-gradient-1, #E5EAF6))';
    const INK = 'var(--glpi-illustrations-color-3, var(--glpi-illustrations-gradient-3, #85A0D8))';
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const C = {
        red: '#e5484d', yellow: '#f2c14e', green: '#3aa76d', blue: '#3b7fd9', orange: '#f08c2e', purple: '#8b5cf6',
        pink: '#f472b6', rose: '#fda4af', white: '#ffffff', gold: '#e0b23a', brown: '#9a6b3f', dark: '#2f3a4a',
        turquoise: '#2ec4b6', coral: '#ff7f6e', cream: '#fff4d6',
    };

    // ------------------------------------------------------------------ helpers

    function el(tag, attrs, parent) {
        const node = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
        if (parent) parent.appendChild(node);
        return node;
    }

    /** group translated/scaled to (x, y) with scale s: shapes are drawn in local coordinates */
    function at(parent, x, y, s, rotate) {
        return el('g', {transform: 'translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')' + (rotate ? ' rotate(' + rotate + ')' : '')}, parent);
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
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

    // ------------------------------------------------------------------ calendar

    function day(y, m, d) { return new Date(y, m, d); }

    function easter(y) { // Gregorian computus (Meeus/Jones/Butcher)
        const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
        const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1;
        return day(y, month - 1, dd);
    }

    function addDays(date, n) { const r = new Date(date); r.setDate(r.getDate() + n); return r; }

    /** n-th given weekday (0 = Sunday) of a month */
    function nthWeekday(y, m, weekday, n) {
        const first = day(y, m, 1);
        return day(y, m, 1 + ((7 + weekday - first.getDay()) % 7) + (n - 1) * 7);
    }

    /** last given weekday (0 = Sunday) of a month */
    function lastWeekday(y, m, weekday) {
        const last = day(y, m + 1, 0);
        return day(y, m, last.getDate() - ((7 + last.getDay() - weekday) % 7));
    }

    /**
     * Theme dates for a year: [start, end] inclusive. Order = priority when two themes overlap.
     */
    const CALENDAR = {
        christmas: function (y) { return [day(y, 11, 1), day(y + 1, 0, 6)]; },      // + 1-6 January, see inSeason()
        candelaria: function (y) { return [day(y, 0, 30), day(y, 1, 2)]; },
        carnival: function (y) { const ash = addDays(easter(y), -46); return [addDays(ash, -10), addDays(ash, -1)]; },
        january_festivals: function (y) { return [day(y, 0, 7), day(y, 0, 31)]; },
        womens_day: function (y) { return [day(y, 2, 4), day(y, 2, 8)]; },
        rest_week: function (y) { const e = easter(y); return [addDays(e, -7), e]; },
        mothers_day: function (y) { const s = nthWeekday(y, 4, 0, 2); return [addDays(s, -6), s]; },
        fathers_day: function (y) { const s = nthWeekday(y, 5, 0, 3); return [addDays(s, -6), s]; },
        independence: function (y) { return [day(y, 6, 14), day(y, 6, 20)]; },
        kites: function (y) { return [day(y, 7, 1), day(y, 7, 31)]; },
        love_friendship: function (y) { const s = nthWeekday(y, 8, 6, 3); return [addDays(s, -13), s]; },
        halloween: function (y) { return [day(y, 9, 24), day(y, 9, 31)]; },
        cartagena: function (y) { return [day(y, 10, 1), day(y, 10, 15)]; },
        // United States
        valentines: function (y) { return [day(y, 1, 10), day(y, 1, 14)]; },
        st_patricks: function (y) { return [day(y, 2, 14), day(y, 2, 17)]; },
        memorial_day: function (y) { const m = lastWeekday(y, 4, 1); return [addDays(m, -3), m]; },
        us_independence: function (y) { return [day(y, 6, 1), day(y, 6, 4)]; },
        thanksgiving: function (y) { const t = nthWeekday(y, 10, 4, 4); return [addDays(t, -3), addDays(t, 3)]; },
    };
    const ORDER = Object.keys(CALENDAR);

    function inSeason(id, date) {
        const y = date.getFullYear();
        const today = day(y, date.getMonth(), date.getDate());
        if (id === 'christmas') { // crosses the year
            return date.getMonth() === 11 || (date.getMonth() === 0 && date.getDate() <= 6);
        }
        const range = CALENDAR[id](y);
        return today >= range[0] && today <= range[1];
    }

    /** theme active on a date among the enabled ones (automatic mode) */
    function activeTheme(date, enabled) {
        for (let i = 0; i < ORDER.length; i++) {
            const id = ORDER[i];
            if ((!enabled || enabled.indexOf(id) >= 0) && inSeason(id, date)) return id;
        }
        return null;
    }

    /** next theme that will start after a date: {id, start} */
    function nextTheme(date, enabled) {
        let best = null;
        const today = day(date.getFullYear(), date.getMonth(), date.getDate());
        ORDER.forEach(function (id) {
            if (enabled && enabled.indexOf(id) < 0) return;
            [date.getFullYear(), date.getFullYear() + 1].forEach(function (y) {
                const start = CALENDAR[id](y)[0];
                if (start > today && (!best || start < best.start)) best = {id: id, start: start};
            });
        });
        return best;
    }

    function dateRange(id, year) {
        return CALENDAR[id] ? CALENDAR[id](year) : null;
    }

    // ------------------------------------------------------------------ clock

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
                el('rect', {x: x + gap, y: top + 1.5 * p, width: colonW, height: colonW, fill: INK}, group);
                el('rect', {x: x + gap, y: top + 4.5 * p, width: colonW, height: colonW, fill: INK}, group);
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
        el('rect', {x: 404, y: 203, width: 122, height: 45, rx: 3, fill: FACE}, clock); // hides the static "9:00"
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

    // ------------------------------------------------------------------ shapes (local coordinates)

    function snowCap(parent, x1, x2, y) {
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
            if (i % 2) d += ' L' + (cx + 4) + ' ' + (y + 2.5) + ' Q' + cx + ' ' + (y + 9 + (i % 3) * 2) + ' ' + (cx - 4) + ' ' + (y + 2.5);
        }
        d += ' L' + x1 + ' ' + (y + 2.5) + ' Z';
        el('path', {d: d, fill: C.white, stroke: 'rgba(133,160,216,.35)', 'stroke-width': '0.8'}, parent);
    }

    function bauble(parent, cx, cy, color) {
        el('line', {x1: cx, y1: cy - 15, x2: cx, y2: cy - 7, stroke: INK, 'stroke-width': '1.2'}, parent);
        el('rect', {x: cx - 2.5, y: cy - 9.5, width: 5, height: 3.5, rx: 1, fill: C.gold}, parent);
        el('circle', {cx: cx, cy: cy, r: 7, fill: color}, parent);
        el('circle', {cx: cx - 2.4, cy: cy - 2.4, r: 1.8, fill: 'rgba(255,255,255,.65)'}, parent);
    }

    /** gift box standing on y (bottom), centred on x */
    function gift(parent, x, y, w, h, color, ribbon) {
        const g = at(parent, x - w / 2, y - h, 1);
        el('rect', {x: 0, y: 7, width: w, height: h - 7, rx: 2, fill: color || '#d94b4b'}, g);
        el('rect', {x: -2, y: 1, width: w + 4, height: 8, rx: 2, fill: color || '#e65c5c', opacity: '.9'}, g);
        el('rect', {x: w / 2 - 3, y: 1, width: 6, height: h - 1, fill: ribbon || C.yellow}, g);
        el('path', {d: 'M' + (w / 2) + ' 1 c-9 -10 -16 -2 -6 1 Z M' + (w / 2) + ' 1 c9 -10 16 -2 6 1 Z', fill: ribbon || C.yellow}, g);
    }

    /** candle standing on (x, y bottom) */
    function candle(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('ellipse', {cx: 0, cy: 0, rx: 11, ry: 3, fill: C.gold}, g);
        el('rect', {x: -5, y: -30, width: 10, height: 29, rx: 2, fill: color || C.cream, stroke: 'rgba(0,0,0,.08)'}, g);
        el('line', {x1: 0, y1: -30, x2: 0, y2: -34, stroke: C.dark, 'stroke-width': '1.2'}, g);
        const flame = el('g', {class: 'glpimod-flame'}, g);
        el('path', {d: 'M0 -50 C6 -42 6 -36 0 -33 C-6 -36 -6 -42 0 -50 Z', fill: C.orange}, flame);
        el('path', {d: 'M0 -44 C3 -40 3 -37 0 -35 C-3 -37 -3 -40 0 -44 Z', fill: C.yellow}, flame);
        el('circle', {cx: 0, cy: -40, r: 14, fill: 'rgba(242,193,78,.18)'}, flame);
    }

    function heart(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M0 6 C-12 -3 -9 -14 0 -8 C9 -14 12 -3 0 6 Z', fill: color || C.red}, g);
    }

    function flower(parent, x, y, s, color, center) {
        const g = at(parent, x, y, s || 1);
        for (let i = 0; i < 5; i++) {
            el('ellipse', {cx: 0, cy: -6, rx: 4.2, ry: 6.5, fill: color || C.pink, transform: 'rotate(' + (i * 72) + ')'}, g);
        }
        el('circle', {cx: 0, cy: 0, r: 3.6, fill: center || C.yellow}, g);
    }

    function tulips(parent, x, y, s) { // small vase with tulips, standing on y
        const g = at(parent, x, y, s || 1);
        [[-10, -58, C.pink], [0, -66, C.red], [10, -56, C.purple]].forEach(function (t) {
            el('path', {d: 'M0 -18 Q' + (t[0] / 2) + ' ' + (t[1] / 2) + ' ' + t[0] + ' ' + t[1], stroke: C.green, 'stroke-width': '2', fill: 'none'}, g);
            el('path', {d: 'M' + (t[0] - 6) + ' ' + t[1] + ' L' + (t[0] - 6) + ' ' + (t[1] - 9) + ' L' + (t[0] - 2) + ' ' + (t[1] - 5) + ' L' + t[0] + ' ' + (t[1] - 10) + ' L' + (t[0] + 2) + ' ' + (t[1] - 5) + ' L' + (t[0] + 6) + ' ' + (t[1] - 9) + ' L' + (t[0] + 6) + ' ' + t[1] + ' Q' + t[0] + ' ' + (t[1] + 6) + ' ' + (t[0] - 6) + ' ' + t[1] + ' Z', fill: t[2]}, g);
        });
        el('path', {d: 'M-12 -20 L12 -20 L9 0 L-9 0 Z', fill: C.turquoise}, g);
    }

    function crown(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M-20 0 L-22 -22 L-11 -11 L0 -28 L11 -11 L22 -22 L20 0 Z', fill: C.gold, stroke: '#b8901f', 'stroke-width': '1'}, g);
        el('rect', {x: -21, y: -5, width: 42, height: 5, fill: '#c99a22'}, g);
        [[-22, -22, C.red], [0, -28, C.green], [22, -22, C.blue]].forEach(function (j) {
            el('circle', {cx: j[0], cy: j[1], r: 2.8, fill: j[2]}, g);
        });
        el('circle', {cx: 0, cy: -12, r: 3, fill: C.red}, g);
    }

    function drum(parent, x, y, s) { // tambor alegre, standing on y
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M-14 0 L-17 -40 L17 -40 L14 0 Z', fill: C.brown}, g);
        el('ellipse', {cx: 0, cy: -40, rx: 17, ry: 5, fill: C.cream, stroke: '#7a522e'}, g);
        for (let i = -1; i <= 1; i++) el('path', {d: 'M' + (i * 9 - 6) + ' -36 L' + (i * 9 + 6) + ' -4', stroke: C.yellow, 'stroke-width': '1.4'}, g);
        el('rect', {x: -15, y: -4, width: 30, height: 4, fill: C.red}, g);
    }

    function flag(parent, x, y, s, stripes) { // flag on a stick, stick base on (x, y); stripes: [[color, weight]]
        const g = at(parent, x, y, s || 1);
        el('line', {x1: 0, y1: 0, x2: 0, y2: -60, stroke: C.dark, 'stroke-width': '2'}, g);
        const total = stripes.reduce(function (a, st) { return a + st[1]; }, 0);
        let yy = -58;
        stripes.forEach(function (st) {
            const h = 24 * st[1] / total;
            el('rect', {x: 1, y: yy, width: 36, height: h + 0.3, fill: st[0]}, g);
            yy += h;
        });
    }

    function star(parent, cx, cy, r, color) {
        let d = '';
        for (let i = 0; i < 10; i++) {
            const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
            d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2) + ' ';
        }
        el('path', {d: d + 'Z', fill: color}, parent);
    }

    function cartagenaFlag(parent, x, y, s) {
        const g = at(parent, x, y, s || 1);
        el('line', {x1: 0, y1: 0, x2: 0, y2: -60, stroke: C.dark, 'stroke-width': '2'}, g);
        el('rect', {x: 1, y: -58, width: 36, height: 24, fill: C.red}, g);
        el('rect', {x: 6, y: -54, width: 26, height: 16, fill: C.yellow}, g);
        el('rect', {x: 10, y: -51, width: 18, height: 10, fill: C.green}, g);
        star(g, 19, -46, 3.2, C.white);
    }

    function mask(parent, x, y, s) { // carnival eye mask with feathers
        const g = at(parent, x, y, s || 1);
        [[-14, C.green], [-6, C.yellow], [2, C.red], [10, C.purple]].forEach(function (f, i) {
            el('path', {d: 'M' + f[0] + ' -6 C' + (f[0] - 4) + ' -26 ' + (f[0] + 10) + ' -34 ' + (f[0] + 6 + i) + ' -40 C' + (f[0] + 8) + ' -26 ' + (f[0] + 6) + ' -14 ' + (f[0] + 4) + ' -6 Z', fill: f[1]}, g);
        });
        el('path', {d: 'M-24 0 C-22 -12 -6 -12 0 -5 C6 -12 22 -12 24 0 C22 10 6 10 0 4 C-6 10 -22 10 -24 0 Z', fill: C.purple}, g);
        el('ellipse', {cx: -11, cy: -1, rx: 6, ry: 3.6, fill: C.dark}, g);
        el('ellipse', {cx: 11, cy: -1, rx: 6, ry: 3.6, fill: C.dark}, g);
        el('path', {d: 'M-24 0 C-22 -12 -6 -12 0 -5 C6 -12 22 -12 24 0', stroke: C.gold, 'stroke-width': '1.6', fill: 'none'}, g);
    }

    function sombrero(parent, x, y, s) { // sombrero vueltiao
        const g = at(parent, x, y, s || 1);
        el('ellipse', {cx: 0, cy: 0, rx: 42, ry: 9, fill: C.cream, stroke: C.dark, 'stroke-width': '1'}, g);
        for (let i = 1; i <= 3; i++) el('ellipse', {cx: 0, cy: 0, rx: 42 - i * 8, ry: 9 - i * 1.7, fill: 'none', stroke: C.dark, 'stroke-width': '1.6', 'stroke-dasharray': '3 2'}, g);
        el('path', {d: 'M-16 -2 C-16 -26 16 -26 16 -2 Z', fill: C.cream, stroke: C.dark, 'stroke-width': '1'}, g);
        for (let i = 0; i < 3; i++) el('path', {d: 'M-15 ' + (-6 - i * 6) + ' Q0 ' + (-10 - i * 6) + ' 15 ' + (-6 - i * 6), stroke: C.dark, 'stroke-width': '1.6', fill: 'none', 'stroke-dasharray': '3 2'}, g);
    }

    function pumpkin(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        el('rect', {x: -2, y: -34, width: 4, height: 8, rx: 1.5, fill: '#4f7a3a'}, g);
        [-14, 14, 0].forEach(function (dx) {
            el('ellipse', {cx: dx, cy: -14, rx: dx ? 12 : 13, ry: 14, fill: dx ? '#e8792b' : C.orange}, g);
        });
        el('path', {d: 'M-10 -18 l4 -5 l4 5 Z M2 -18 l4 -5 l4 5 Z', fill: C.dark}, g);
        el('path', {d: 'M-11 -9 Q0 -1 11 -9 L8 -6 L5 -9 L2 -6 L-1 -9 L-4 -6 L-7 -9 Z', fill: C.dark}, g);
    }

    function bat(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M0 0 C-6 -6 -14 -8 -24 -4 C-18 -2 -16 2 -17 6 C-12 2 -8 4 -5 7 C-3 3 -1 3 0 4 C1 3 3 3 5 7 C8 4 12 2 17 6 C16 2 18 -2 24 -4 C14 -8 6 -6 0 0 Z', fill: color || C.dark}, g);
        el('path', {d: 'M-3 -1 L-4 -6 L-1 -3 L1 -3 L4 -6 L3 -1 Z', fill: color || C.dark}, g);
    }

    function web(parent, x, y, s, flip) { // cobweb in a top corner
        const g = el('g', {transform: 'translate(' + x + ' ' + y + ') scale(' + (flip ? -(s || 1) : (s || 1)) + ' ' + (s || 1) + ')'}, parent);
        const stroke = {stroke: 'rgba(255,255,255,.85)', 'stroke-width': '1', fill: 'none'};
        for (let a = 0; a <= 90; a += 22.5) {
            const r = a * Math.PI / 180;
            el('line', Object.assign({x1: 0, y1: 0, x2: 60 * Math.cos(r), y2: 60 * Math.sin(r)}, stroke), g);
        }
        [18, 34, 50].forEach(function (rad) {
            let d = '';
            for (let a = 0; a <= 90; a += 22.5) {
                const r = a * Math.PI / 180;
                d += (a ? ' Q' + (rad * 0.82 * Math.cos(r - 0.2)) + ' ' + (rad * 0.82 * Math.sin(r - 0.2)) + ' ' : 'M') + (rad * Math.cos(r)) + ' ' + (rad * Math.sin(r));
            }
            el('path', Object.assign({d: d}, stroke), g);
        });
    }

    function sun(parent, x, y, s) {
        const g = at(parent, x, y, s || 1);
        const rays = el('g', {class: 'glpimod-spin'}, g);
        for (let i = 0; i < 12; i++) {
            el('rect', {x: -2.2, y: -44, width: 4.4, height: 13, rx: 2, fill: C.yellow, transform: 'rotate(' + (i * 30) + ')'}, rays);
        }
        el('circle', {cx: 0, cy: 0, r: 25, fill: C.yellow}, g);
        el('circle', {cx: 0, cy: 0, r: 19, fill: '#f7d36b'}, g);
    }

    function sunglasses(parent, x, y, s) {
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M-24 -8 L24 -8', stroke: C.dark, 'stroke-width': '2.4'}, g);
        el('path', {d: 'M-24 -8 Q-24 6 -13 6 Q-3 6 -3 -8 Z M3 -8 Q3 6 13 6 Q24 6 24 -8 Z', fill: C.dark}, g);
        el('path', {d: 'M-19 -5 L-15 -5 M8 -5 L12 -5', stroke: 'rgba(255,255,255,.6)', 'stroke-width': '1.6'}, g);
    }

    function drink(parent, x, y, s) { // tropical glass standing on y
        const g = at(parent, x, y, s || 1);
        el('line', {x1: 4, y1: -38, x2: 12, y2: -58, stroke: C.red, 'stroke-width': '2.4'}, g);
        el('path', {d: 'M-14 -40 L14 -40 L10 -6 L-10 -6 Z', fill: 'rgba(255,255,255,.75)', stroke: 'rgba(0,0,0,.12)'}, g);
        el('path', {d: 'M-12.5 -30 L12.5 -30 L10 -6 L-10 -6 Z', fill: C.orange}, g);
        el('rect', {x: -2, y: -6, width: 4, height: 5, fill: 'rgba(255,255,255,.75)'}, g);
        el('ellipse', {cx: 0, cy: 0, rx: 10, ry: 2.5, fill: 'rgba(255,255,255,.8)'}, g);
        el('circle', {cx: -12, cy: -40, r: 7, fill: '#9ccc3a'}, g);
        el('circle', {cx: -12, cy: -40, r: 4.5, fill: '#d4ec8a'}, g);
    }

    function umbrella(parent, x, y, s) { // beach umbrella planted on y
        const g = at(parent, x, y, s || 1);
        el('line', {x1: 0, y1: 0, x2: 4, y2: -82, stroke: C.dark, 'stroke-width': '2.4'}, g);
        const colors = [C.coral, C.white, C.turquoise, C.white, C.coral];
        for (let i = 0; i < 5; i++) {
            const a = -46 + i * 18.4, b = a + 18.4;
            el('path', {d: 'M4 -82 L' + a + ' -60 Q' + ((a + b) / 2) + ' -66 ' + b + ' -60 Z', fill: colors[i]}, g);
        }
    }

    function suitcase(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M-8 -40 L-8 -46 Q-8 -49 -5 -49 L5 -49 Q8 -49 8 -46 L8 -40', stroke: C.dark, 'stroke-width': '2.4', fill: 'none'}, g);
        el('rect', {x: -22, y: -40, width: 44, height: 36, rx: 4, fill: C.coral}, g);
        el('rect', {x: -22, y: -26, width: 44, height: 5, fill: C.yellow}, g);
        el('circle', {cx: -15, cy: -2, r: 2.6, fill: C.dark}, g);
        el('circle', {cx: 15, cy: -2, r: 2.6, fill: C.dark}, g);
        el('circle', {cx: 8, cy: -33, r: 4, fill: C.turquoise}, g);
    }

    function note(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('ellipse', {cx: 0, cy: 0, rx: 5, ry: 3.6, fill: color || C.dark, transform: 'rotate(-20)'}, g);
        el('path', {d: 'M4.2 -1 L4.2 -22 Q10 -18 12 -12', stroke: color || C.dark, 'stroke-width': '2', fill: 'none'}, g);
    }

    function openBook(parent, x, y, s) { // lying on y
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M0 -4 Q-14 -12 -32 -8 L-32 0 Q-14 -4 0 4 Z', fill: C.white, stroke: 'rgba(0,0,0,.15)'}, g);
        el('path', {d: 'M0 -4 Q14 -12 32 -8 L32 0 Q14 -4 0 4 Z', fill: C.white, stroke: 'rgba(0,0,0,.15)'}, g);
        el('path', {d: 'M-34 -6 L-34 2 Q-14 -2 0 6 Q14 -2 34 2 L34 -6', stroke: C.red, 'stroke-width': '2', fill: 'none'}, g);
    }

    function envelope(parent, x, y, s) { // card with a heart, standing on y
        const g = at(parent, x, y, s || 1, -8);
        el('rect', {x: -18, y: -28, width: 36, height: 26, rx: 2, fill: C.white, stroke: 'rgba(0,0,0,.12)'}, g);
        el('path', {d: 'M-18 -28 L0 -14 L18 -28', stroke: 'rgba(0,0,0,.15)', fill: 'none'}, g);
        heart(g, 0, -12, 0.7, C.red);
    }

    function kite(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M0 -26 L16 0 L0 30 L-16 0 Z', fill: color || C.red}, g);
        el('path', {d: 'M0 -26 L0 30 M-16 0 L16 0', stroke: 'rgba(255,255,255,.7)', 'stroke-width': '1.2'}, g);
        el('path', {d: 'M0 30 q8 10 0 20 q-8 10 0 20 q8 10 0 18', stroke: C.dark, 'stroke-width': '1', fill: 'none'}, g);
        [[4, 40], [-4, 58], [4, 76]].forEach(function (b, i) {
            el('path', {d: 'M' + b[0] + ' ' + b[1] + ' l-5 -3 l0 6 Z M' + b[0] + ' ' + b[1] + ' l5 -3 l0 6 Z', fill: [C.yellow, C.blue, C.green][i]}, g);
        });
    }

    function lantern(parent, x, y, s, color) { // farolito for las velitas
        const g = at(parent, x, y, s || 1);
        el('path', {d: 'M-10 0 L-13 -30 L13 -30 L10 0 Z', fill: color || C.red, opacity: '.92'}, g);
        el('rect', {x: -14, y: -33, width: 28, height: 4, rx: 1, fill: C.dark}, g);
        el('rect', {x: -11, y: -2, width: 22, height: 3, rx: 1, fill: C.dark}, g);
        el('circle', {cx: 0, cy: -15, r: 6, fill: 'rgba(255,230,140,.9)', class: 'glpimod-flame'}, g);
    }

    function shamrock(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        [0, 120, 240].forEach(function (r) {
            el('path', {d: 'M0 0 C-9 -6 -9 -16 -2.5 -16 C-1 -16 0 -15 0 -13 C0 -15 1 -16 2.5 -16 C9 -16 9 -6 0 0 Z', fill: color || C.green, transform: 'rotate(' + r + ')'}, g);
        });
        el('path', {d: 'M0 0 Q3 10 8 15', stroke: color || C.green, 'stroke-width': '2', fill: 'none'}, g);
    }

    function leprechaunHat(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        el('ellipse', {cx: 0, cy: -3, rx: 26, ry: 5, fill: '#1f7a43'}, g);
        el('path', {d: 'M-15 -4 L-12 -38 L12 -38 L15 -4 Z', fill: '#2a9d55'}, g);
        el('rect', {x: -14, y: -16, width: 28, height: 6, fill: C.dark}, g);
        el('rect', {x: -5, y: -18, width: 10, height: 10, rx: 1, fill: 'none', stroke: C.gold, 'stroke-width': '2.2'}, g);
        shamrock(g, 9, -30, 0.45, '#8fd694');
    }

    function potOfGold(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        [[-10, -27], [-2, -31], [7, -28], [14, -25], [-15, -24], [2, -24]].forEach(function (c) {
            el('ellipse', {cx: c[0], cy: c[1], rx: 6, ry: 3, fill: C.gold, stroke: '#b8901f', 'stroke-width': '0.8'}, g);
        });
        el('path', {d: 'M-20 -22 Q-24 -2 -12 0 L12 0 Q24 -2 20 -22 Z', fill: C.dark}, g);
        el('rect', {x: -22, y: -25, width: 44, height: 5, rx: 2.5, fill: '#3c4757'}, g);
    }

    function rose(parent, x, y, s, color) {
        const g = at(parent, x, y, s || 1);
        el('circle', {cx: 0, cy: 0, r: 8, fill: color || C.red}, g);
        el('path', {d: 'M-5 -1 Q0 -8 5 -1 Q0 4 -5 -1 Z M-3 2 Q0 -3 4 2', stroke: 'rgba(0,0,0,.25)', 'stroke-width': '1.2', fill: 'none'}, g);
        el('path', {d: 'M-8 2 Q-12 6 -8 9 Q-4 7 -6 3 Z M8 2 Q12 6 8 9 Q4 7 6 3 Z', fill: C.green}, g);
    }

    function rosesVase(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        [[-9, -52], [0, -62], [9, -50]].forEach(function (t) {
            el('path', {d: 'M0 -18 Q' + (t[0] / 2) + ' ' + (t[1] / 2) + ' ' + t[0] + ' ' + t[1], stroke: C.green, 'stroke-width': '2', fill: 'none'}, g);
            rose(g, t[0], t[1], 0.8, C.red);
        });
        el('path', {d: 'M-11 -20 L11 -20 L8 0 L-8 0 Z', fill: C.pink}, g);
    }

    function usFlag(parent, x, y, s) { // flag on a stick, base on (x, y)
        const g = at(parent, x, y, s || 1);
        el('line', {x1: 0, y1: 0, x2: 0, y2: -60, stroke: C.dark, 'stroke-width': '2'}, g);
        for (let i = 0; i < 7; i++) {
            el('rect', {x: 1, y: -58 + i * (24 / 7), width: 38, height: 24 / 7 + 0.2, fill: i % 2 ? C.white : '#c8323a'}, g);
        }
        el('rect', {x: 1, y: -58, width: 16, height: 13, fill: '#2b3f8c'}, g);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
            el('circle', {cx: 3.5 + c * 3.8, cy: -55.5 + r * 4, r: 0.9, fill: C.white}, g);
        }
    }

    function poppy(parent, x, y, s) {
        const g = at(parent, x, y, s || 1);
        [0, 90, 180, 270].forEach(function (r) {
            el('ellipse', {cx: 0, cy: -5, rx: 5.5, ry: 6, fill: '#d62f2f', transform: 'rotate(' + r + ')'}, g);
        });
        el('circle', {cx: 0, cy: 0, r: 3, fill: C.dark}, g);
    }

    function pie(parent, x, y, s) { // pumpkin pie standing on y
        const g = at(parent, x, y, s || 1);
        el('ellipse', {cx: 0, cy: -2, rx: 26, ry: 6, fill: C.white, stroke: 'rgba(0,0,0,.12)'}, g);
        el('path', {d: 'M-22 -4 L-19 -14 L19 -14 L22 -4 Z', fill: '#d9a05b'}, g);
        el('ellipse', {cx: 0, cy: -14, rx: 19, ry: 4.5, fill: '#e07b2e'}, g);
        for (let i = -16; i <= 16; i += 5) el('circle', {cx: i, cy: -14 + Math.abs(i) * 0.08, r: 2, fill: '#e8b877'}, g);
        el('ellipse', {cx: -3, cy: -16, rx: 5, ry: 2, fill: C.white}, g);
    }

    function leaf(parent, x, y, s, color, rotate) {
        const g = at(parent, x, y, s || 1, rotate || 0);
        el('path', {d: 'M0 -14 L3 -7 L9 -9 L6 -2 L12 1 L5 3 L6 9 L0 6 L-6 9 L-5 3 L-12 1 L-6 -2 L-9 -9 L-3 -7 Z', fill: color || C.orange}, g);
        el('path', {d: 'M0 6 L0 13', stroke: '#8a5a2b', 'stroke-width': '1.4'}, g);
    }

    function turkey(parent, x, y, s) { // standing on y
        const g = at(parent, x, y, s || 1);
        [C.red, C.orange, C.yellow, '#9a6b3f', C.orange, C.red].forEach(function (c, i) {
            el('ellipse', {cx: 0, cy: -38, rx: 7, ry: 22, fill: c, transform: 'rotate(' + (-62 + i * 25) + ' 0 -22)'}, g);
        });
        el('ellipse', {cx: 0, cy: -20, rx: 15, ry: 17, fill: '#8a5a2b'}, g);
        el('circle', {cx: 0, cy: -38, r: 8, fill: '#9a6b3f'}, g);
        el('circle', {cx: -3, cy: -40, r: 1.4, fill: C.dark}, g);
        el('circle', {cx: 3, cy: -40, r: 1.4, fill: C.dark}, g);
        el('path', {d: 'M-2.5 -36 L2.5 -36 L0 -32 Z', fill: C.yellow}, g);
        el('path', {d: 'M1 -35 q3 4 0 8', stroke: C.red, 'stroke-width': '2.2', fill: 'none'}, g);
        el('path', {d: 'M-5 -3 L-5 0 M5 -3 L5 0', stroke: C.orange, 'stroke-width': '2'}, g);
    }

    // ------------------------------------------------------------------ top elements (across the banner)

    function topSvg(banner, build) {
        const svg = el('svg', {class: 'glpimod-garland', 'aria-hidden': 'true', focusable: 'false'});
        banner.appendChild(svg);
        function draw() {
            clear(svg);
            const w = banner.clientWidth || 1200;
            svg.setAttribute('viewBox', '0 0 ' + w + ' 46');
            build(svg, w);
        }
        draw();
        let timer = null;
        window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(draw, 200); });
        return svg;
    }

    function wire(svg, w, span, sag) {
        let d = 'M0 4';
        for (let x = 0; x < w; x += span) d += ' Q' + (x + span / 2) + ' ' + (4 + sag * 2) + ' ' + (x + span) + ' 4';
        el('path', {d: d, fill: 'none', stroke: 'rgba(40,60,90,.5)', 'stroke-width': '1.4'}, svg);
    }

    /** points along the wire: callback(x, y, index) */
    function alongWire(w, span, sag, perSpan, cb) {
        let n = 0;
        for (let x = 0; x < w; x += span) {
            for (let k = 1; k <= perSpan; k++) {
                const t = k / (perSpan + 1);
                cb(x + span * t, 4 + 2 * (1 - t) * t * (sag * 2), n++);
            }
        }
    }

    function lightsTop(colors) {
        return function (svg, w) {
            wire(svg, w, 110, 16);
            alongWire(w, 110, 16, 3, function (x, y, n) {
                el('rect', {x: x - 2, y: y + 1, width: 4, height: 4, rx: 1, fill: 'rgba(40,60,90,.6)'}, svg);
                el('ellipse', {cx: x, cy: y + 10, rx: 4.2, ry: 6.5, fill: colors[n % colors.length], class: 'glpimod-bulb glpimod-bulb-' + (n % 3)}, svg);
            });
        };
    }

    function pennantsTop(colors) {
        return function (svg, w) {
            wire(svg, w, 130, 12);
            alongWire(w, 130, 12, 5, function (x, y, n) {
                el('path', {d: 'M' + (x - 9) + ' ' + (y - 1) + ' L' + (x + 9) + ' ' + (y - 1) + ' L' + x + ' ' + (y + 20) + ' Z', fill: colors[n % colors.length]}, svg);
            });
        };
    }

    function hangingTop(draw) { // items hanging from the wire (hearts, flowers, notes...)
        return function (svg, w) {
            wire(svg, w, 120, 14);
            alongWire(w, 120, 14, 3, function (x, y, n) {
                el('line', {x1: x, y1: y, x2: x, y2: y + 9, stroke: 'rgba(40,60,90,.45)', 'stroke-width': '1'}, svg);
                draw(svg, x, y + 19, n);
            });
        };
    }

    // ------------------------------------------------------------------ particles

    function particles(banner, opts) {
        if (reducedMotion) return null;
        const canvas = document.createElement('canvas');
        canvas.className = 'glpimod-snow';
        canvas.setAttribute('aria-hidden', 'true');
        banner.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const colors = opts.colors || [C.white];
        let items = [], w = 0, h = 0;

        function spawn(initial) {
            const p = {
                x: Math.random() * w,
                y: initial ? Math.random() * h : (opts.dir === 'up' ? h + 10 : -10),
                r: (opts.size || 2) * (0.6 + Math.random() * 0.8),
                s: (opts.speed || 0.5) * (0.5 + Math.random()),
                a: Math.random() * Math.PI * 2,
                rot: Math.random() * Math.PI,
                c: colors[Math.floor(Math.random() * colors.length)],
            };
            if (opts.dir === 'right') { p.x = initial ? Math.random() * w : -40; p.y = 40 + Math.random() * (h * 0.5); }
            if (opts.dir === 'burst') { p.y = 30 + Math.random() * (h * 0.45); p.t = initial ? Math.random() : 0; }
            return p;
        }
        function resize() {
            const ratio = window.devicePixelRatio || 1;
            w = banner.clientWidth; h = banner.clientHeight;
            canvas.width = w * ratio; canvas.height = h * ratio;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.max(2, Math.min(opts.max || 70, Math.round(w / (opts.density || 25))));
            items = Array.from({length: count}, function () { return spawn(true); });
        }
        resize();
        window.addEventListener('resize', resize);

        (function frame() {
            ctx.clearRect(0, 0, w, h);
            items.forEach(function (p, i) {
                p.a += 0.012; p.rot += 0.02;
                if (opts.dir === 'up') { p.y -= p.s; p.x += Math.sin(p.a) * 0.35; }
                else if (opts.dir === 'right') { p.x += p.s; p.y += Math.sin(p.a) * 0.4; }
                else if (opts.dir === 'burst') { p.t += 0.004 + p.s * 0.004; if (p.t > 1) { items[i] = spawn(false); return; } }
                else { p.y += p.s; p.x += Math.sin(p.a) * 0.35; }
                if (p.y > h + 20 || p.y < -20 || p.x > w + 60) items[i] = spawn(false);
                opts.draw(ctx, p);
            });
            if (canvas.isConnected) requestAnimationFrame(frame);
        })();
        return canvas;
    }

    const DRAW = {
        dot: function (ctx, p) { ctx.globalAlpha = .85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; },
        confetti: function (ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); ctx.restore(); },
        petal: function (ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = .85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.8, 0, 0, 7); ctx.fill(); ctx.restore(); },
        heart: function (ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.r / 6, p.r / 6); ctx.globalAlpha = .8; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-12, -3, -9, -14, 0, -8); ctx.bezierCurveTo(9, -14, 12, -3, 0, 6); ctx.fill(); ctx.restore();
        },
        note: function (ctx, p) { ctx.globalAlpha = .75; ctx.fillStyle = p.c; ctx.font = (p.r * 7) + 'px serif'; ctx.fillText(p.rot % 2 > 1 ? '♪' : '♫', p.x, p.y); ctx.globalAlpha = 1; },
        ember: function (ctx, p) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
            g.addColorStop(0, 'rgba(255,214,120,.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, 7); ctx.fill();
        },
        sparkle: function (ctx, p) {
            const a = 0.35 + 0.65 * Math.abs(Math.sin(p.a * 3));
            ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath();
            for (let i = 0; i < 8; i++) { const r = i % 2 ? p.r * 0.35 : p.r * 1.6, ang = i * Math.PI / 4; ctx.lineTo(r * Math.cos(ang), r * Math.sin(ang)); }
            ctx.fill(); ctx.restore();
        },
        bat: function (ctx, p) {
            const flap = Math.sin(p.a * 8) * 4;
            ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.r / 4, p.r / 4); ctx.fillStyle = 'rgba(47,58,74,.85)'; ctx.beginPath();
            ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10, -8 - flap, -22, -2 - flap); ctx.quadraticCurveTo(-14, 0, -12, 6); ctx.quadraticCurveTo(-6, 2, 0, 6);
            ctx.quadraticCurveTo(6, 2, 12, 6); ctx.quadraticCurveTo(14, 0, 22, -2 - flap); ctx.quadraticCurveTo(10, -8 - flap, 0, 0); ctx.fill(); ctx.restore();
        },
        kite: function (ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.a) * 0.15); ctx.scale(p.r / 5, p.r / 5);
            ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(13, 0); ctx.lineTo(0, 24); ctx.lineTo(-13, 0); ctx.fill();
            ctx.strokeStyle = 'rgba(47,58,74,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 24);
            for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo((i % 2 ? 8 : -8) + Math.sin(p.a * 2 + i) * 3, 24 + i * 9 - 4, Math.sin(p.a + i) * 3, 24 + i * 9);
            ctx.stroke(); ctx.restore();
        },
        shamrock: function (ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.r / 6, p.r / 6); ctx.globalAlpha = .85; ctx.fillStyle = p.c;
            for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-9, -6, -9, -16, -2.5, -16); ctx.bezierCurveTo(0, -16, 0, -13, 0, -13); ctx.bezierCurveTo(0, -13, 0, -16, 2.5, -16); ctx.bezierCurveTo(9, -16, 9, -6, 0, 0); ctx.fill(); }
            ctx.restore();
        },
        leaf: function (ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.r / 6, p.r / 6); ctx.globalAlpha = .9; ctx.fillStyle = p.c; ctx.beginPath();
            [[0, -14], [3, -7], [9, -9], [6, -2], [12, 1], [5, 3], [6, 9], [0, 6], [-6, 9], [-5, 3], [-12, 1], [-6, -2], [-9, -9], [-3, -7]].forEach(function (pt, i) { if (i) { ctx.lineTo(pt[0], pt[1]); } else { ctx.moveTo(pt[0], pt[1]); } });
            ctx.fill(); ctx.restore();
        },
        firework: function (ctx, p) { // expanding burst that fades out
            const t = p.t || 0, rad = p.r * 9 * Math.sqrt(t);
            ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t) * 0.85; ctx.fillStyle = p.c;
            for (let k = 0; k < 14; k++) {
                const ang = k * Math.PI * 2 / 14 + p.rot;
                ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * rad, p.y + Math.sin(ang) * rad + t * 6, Math.max(0.6, 1.8 * (1 - t)), 0, 7); ctx.fill();
            }
            ctx.restore();
        },
        cloud: function (ctx, p) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.r / 6, p.r / 6); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath();
            ctx.arc(-14, 4, 10, 0, 7); ctx.arc(0, -2, 14, 0, 7); ctx.arc(16, 4, 10, 0, 7); ctx.rect(-14, 4, 30, 10); ctx.fill(); ctx.restore();
        },
    };

    // ------------------------------------------------------------------ themes
    // shelves anchors: plant leaves (215-425, 45-170), shelf top y 255.6 (free 531-577), bubble top y 314.3 (137-334),
    //                  table top y 555 (free: 20-245 and 560-830), clock top y 198 (381-531)
    // desk anchors:    bubble top y 171.6 (283-483), laptop top y 316.4 (406-667), table top y 555
    //                  (free: 0-150, 600-695 between laptop and lamp), sky top-left (40-260, 20-260)

    function isVelitas(date) { return date && date.getMonth() === 11 && (date.getDate() === 7 || date.getDate() === 8); }

    const THEMES = {
        christmas: {
            top: lightsTop([C.red, C.yellow, C.green, C.blue]),
            particles: {draw: DRAW.dot, colors: [C.white], size: 1.6, speed: 0.55, density: 25},
            shelves: function (g, date) {
                snowCap(g, 381, 531, 198); snowCap(g, 214, 577, 255.6); snowCap(g, 137, 334, 314.3); snowCap(g, 0, 842, 555);
                bauble(g, 262, 150, '#d94b4b'); bauble(g, 330, 118, C.yellow); bauble(g, 393, 148, C.green);
                if (isVelitas(date)) { // Día de las Velitas
                    candle(g, 556, 254, 1); candle(g, 60, 553, 1.4); candle(g, 100, 553, 1.19, C.rose); candle(g, 600, 553, 1.26);
                }
            },
            desk: function (g, date) {
                snowCap(g, 283, 483, 171.6); snowCap(g, 406, 667, 316.4); snowCap(g, 0, 842, 555);
                gift(g, 647, 555, 52, 40);
                if (isVelitas(date)) { lantern(g, 60, 553, 1.4, C.red); lantern(g, 105, 553, 1.19, C.green); }
            },
        },
        january_festivals: { // Hay Festival / Festival de Música de Cartagena
            top: hangingTop(function (g, x, y, n) { note(g, x, y, 0.9, [C.dark, C.blue, C.purple][n % 3]); }),
            particles: {draw: DRAW.note, colors: [C.dark, C.blue, C.purple], size: 2.4, speed: 0.35, dir: 'up', density: 60, max: 22},
            shelves: function (g) {
                openBook(g, 556, 252, 0.88); openBook(g, 120, 551, 1.82);
                note(g, 548, 222, 1.1, C.purple); note(g, 575, 205, 0.9, C.blue);
                note(g, 160, 500, 1.2, C.dark); note(g, 200, 470, 1, C.purple);
            },
            desk: function (g) {
                openBook(g, 75, 551, 1.96); note(g, 470, 140, 1.1, C.blue); note(g, 500, 115, 0.9, C.purple);
                openBook(g, 647, 551, 1.4);
            },
        },
        candelaria: { // Fiestas de la Candelaria (Cerro de La Popa)
            top: lightsTop([C.yellow, C.orange, C.cream]),
            particles: {draw: DRAW.ember, size: 1.4, speed: 0.35, dir: 'up', density: 45, max: 30},
            shelves: function (g) {
                candle(g, 556, 254, 1); candle(g, 60, 553, 1.54); candle(g, 105, 553, 1.19); candle(g, 150, 553, 1.4); candle(g, 600, 553, 1.26);
            },
            desk: function (g) { candle(g, 50, 553, 1.4); candle(g, 95, 553, 1.12); candle(g, 630, 553, 1.33); candle(g, 670, 553, 1.12); },
        },
        carnival: { // Carnaval de Barranquilla
            top: pennantsTop([C.red, C.yellow, C.green, C.blue, C.purple, C.orange]),
            particles: {draw: DRAW.confetti, colors: [C.red, C.yellow, C.green, C.blue, C.purple, C.orange], size: 3, speed: 0.8, density: 20},
            shelves: function (g) {
                mask(g, 300, 112, 1.2); sombrero(g, 120, 548, 1.1);
                star(g, 556, 238, 9, C.yellow); flower(g, 262, 150, 1, C.red); flower(g, 393, 148, 1, C.yellow);
            },
            desk: function (g) { sombrero(g, 750, 450, 1.25); mask(g, 647, 545, 0.9); drum(g, 70, 555, 1.54); },
        },
        womens_day: {
            top: hangingTop(function (g, x, y, n) { flower(g, x, y, 0.9, [C.purple, C.pink, C.rose][n % 3]); }),
            particles: {draw: DRAW.petal, colors: [C.pink, C.rose, '#c4b5fd'], size: 2.6, speed: 0.55, density: 28},
            shelves: function (g) {
                flower(g, 262, 150, 1.4, C.purple); flower(g, 300, 90, 1.2, C.pink); flower(g, 340, 125, 1.3, C.rose); flower(g, 393, 148, 1.3, C.purple);
                tulips(g, 556, 254, 0.94);
            },
            desk: function (g) { tulips(g, 647, 555, 1.54); flower(g, 80, 540, 1.4, C.pink); },
        },
        rest_week: { // Semana Santa como semana de descanso
            top: pennantsTop([C.turquoise, C.yellow, C.coral, C.white]),
            particles: {draw: DRAW.cloud, size: 5, speed: 0.25, dir: 'right', density: 260, max: 6},
            shelves: function (g) { sunglasses(g, 556, 252, 1); suitcase(g, 120, 555, 1.82); drink(g, 205, 555, 1.4); },
            desk: function (g) { sun(g, 120, 90, 1); umbrella(g, 75, 555, 1.4); drink(g, 647, 555, 1.54); },
        },
        mothers_day: {
            top: hangingTop(function (g, x, y, n) { if (n % 2) { heart(g, x, y, 0.9, C.red); } else { flower(g, x, y, 0.9, C.pink); } }),
            particles: {draw: DRAW.heart, colors: [C.pink, C.rose, C.red], size: 4, speed: 0.4, dir: 'up', density: 45, max: 26},
            shelves: function (g) {
                flower(g, 262, 150, 1.3, C.pink); flower(g, 330, 112, 1.2, C.red); flower(g, 393, 148, 1.3, C.rose);
                envelope(g, 556, 254, 1); tulips(g, 120, 555, 1.54); gift(g, 190, 555, 45, 35, C.pink, C.white);
            },
            desk: function (g) { tulips(g, 647, 555, 1.54); heart(g, 480, 140, 1.4, C.pink); heart(g, 505, 118, 1, C.red); },
        },
        fathers_day: { // Día del Padre e inicio de vacaciones de mitad de año
            top: pennantsTop([C.yellow, C.orange, C.blue, C.turquoise]),
            particles: {draw: DRAW.sparkle, colors: [C.white, C.yellow], size: 3, speed: 0.15, dir: 'up', density: 50, max: 24},
            shelves: function (g) { sunglasses(g, 556, 252, 1); gift(g, 120, 555, 50, 37, C.blue, C.yellow); drink(g, 190, 555, 1.4); },
            desk: function (g) { sun(g, 120, 90, 1); drink(g, 647, 555, 1.54); sunglasses(g, 545, 312, 0.9); },
        },
        independence: { // 20 de julio
            top: pennantsTop([C.yellow, C.yellow, C.blue, C.red]),
            particles: {draw: DRAW.confetti, colors: [C.yellow, C.blue, C.red], size: 3, speed: 0.7, density: 24},
            shelves: function (g) {
                const co = [[C.yellow, 2], [C.blue, 1], [C.red, 1]];
                flag(g, 552, 254, 0.94, co); flag(g, 90, 553, 1.54, co); flag(g, 175, 553, 1.26, co);
            },
            desk: function (g) { const co = [[C.yellow, 2], [C.blue, 1], [C.red, 1]]; flag(g, 630, 553, 1.4, co); flag(g, 60, 553, 1.54, co); },
        },
        kites: { // agosto: Batalla de Boyacá y temporada de cometas
            top: pennantsTop([C.red, C.yellow, C.blue, C.green]),
            particles: {draw: DRAW.kite, colors: [C.red, C.yellow, C.blue, C.green, C.purple], size: 5, speed: 0.35, dir: 'right', density: 220, max: 7},
            shelves: function (g) { kite(g, 760, 70, 1.2, C.red); kite(g, 95, 95, 1, C.yellow); },
            desk: function (g) { kite(g, 120, 70, 1.1, C.blue); kite(g, 220, 130, 0.8, C.green); },
        },
        love_friendship: { // Amor y Amistad (3er sábado de septiembre)
            top: hangingTop(function (g, x, y, n) { heart(g, x, y, 1, [C.red, C.pink, C.rose][n % 3]); }),
            particles: {draw: DRAW.heart, colors: [C.red, C.pink, C.rose], size: 4.5, speed: 0.45, dir: 'up', density: 40, max: 30},
            shelves: function (g) {
                heart(g, 262, 150, 1.2, C.red); heart(g, 330, 112, 1, C.pink); heart(g, 393, 148, 1.1, C.red);
                envelope(g, 556, 254, 1); gift(g, 120, 555, 50, 37, C.red, C.pink);
            },
            desk: function (g) { envelope(g, 647, 555, 1.54); heart(g, 480, 140, 1.5, C.red); heart(g, 506, 118, 1, C.pink); },
        },
        halloween: { // Halloween / Día de los niños
            top: lightsTop([C.orange, C.purple, '#a3e635']),
            particles: {draw: DRAW.bat, size: 4, speed: 0.5, dir: 'right', density: 200, max: 6},
            shelves: function (g) {
                pumpkin(g, 556, 255, 0.94); pumpkin(g, 120, 555, 1.82); pumpkin(g, 175, 555, 1.26);
                web(g, 0, 0, 1.4); bat(g, 620, 70, 1.1); bat(g, 690, 110, 0.8);
            },
            desk: function (g) { pumpkin(g, 647, 555, 1.54); web(g, 842, 0, 1.4, true); bat(g, 150, 110, 1); },
        },
        // ---------------- United States
        valentines: { // San Valentín (14 de febrero)
            top: hangingTop(function (g, x, y, n) { if (n % 2) { rose(g, x, y, 0.9, C.red); } else { heart(g, x, y, 1, C.pink); } }),
            particles: {draw: DRAW.petal, colors: [C.red, '#c81e3a', C.rose], size: 2.6, speed: 0.5, density: 30},
            shelves: function (g) {
                rose(g, 262, 150, 1.2, C.red); rose(g, 330, 112, 1.1, '#c81e3a'); rose(g, 393, 148, 1.2, C.red);
                envelope(g, 556, 254, 1); rosesVase(g, 120, 555, 1.5); gift(g, 200, 555, 50, 30, C.red, C.pink);
            },
            desk: function (g) { rosesVase(g, 647, 555, 1.5); heart(g, 480, 140, 1.5, C.red); heart(g, 506, 118, 1, C.pink); },
        },
        st_patricks: { // San Patricio (17 de marzo)
            top: pennantsTop(['#2a9d55', '#8fd694', C.white, C.gold]),
            particles: {draw: DRAW.shamrock, colors: ['#2a9d55', '#3aa76d', '#8fd694'], size: 3.4, speed: 0.5, density: 32},
            shelves: function (g) {
                shamrock(g, 262, 150, 1.3); shamrock(g, 330, 112, 1.1, '#2a9d55'); shamrock(g, 393, 148, 1.3);
                leprechaunHat(g, 556, 255, 1); potOfGold(g, 120, 555, 1.6);
            },
            desk: function (g) { leprechaunHat(g, 750, 452, 1.4); potOfGold(g, 647, 555, 1.4); shamrock(g, 75, 530, 1.6); },
        },
        memorial_day: { // Memorial Day (último lunes de mayo)
            top: pennantsTop(['#c8323a', C.white, '#2b3f8c']),
            particles: {draw: DRAW.sparkle, colors: [C.white, '#c8323a', '#2b3f8c'], size: 2.6, speed: 0.15, dir: 'up', density: 55, max: 22},
            shelves: function (g) {
                poppy(g, 262, 150, 1.3); poppy(g, 330, 112, 1.1); poppy(g, 393, 148, 1.3);
                usFlag(g, 552, 254, 0.95); usFlag(g, 100, 553, 1.5);
            },
            desk: function (g) { usFlag(g, 630, 553, 1.4); poppy(g, 70, 545, 1.6); },
        },
        us_independence: { // 4 de julio
            top: pennantsTop(['#c8323a', C.white, '#2b3f8c']),
            particles: {draw: DRAW.firework, colors: ['#c8323a', C.white, '#4c6fd9', C.yellow], size: 6.5, speed: 0.6, dir: 'burst', density: 130, max: 10},
            shelves: function (g) {
                usFlag(g, 552, 254, 0.95); usFlag(g, 90, 553, 1.5); usFlag(g, 175, 553, 1.2);
                star(g, 600, 60, 8, '#c8323a'); star(g, 640, 40, 5, C.white); star(g, 680, 70, 6, '#2b3f8c');
            },
            desk: function (g) { usFlag(g, 630, 553, 1.4); usFlag(g, 60, 553, 1.5); },
        },
        thanksgiving: { // Acción de Gracias (4.º jueves de noviembre)
            top: hangingTop(function (g, x, y, n) { leaf(g, x, y + 2, 0.9, [C.orange, C.red, C.yellow, C.brown][n % 4], (n % 3 - 1) * 20); }),
            particles: {draw: DRAW.leaf, colors: [C.orange, '#d9532b', C.yellow, '#b5651d'], size: 3.4, speed: 0.55, density: 30},
            shelves: function (g) {
                leaf(g, 262, 150, 1.3, C.orange, -20); leaf(g, 330, 112, 1.1, '#d9532b', 15); leaf(g, 393, 148, 1.3, C.yellow, 30);
                pie(g, 556, 255, 1); turkey(g, 120, 555, 1.5); pumpkin(g, 200, 555, 1.1);
            },
            desk: function (g) { pie(g, 647, 555, 1.4); pumpkin(g, 75, 555, 1.4); leaf(g, 120, 535, 1.5, C.orange, 25); },
        },
        cartagena: { // Fiestas de la Independencia de Cartagena (11 de noviembre)
            top: pennantsTop([C.red, C.yellow, C.green]),
            particles: {draw: DRAW.confetti, colors: [C.red, C.yellow, C.green, C.white], size: 3, speed: 0.75, density: 22},
            shelves: function (g) {
                crown(g, 556, 255, 1.06); cartagenaFlag(g, 70, 553, 1.54); drum(g, 190, 555, 1.54);
                star(g, 600, 60, 8, C.yellow); star(g, 640, 40, 5, C.white);
            },
            desk: function (g) { cartagenaFlag(g, 630, 553, 1.4); drum(g, 70, 555, 1.54); crown(g, 545, 318, 1.17); },
        },
    };

    // ------------------------------------------------------------------ entry point

    let state = {timer: null, nodes: []};

    /**
     * Draws everything inside a banner.
     * @param {HTMLElement} banner element containing .scene-left / .scene-right
     * @param {{clock:boolean, clock_format:string, season:string, seasons?:string[], effects?:object}} config
     *        season: "none" | "auto" | a theme id (fixed)
     * @param {Date} [date] date to evaluate (preview)
     * @return {string|null} theme drawn
     */
    function render(banner, config, date) {
        if (state.timer) clearInterval(state.timer);
        state.nodes.forEach(function (n) { n.remove(); });
        state = {timer: null, nodes: []};
        banner.querySelectorAll('svg.glpimod-overlay').forEach(function (n) { n.remove(); });

        const now = date || new Date();
        const left = banner.querySelector('.scene-left');
        const right = banner.querySelector('.scene-right');
        const leftIsShelves = sceneId(left) === 'shelves';
        const rightIsDesk = sceneId(right) === 'desk';
        const effects = Object.assign({snow: true, lights: true, decor: true}, config.effects || {});

        if (config.clock && leftIsShelves) {
            state.timer = drawClock(overlayFor(left), config.clock_format);
        }

        const themeId = config.season === 'auto' ? activeTheme(now, config.seasons) : (THEMES[config.season] ? config.season : null);
        const theme = themeId ? THEMES[themeId] : null;
        banner.dataset.glpimodTheme = themeId || '';
        if (!theme) return null;

        if (effects.decor && leftIsShelves && theme.shelves) theme.shelves(el('g', {class: 'glpimod-theme'}, overlayFor(left)), now);
        if (effects.decor && rightIsDesk && theme.desk) theme.desk(el('g', {class: 'glpimod-theme'}, overlayFor(right)), now);
        if (effects.lights && theme.top) state.nodes.push(topSvg(banner, theme.top));
        if (effects.snow && theme.particles) {
            const canvas = particles(banner, theme.particles);
            if (canvas) state.nodes.push(canvas);
        }
        return themeId;
    }

    window.GlpimodHelpdeskScene = {
        render: render,
        themes: ORDER,
        activeTheme: activeTheme,
        nextTheme: nextTheme,
        dateRange: dateRange,
    };

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
