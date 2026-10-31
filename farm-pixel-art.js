/* Original artwork for ฟาร์มน้อยพักใจ.
 * Every sprite is painted on an integer pixel grid, then encoded as SVG runs.
 * No remote assets, emoji fonts, smoothing filters, or copied game artwork.
 */
(function (root) {
    'use strict';
    const C = Object.freeze({
        ink: '#4b3845', dark: '#60443e', bark: '#80543f', wood: '#ab7349',
        tan: '#cd9860', light: '#ecc38b', cream: '#fff0c7', white: '#fff9e7',
        green0: '#365943', green1: '#48744b', green2: '#64964e',
        green3: '#8abb60', green4: '#bbd77a', moss: '#799557',
        red0: '#974653', red: '#cc6061', coral: '#ed8a77', pink: '#f2b0b0',
        pinkLight: '#ffdbce', gold0: '#ad763d', gold: '#dfaa51', yellow: '#f5cf75',
        blue0: '#43677d', blue: '#659cae', aqua: '#91c6c5', foam: '#d7e8d8',
        stone0: '#646675', stone: '#90929a', stoneLight: '#c0bfb6',
        purple0: '#645375', purple: '#9b7da2', lavender: '#ccb4cd',
        soil0: '#79513f', soil1: '#a47450', soil2: '#c18b5b'
    });

    // A tiny, deterministic pixel painter. Row runs keep the SVG small even in
    // the 80-item friend-garden preview; transparent cells stay transparent.
    class Pixels {
        constructor(w, h) { this.w = w; this.h = h; this.data = Array(w * h).fill(null); }
        dot(x, y, c) {
            x = Math.round(x); y = Math.round(y);
            if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.data[y * this.w + x] = c;
            return this;
        }
        rect(x, y, w, h, c) {
            for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
                for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.dot(xx, yy, c);
            return this;
        }
        line(x0, y0, x1, y1, c, width = 1) {
            x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
            const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
            const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            for (;;) {
                this.rect(x0, y0, width, width, c);
                if (x0 === x1 && y0 === y1) break;
                const e = 2 * err;
                if (e >= dy) { err += dy; x0 += sx; }
                if (e <= dx) { err += dx; y0 += sy; }
            }
            return this;
        }
        oval(cx, cy, rx, ry, c) {
            for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++)
                for (let x = Math.ceil(cx - rx); x <= Math.floor(cx + rx); x++)
                    if (Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1) this.dot(x, y, c);
            return this;
        }
        poly(points, c) {
            const ys = points.map(p => p[1]);
            for (let y = Math.ceil(Math.min(...ys)); y <= Math.max(...ys); y++) {
                const edges = [];
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const a = points[j], b = points[i];
                    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
                        edges.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
                }
                edges.sort((a, b) => a - b);
                for (let i = 0; i + 1 < edges.length; i += 2)
                    this.rect(Math.ceil(edges[i]), y, Math.floor(edges[i + 1]) - Math.ceil(edges[i]) + 1, 1, c);
            }
            return this;
        }
        blit(other, x, y) {
            other.data.forEach((c, i) => { if (c) this.dot(x + i % other.w, y + Math.floor(i / other.w), c); });
            return this;
        }
        svg(scale = 1) {
            const paths = new Map();
            for (let y = 0; y < this.h; y++) {
                for (let x = 0; x < this.w;) {
                    const c = this.data[y * this.w + x], start = x++;
                    while (x < this.w && this.data[y * this.w + x] === c) x++;
                    if (c) paths.set(c, (paths.get(c) || '') + 'M' + start + ' ' + y + 'h' + (x - start) + 'v1h-' + (x - start) + 'z');
                }
            }
            return '<g shape-rendering="crispEdges"' + (scale !== 1 ? ' transform="scale(' + scale + ')"' : '') + '>'
                + Array.from(paths, ([fill, d]) => '<path fill="' + fill + '" d="' + d + '"/>').join('') + '</g>';
        }
    }
    const cache = new Map();
    function memo(key, draw) {
        if (!cache.has(key)) cache.set(key, draw());
        return cache.get(key);
    }
    function box(p, x, y, w, h, fill, edge = C.ink) {
        p.rect(x, y, w, h, edge).rect(x + 1, y + 1, w - 2, h - 2, fill);
    }
    function ball(p, x, y, rx, ry, fill, shade, highlight) {
        p.oval(x, y, rx, ry, C.ink).oval(x, y - 1, rx - 1, ry - 1, shade || fill)
            .oval(x - 1, y - 2, Math.max(1, rx - 2), Math.max(1, ry - 2), fill);
        if (highlight) p.rect(x - rx + 2, y - ry + 2, 2, 2, highlight);
    }
    function leaf(p, x, y, side = 1, c = C.green3) {
        p.line(x, y, x + side * 4, y - 3, C.green1, 2)
            .rect(x + (side < 0 ? -5 : 2), y - 4, 4, 2, c);
    }
    function flower(p, x, y, c = C.pink) {
        p.rect(x - 1, y - 3, 3, 7, c).rect(x - 3, y - 1, 7, 3, c).dot(x, y, C.yellow).dot(x - 1, y - 2, C.white);
    }
    function sprout(p, x, y) {
        p.rect(x, y - 6, 2, 7, C.green1); leaf(p, x, y - 3, -1); leaf(p, x + 1, y - 5);
    }
    function plank(p, x, y, w, h) {
        box(p, x, y, w, h, C.wood); p.rect(x + 1, y + 1, w - 2, 1, C.light);
        p.rect(x + 3, y + 3, Math.max(1, w - 8), 1, C.tan).dot(x + w - 3, y + 2, C.bark);
    }
    function shadow(p, x = 16, y = 30, rx = 12) { p.oval(x, y, rx, 1, '#61704e'); }
    function windowPane(p, x, y, w = 5, h = 6) {
        box(p, x, y, w, h, C.yellow);
        p.rect(x + 1, y + 1, 1, h - 2, C.cream).line(x, y + Math.floor(h / 2), x + w - 1, y + Math.floor(h / 2), C.bark);
    }
    function roof(p, x, y, w, h, c = C.red, shade = C.red0) {
        p.poly([[x, y + h], [x + w / 2, y], [x + w, y + h], [x + w, y + h + 2], [x, y + h + 2]], C.ink);
        p.poly([[x + 2, y + h], [x + w / 2, y + 1], [x + w - 2, y + h]], c);
        for (let yy = y + 4; yy < y + h + 1; yy += 3) {
            const inset = Math.ceil((y + h - yy) * w / (h * 2));
            p.line(x + inset + 1, yy, x + w - inset - 1, yy, shade);
            for (let xx = x + inset + 3 + (yy % 2) * 2; xx < x + w - inset - 1; xx += 5) p.dot(xx, yy - 1, C.coral);
        }
        p.line(x + w / 2, y + 1, x + 2, y + h, C.light);
    }
    function canopy(p, x, y, r, colors = [C.green0, C.green1, C.green2, C.green3, C.green4]) {
        p.oval(x, y, r, r * .72, colors[0])
            .oval(x - r * .48, y + r * .22, r * .65, r * .5, colors[0])
            .oval(x + r * .52, y + r * .2, r * .65, r * .5, colors[0])
            .oval(x, y - 2, r - 1, r * .64, colors[2])
            .oval(x - r * .46, y, r * .58, r * .46, colors[2])
            .oval(x + r * .48, y, r * .58, r * .46, colors[1])
            .oval(x - r * .23, y - r * .32, r * .68, r * .38, colors[3]);
        for (let i = 0; i < r * 1.7; i++) {
            const xx = x - r * .8 + (i * 11 % Math.max(1, Math.floor(r * 1.6)));
            const yy = y - r * .5 + (i * 7 % Math.max(1, Math.floor(r * .9)));
            if (Math.pow((xx - x) / r, 2) + Math.pow((yy - y) / (r * .7), 2) < .8)
                p.rect(xx, yy, 2, 1, colors[i % 3 === 0 ? 4 : i % 3 === 1 ? 1 : 3]);
        }
    }
    const TREE_COLORS = {
        sakura: [C.red0, '#b96988', '#d98c9f', C.pink, C.pinkLight],
        maple: [C.bark, '#a24f40', '#ce7048', '#e89e55', C.yellow],
        pine: ['#304a48', '#3d6553', '#528365', '#76a17a', '#abc391'],
        mango: ['#354a3c', '#486744', '#658747', '#8ca757', '#c2c97c'],
        wilt: [C.bark, '#8b7750', '#a08b5b', '#bdab75', '#d7c58f']
    };
    function drawTree(p, x, base, height, radius, kind, opts = {}) {
        const colors = TREE_COLORS[opts.wilted ? 'wilt' : kind] || [C.green0, C.green1, C.green2, C.green3, C.green4];
        const top = base - height, cy = top + radius;
        if (height <= 10) { sprout(p, x, base); return base - 11; }
        const tw = height > 32 ? 5 : 3;
        p.rect(x - Math.floor(tw / 2) - 1, cy, tw + 2, base - cy + 1, C.dark)
            .rect(x - Math.floor(tw / 2), cy, tw - 1, base - cy, C.wood)
            .rect(x - Math.floor(tw / 2), cy + 2, 1, base - cy - 2, C.tan);
        p.line(x, cy + 9, x - radius * .65, cy + 1, C.dark, 2).line(x + 1, cy + 5, x + radius * .65, cy - 1, C.dark, 2);
        if (kind === 'pine') {
            for (let i = 0; i < 3; i++) {
                const w = radius * (1 - i * .22), yy = base - 8 - i * height * .2;
                p.poly([[x - w, yy], [x, yy - height * .48], [x + w, yy], [x, yy + 2]], colors[0]);
                p.poly([[x - w + 2, yy - 1], [x, yy - height * .48 + 2], [x + w - 2, yy - 1]], colors[2 + i % 2]);
                p.line(x - w + 4, yy - 2, x - 2, yy - 2, colors[4]);
            }
        } else if (kind === 'bonsai') {
            canopy(p, x - radius * .6, cy + 3, radius * .7, colors);
            canopy(p, x + radius * .55, cy - 2, radius * .7, colors);
            canopy(p, x, cy - 7, radius * .6, colors);
        } else canopy(p, x, cy, radius, colors);
        if (!opts.wilted && opts.flower) {
            const blossoms = kind === 'ratchaphruek' ? C.yellow : C.pink;
            for (let i = 0; i < 5; i++) {
                const xx = Math.round(x + (i % 3 - 1) * radius * .6), yy = Math.round(cy + (i % 2 ? -3 : 4));
                if (kind === 'ratchaphruek') p.rect(xx, yy, 2, 7, C.gold).dot(xx - 1, yy + 3, C.yellow);
                else if (kind === 'mango') ball(p, xx, yy, 2, 3, C.yellow, C.gold);
                else flower(p, xx, yy, blossoms);
            }
        }
        return Math.max(0, kind === 'pine' ? top - 2 : top);
    }

    const DECOR_IDS = [
        'sunflower', 'snail', 'mushroom', 'ladybug', 'lantern', 'fountain', 'rock', 'tree', 'mailbox', 'bench', 'carp', 'tractor',
        'ghost', 'web', 'candle', 'khom', 'diya', 'boat', 'village', 'museum', 'aquarium', 'vase', 'pass', 'fence', 'stones',
        'flowerbed', 'bush', 'lights', 'birdbath', 'swing', 'pond', 'chime', 'sign', 'lamppost', 'birdhouse', 'gnome', 'torii',
        'stonelantern', 'redbridge', 'bamboo', 'sala', 'jar', 'coconut', 'elephant', 'umbrellatable', 'bicycle', 'cafesign',
        'flowercart', 'beachchair', 'sandcastle', 'swimring', 'beachumbrella', 'mushroomhouse', 'flowerarch',
        'logpile', 'logbench', 'picnic', 'woodcart', 'treehouse', 'owltotem', 'minelantern', 'catstatue', 'minecart',
        'stonefountain', 'crystals', 'gemfountain', 'dino', 'geode', 'starfishsign', 'shellchime', 'coralpot',
        'pearllamp', 'lighthouse', 'shipwreck', 'bossshield', 'gardencup', 'trophy-gold', 'trophy-silver', 'trophy-bronze'
    ];
    function drawBench(p, y = 18) {
        plank(p, 3, y - 5, 26, 4); plank(p, 3, y, 26, 4); plank(p, 2, y + 5, 28, 4);
        p.rect(5, y + 9, 3, 6, C.dark).rect(24, y + 9, 3, 6, C.dark);
    }
    function drawLantern(p, x, y, red = false) {
        box(p, x - 4, y, 9, 11, red ? C.red : C.yellow);
        p.rect(x - 3, y + 1, 2, 8, red ? C.coral : C.cream)
            .rect(x - 5, y - 1, 11, 2, C.dark).rect(x - 5, y + 10, 11, 2, C.dark)
            .rect(x, y + 1, 1, 9, red ? C.red0 : C.gold).rect(x, y + 12, 1, 3, C.gold);
    }
    function drawPond(p, fountain = false) {
        p.oval(16, 24, 15, 6, C.ink).oval(16, 23, 14, 5, C.stone)
            .oval(16, 22, 12, 4, C.blue0).oval(15, 21, 11, 3, C.blue);
        p.rect(7, 21, 5, 1, C.aqua).rect(19, 23, 6, 1, C.foam);
        if (fountain) {
            box(p, 14, 10, 4, 13, C.stoneLight); p.rect(10, 11, 12, 3, C.stone).rect(11, 10, 10, 2, C.foam);
            p.line(15, 3, 10, 8, C.aqua).line(16, 3, 22, 9, C.aqua).rect(15, 2, 2, 10, C.aqua);
            p.dot(9, 10, C.foam).dot(23, 11, C.foam);
        } else { p.oval(22, 21, 3, 1, C.green2); flower(p, 23, 19, C.pink); }
        p.dot(4, 24, C.stoneLight).dot(26, 23, C.stoneLight).rect(13, 27, 5, 1, C.stoneLight);
    }
    function drawUmbrella(p, x = 16, y = 4) {
        p.rect(x, y + 8, 2, 20, C.bark);
        p.poly([[x - 14, y + 9], [x - 9, y + 3], [x, y], [x + 9, y + 3], [x + 14, y + 9]], C.ink);
        p.poly([[x - 12, y + 8], [x - 8, y + 4], [x, y + 1], [x - 4, y + 8]], C.coral);
        p.poly([[x - 3, y + 8], [x, y + 1], [x + 5, y + 8]], C.cream);
        p.poly([[x + 6, y + 8], [x + 1, y + 1], [x + 9, y + 4], [x + 12, y + 8]], C.red);
        p.rect(x - 13, y + 9, 27, 2, C.red0);
    }
    function decor(id) {
        const k = id.replace(/^decor-/, '');
        if (!DECOR_IDS.includes(k)) return null;
        return memo('decor:' + k, () => {
            const p = new Pixels(32, 32);
            if (!['ghost', 'web', 'khom', 'chime', 'lights'].includes(k)) shadow(p);
            switch (k) {
                case 'sunflower':
                    p.rect(15, 14, 2, 16, C.green0); leaf(p, 15, 24, -1); leaf(p, 17, 21);
                    p.oval(16, 10, 8, 8, C.gold0).rect(9, 6, 15, 8, C.yellow).rect(12, 3, 8, 15, C.yellow);
                    ball(p, 16, 10, 4, 4, C.wood, C.bark); p.dot(14, 8, C.tan).dot(17, 10, C.tan); break;
                case 'snail':
                    p.rect(4, 27, 25, 3, C.dark).rect(5, 26, 23, 3, C.light).rect(25, 21, 3, 6, C.tan);
                    p.line(25, 22, 25, 18, C.bark).line(28, 23, 29, 19, C.bark).dot(25, 18, C.ink).dot(29, 19, C.ink);
                    ball(p, 14, 21, 8, 8, C.gold, C.wood);
                    p.line(11, 18, 17, 18, C.bark).line(18, 19, 18, 23, C.bark).line(17, 24, 12, 24, C.bark).line(11, 23, 11, 21, C.bark).rect(13, 20, 3, 2, C.bark); break;
                case 'mushroom': case 'mushroomhouse':
                    box(p, 8, 16, 16, 14, C.cream); p.rect(20, 18, 3, 10, C.light);
                    p.oval(16, 14, 14, 10, C.ink).oval(16, 13, 13, 9, C.red0).oval(15, 11, 11, 7, C.red).rect(3, 15, 27, 3, C.red0);
                    p.rect(8, 9, 4, 3, C.cream).rect(17, 6, 4, 3, C.white).rect(22, 12, 3, 3, C.cream);
                    if (k === 'mushroomhouse') { box(p, 14, 22, 6, 8, C.wood); windowPane(p, 8, 19, 5, 5); p.dot(18, 26, C.yellow); }
                    else { p.dot(12, 23, C.ink).dot(19, 23, C.ink).rect(14, 26, 3, 1, C.bark); } break;
                case 'ladybug':
                    p.oval(16, 27, 13, 3, C.green1).line(7, 28, 24, 25, C.green4);
                    ball(p, 16, 21, 8, 6, C.red, C.red0); p.rect(15, 17, 2, 10, C.ink);
                    p.rect(12, 13, 7, 4, C.ink).dot(13, 14, C.white).dot(17, 14, C.white);
                    [[11, 20], [21, 20], [12, 24], [20, 24]].forEach(a => p.rect(a[0], a[1], 2, 2, C.ink)); break;
                case 'lantern': case 'lamppost':
                    box(p, 8, 5, 4, 25, C.wood); p.rect(7, 29, 6, 2, C.dark).rect(10, 4, 15, 3, C.dark).rect(23, 6, 1, 3, C.ink);
                    drawLantern(p, 23, 9, k === 'lantern'); break;
                case 'fountain': case 'stonefountain': case 'gemfountain': case 'pond':
                    drawPond(p, k !== 'pond');
                    if (k === 'gemfountain') p.poly([[16, 1], [20, 6], [16, 11], [12, 6]], C.aqua).dot(15, 5, C.white);
                    break;
                case 'rock':
                    ball(p, 15, 24, 11, 6, C.stone, C.stone0, C.stoneLight);
                    ball(p, 25, 27, 5, 3, C.stoneLight, C.stone); p.rect(7, 21, 5, 2, C.moss).dot(19, 20, C.moss); break;
                case 'tree': drawTree(p, 16, 30, 26, 10, 'classic'); break;
                case 'mailbox':
                    plank(p, 14, 17, 4, 14); box(p, 4, 9, 23, 11, C.red0);
                    p.rect(5, 10, 20, 3, C.red).rect(7, 8, 15, 2, C.red).rect(6, 15, 9, 1, C.ink);
                    p.rect(24, 5, 2, 9, C.bark).rect(26, 5, 5, 4, C.yellow); break;
                case 'bench': drawBench(p, 16); break;
                case 'carp':
                    plank(p, 5, 2, 3, 29); p.rect(4, 1, 5, 2, C.gold);
                    [[6, C.blue, C.aqua], [15, C.red, C.pink]].forEach(([y, c, hi]) => {
                        p.rect(8, y, 17, 6, C.ink).rect(9, y + 1, 15, 4, c);
                        p.poly([[24, y + 3], [30, y - 1], [29, y + 7]], c);
                        p.dot(11, y + 2, C.white).dot(12, y + 2, C.ink);
                        p.rect(16, y + 1, 1, 4, hi).rect(20, y + 1, 1, 4, hi);
                    }); break;
                case 'tractor':
                    box(p, 5, 14, 23, 11, C.green2); box(p, 6, 5, 12, 11, C.green1);
                    box(p, 8, 7, 8, 7, C.aqua); p.rect(9, 8, 2, 4, C.foam).rect(4, 4, 15, 2, C.green0);
                    p.rect(24, 9, 2, 8, C.ink).rect(27, 18, 3, 3, C.yellow);
                    ball(p, 10, 25, 6, 6, C.stone0, C.ink); ball(p, 26, 27, 4, 4, C.stone0, C.ink);
                    p.rect(8, 23, 4, 4, C.gold).rect(25, 26, 2, 2, C.gold); break;
                case 'ghost':
                    p.oval(16, 30, 7, 1, C.stoneLight).oval(16, 14, 10, 10, C.purple0).rect(6, 14, 21, 13, C.purple0)
                        .oval(15, 13, 9, 9, C.white).rect(7, 14, 18, 11, C.white);
                    [8, 15, 22].forEach(x => p.rect(x, 24, 3, 4, C.white));
                    p.rect(11, 14, 2, 3, C.ink).rect(20, 14, 2, 3, C.ink).rect(15, 20, 3, 2, C.purple);
                    p.rect(9, 19, 3, 1, C.pink).rect(22, 19, 2, 1, C.pink); break;
                case 'web':
                    [[30, 7], [29, 17], [27, 29], [16, 29], [6, 30]].forEach(a => p.line(1, 1, a[0], a[1], C.lavender));
                    [8, 16, 24].forEach(n => { p.line(n, 2, n - 2, n - 2, C.white); p.line(n - 2, n - 2, 2, n, C.white); });
                    p.rect(21, 13, 1, 7, C.ink).rect(19, 20, 5, 4, C.ink).dot(20, 21, C.red);
                    p.line(17, 20, 25, 24, C.ink).line(17, 24, 25, 20, C.ink); break;
                case 'candle':
                    box(p, 11, 14, 10, 16, C.coral); p.rect(12, 15, 3, 12, C.yellow).rect(18, 14, 2, 5, C.light);
                    p.rect(15, 11, 2, 4, C.ink).oval(16, 8, 3, 5, C.gold).oval(15, 9, 1, 3, C.cream); break;
                case 'khom': drawLantern(p, 16, 6, true); p.line(16, 0, 16, 5, C.bark); p.rect(12, 20, 1, 9, C.gold).rect(20, 20, 1, 9, C.gold); break;
                case 'diya':
                    p.oval(16, 25, 13, 5, C.bark).oval(16, 23, 12, 3, C.coral).rect(6, 25, 20, 1, C.gold);
                    p.line(20, 23, 23, 17, C.ink).oval(23, 13, 3, 6, C.gold).oval(22, 14, 1, 3, C.cream); break;
                case 'boat':
                    p.rect(3, 29, 26, 2, C.aqua).poly([[2, 20], [29, 20], [24, 28], [8, 28]], C.dark)
                        .poly([[4, 21], [27, 21], [23, 26], [9, 26]], C.wood).rect(7, 23, 18, 1, C.tan);
                    p.rect(15, 3, 2, 18, C.bark).poly([[14, 4], [4, 18], [14, 18]], C.cream)
                        .poly([[18, 5], [26, 17], [18, 17]], C.red); break;
                case 'village': case 'museum':
                    box(p, 3, 15, 26, 15, C.light); roof(p, 1, 4, 29, 10, C.gold, C.gold0);
                    if (k === 'museum') {
                        [5, 13, 23].forEach(x => { box(p, x, 17, 4, 12, C.cream); p.rect(x, 18, 1, 10, C.tan); });
                        box(p, 10, 9, 11, 4, C.cream); p.rect(14, 10, 3, 2, C.gold);
                    } else { windowPane(p, 6, 18); windowPane(p, 22, 18); box(p, 13, 20, 6, 10, C.wood); }
                    p.rect(2, 29, 28, 2, C.bark); break;
                case 'aquarium':
                    box(p, 2, 9, 28, 19, C.aqua); p.rect(3, 12, 26, 13, C.blue).rect(3, 24, 26, 3, C.light);
                    p.rect(1, 8, 30, 3, C.wood).rect(2, 28, 28, 3, C.bark);
                    p.line(7, 24, 5, 17, C.green1).line(8, 24, 10, 19, C.green2);
                    p.rect(16, 17, 7, 3, C.gold).poly([[23, 18], [27, 15], [27, 21]], C.coral).dot(17, 17, C.ink);
                    p.dot(14, 13, C.foam).dot(12, 15, C.foam).rect(4, 12, 1, 5, C.foam); break;
                case 'vase':
                    ball(p, 16, 23, 8, 7, C.blue, C.blue0, C.aqua); box(p, 11, 15, 10, 4, C.aqua);
                    p.rect(15, 8, 2, 9, C.green1); flower(p, 16, 7, C.pink); flower(p, 10, 11, C.yellow); flower(p, 23, 10, C.white); break;
                case 'pass':
                    box(p, 7, 6, 19, 24, C.purple); p.rect(8, 7, 3, 22, C.purple0).rect(12, 8, 11, 2, C.lavender);
                    flower(p, 18, 17, C.yellow); p.rect(13, 25, 9, 1, C.cream).rect(24, 10, 3, 5, C.gold); break;
                case 'fence':
                    [13, 22].forEach(y => { p.rect(1, y, 30, 4, C.bark).rect(1, y, 30, 2, C.light); });
                    [3, 14, 25].forEach(x => {
                        p.poly([[x, 30], [x, 8], [x + 2, 5], [x + 5, 8], [x + 5, 30]], C.dark);
                        p.rect(x + 1, 9, 3, 20, C.cream).rect(x + 1, 8, 2, 17, C.white).dot(x + 2, 14, C.wood).dot(x + 2, 23, C.wood);
                    }); break;
                case 'stones':
                    [[11, 27, 9, 3], [23, 20, 7, 3], [13, 13, 6, 3], [22, 7, 4, 2]].forEach(([x, y, rx, ry]) => ball(p, x, y, rx, ry, C.stoneLight, C.stone));
                    p.rect(1, 27, 3, 2, C.moss).dot(24, 15, C.moss); break;
                case 'flowerbed':
                    plank(p, 2, 25, 28, 6); p.rect(4, 24, 24, 2, C.soil0);
                    [[6, C.pink], [12, C.yellow], [19, C.red], [26, C.lavender]].forEach(([x, c]) => {
                        p.rect(x, 17, 1, 8, C.green1); leaf(p, x, 23, -1);
                        p.rect(x - 2, 12, 5, 5, c).dot(x - 2, 12, null).dot(x, 12, null).dot(x + 2, 12, null).dot(x - 1, 13, C.white);
                    }); break;
                case 'bush': canopy(p, 16, 24, 11); [[8, 23], [17, 20], [23, 25]].forEach(([x, y]) => flower(p, x, y, C.white)); break;
                case 'lights':
                    p.rect(2, 7, 2, 24, C.bark).rect(28, 7, 2, 24, C.bark);
                    p.line(3, 8, 16, 13, C.dark).line(16, 13, 29, 8, C.dark);
                    [6, 12, 19, 25].forEach((x, i) => { const y = i === 1 || i === 2 ? 13 : 10; p.rect(x, y, 2, 4, C.gold).dot(x, y + 1, C.cream); }); break;
                case 'birdbath':
                    box(p, 14, 16, 5, 13, C.stone); p.rect(10, 29, 13, 2, C.stone0);
                    p.oval(16, 16, 12, 4, C.stone0).oval(16, 15, 11, 3, C.stoneLight).rect(8, 14, 15, 2, C.aqua);
                    ball(p, 23, 10, 3, 3, C.blue, C.blue0); p.dot(24, 9, C.ink).dot(27, 10, C.gold); break;
                case 'swing':
                    p.line(3, 30, 8, 6, C.dark, 2).line(28, 30, 24, 6, C.dark, 2); plank(p, 5, 5, 23, 4);
                    p.rect(10, 9, 1, 16, C.tan).rect(22, 9, 1, 16, C.tan); plank(p, 8, 25, 17, 4);
                    [[6, 9], [26, 11], [8, 4]].forEach(([x, y]) => flower(p, x, y, C.pink)); break;
                case 'chime':
                    p.line(16, 1, 16, 8, C.bark).oval(16, 13, 7, 7, C.blue0).oval(15, 12, 6, 6, C.aqua)
                        .rect(8, 16, 16, 2, C.blue0).rect(16, 18, 1, 5, C.bark).rect(13, 23, 6, 8, C.cream).rect(15, 24, 1, 5, C.red); break;
                case 'sign': case 'cafesign':
                    if (k === 'sign') { plank(p, 14, 16, 4, 15); plank(p, 2, 9, 28, 12); }
                    else { p.line(5, 30, 10, 8, C.bark, 2).line(28, 30, 23, 8, C.bark, 2); box(p, 7, 7, 19, 20, C.green0, C.wood); }
                    p.rect(10, 13, 12, 1, C.cream).rect(10, 17, 8, 1, C.light);
                    if (k === 'sign') flower(p, 6, 14, C.pink); else p.rect(10, 21, 10, 1, C.cream); break;
                case 'birdhouse':
                    plank(p, 14, 19, 4, 12); box(p, 7, 11, 18, 12, C.light); roof(p, 4, 3, 24, 9, C.blue, C.blue0);
                    p.oval(16, 15, 3, 3, C.dark).rect(14, 21, 5, 2, C.wood); break;
                case 'gnome':
                    p.rect(8, 28, 7, 3, C.bark).rect(19, 28, 6, 3, C.bark);
                    box(p, 9, 17, 16, 12, C.blue); ball(p, 16, 15, 6, 7, C.light, C.tan);
                    p.poly([[9, 19], [23, 19], [16, 28]], C.white).oval(16, 16, 2, 2, C.coral);
                    p.poly([[6, 13], [17, 1], [24, 13]], C.red0).poly([[8, 12], [17, 3], [21, 12]], C.red); break;
                case 'torii':
                    [6, 23].forEach(x => { box(p, x, 8, 4, 23, C.red); p.rect(x, 26, 4, 5, C.ink); });
                    p.rect(3, 13, 27, 3, C.red0).rect(15, 9, 3, 5, C.red);
                    p.rect(1, 5, 30, 4, C.red).rect(0, 3, 32, 2, C.ink).rect(1, 5, 29, 1, C.coral).dot(0, 2, C.ink).dot(31, 2, C.ink); break;
                case 'stonelantern':
                    box(p, 14, 17, 5, 12, C.stone); p.rect(9, 29, 15, 2, C.stone0);
                    box(p, 10, 10, 13, 9, C.stoneLight); box(p, 14, 12, 5, 5, C.yellow, C.stone0);
                    p.poly([[6, 10], [16, 3], [27, 10]], C.stone0).rect(8, 8, 17, 2, C.stoneLight).rect(15, 1, 3, 3, C.stone); break;
                case 'redbridge':
                    p.poly([[1, 25], [5, 20], [12, 17], [20, 17], [27, 20], [31, 25], [31, 28], [26, 24], [20, 21], [12, 21], [6, 24], [1, 28]], C.red0);
                    p.line(3, 22, 12, 17, C.coral, 2).rect(12, 17, 9, 2, C.coral).line(21, 17, 29, 22, C.coral, 2);
                    [3, 10, 21, 28].forEach((x, i) => p.rect(x, i === 1 || i === 2 ? 9 : 14, 2, 14, C.red));
                    p.line(3, 15, 10, 10, C.red0, 2).rect(10, 10, 13, 2, C.red0).line(23, 10, 30, 15, C.red0, 2); break;
                case 'bamboo':
                    [[9, 9], [16, 3], [23, 12]].forEach(([x, y]) => {
                        box(p, x, y, 4, 30 - y, C.green2, C.green0);
                        for (let yy = y + 5; yy < 29; yy += 6) p.rect(x, yy, 4, 1, C.green4);
                        leaf(p, x, y + 8, -1); leaf(p, x + 3, y + 4, 1);
                    }); break;
                case 'sala':
                    p.rect(4, 28, 25, 3, C.bark); [6, 25].forEach(x => plank(p, x, 15, 2, 14));
                    roof(p, 1, 5, 29, 10, C.red, C.red0); p.rect(15, 1, 2, 6, C.gold).dot(15, 0, C.yellow);
                    p.rect(9, 24, 15, 2, C.wood).rect(5, 27, 23, 1, C.light); break;
                case 'jar':
                    ball(p, 16, 21, 11, 9, C.blue, C.blue0, C.aqua); box(p, 9, 10, 15, 5, C.blue0);
                    p.rect(10, 10, 13, 1, C.aqua); p.line(8, 21, 14, 18, C.cream).line(14, 18, 20, 23, C.cream).line(20, 23, 25, 20, C.cream); break;
                case 'coconut':
                    p.line(15, 29, 18, 11, C.dark, 3).line(15, 28, 17, 12, C.tan);
                    [[4, 15], [5, 7], [14, 3], [29, 7], [30, 15]].forEach(([x, y]) => {
                        p.line(17, 10, x, y, C.green0, 3); p.line(17, 9, x, y - 1, C.green3, 2);
                    });
                    ball(p, 15, 13, 2, 2, C.wood, C.bark); ball(p, 20, 12, 2, 2, C.wood, C.bark); break;
                case 'elephant':
                    ball(p, 16, 20, 11, 7, C.stoneLight, C.stone); p.rect(8, 23, 4, 7, C.stone0).rect(23, 23, 4, 7, C.stone0);
                    ball(p, 9, 16, 7, 7, C.stoneLight, C.stone); p.rect(2, 16, 4, 12, C.stone).rect(3, 25, 6, 3, C.stone);
                    ball(p, 13, 17, 4, 5, C.stone, C.stone0); p.dot(6, 15, C.ink).rect(5, 20, 4, 1, C.cream); break;
                case 'umbrellatable': case 'beachumbrella':
                    drawUmbrella(p);
                    if (k === 'umbrellatable') { plank(p, 5, 21, 23, 4); p.rect(9, 25, 2, 6, C.dark).rect(23, 25, 2, 6, C.dark); p.rect(21, 18, 3, 3, C.cream); }
                    else p.rect(13, 29, 8, 1, C.gold); break;
                case 'bicycle':
                    [8, 25].forEach(x => { p.oval(x, 25, 6, 6, C.ink).oval(x, 25, 4, 4, C.light).dot(x, 25, C.stone0); });
                    p.line(8, 25, 14, 15, C.blue, 2).line(14, 15, 20, 25, C.blue, 2).line(8, 25, 20, 25, C.blue, 2)
                        .line(14, 15, 23, 15, C.blue, 2).line(23, 15, 25, 25, C.blue, 2).rect(11, 12, 7, 2, C.bark).rect(22, 10, 5, 2, C.ink);
                    box(p, 23, 13, 8, 5, C.tan); flower(p, 27, 11, C.pink); break;
                case 'flowercart':
                    plank(p, 3, 18, 23, 9); [8, 23].forEach(x => ball(p, x, 28, 3, 3, C.wood, C.dark));
                    p.line(26, 19, 31, 14, C.bark, 2);
                    [[7, C.pink], [13, C.yellow], [21, C.lavender]].forEach(([x, c]) => { p.rect(x, 11, 1, 8, C.green1); flower(p, x, 10, c); }); break;
                case 'beachchair':
                    p.line(5, 10, 14, 25, C.bark, 2).line(14, 25, 28, 25, C.bark, 2).line(11, 30, 23, 18, C.bark, 2).line(20, 30, 26, 20, C.bark, 2);
                    p.poly([[6, 11], [10, 10], [18, 23], [14, 24]], C.cream).line(9, 11, 16, 22, C.coral, 2); p.rect(14, 23, 14, 2, C.cream); break;
                case 'sandcastle':
                    box(p, 5, 18, 23, 12, C.gold); [5, 13, 22].forEach(x => {
                        box(p, x, 12, 6, 14, C.light, C.gold0); p.rect(x, 10, 2, 4, C.light).rect(x + 4, 10, 2, 4, C.light);
                    });
                    p.rect(14, 23, 5, 7, C.bark).rect(16, 4, 1, 8, C.bark).poly([[17, 4], [24, 6], [17, 8]], C.red); break;
                case 'swimring':
                    p.oval(16, 23, 14, 7, C.red0).oval(16, 22, 13, 6, C.coral).oval(16, 22, 7, 3, C.ink).oval(16, 22, 6, 2, C.aqua);
                    p.rect(5, 18, 4, 5, C.cream).rect(24, 21, 4, 5, C.cream).rect(15, 17, 5, 2, C.cream); break;
                case 'flowerarch':
                    p.rect(3, 11, 3, 20, C.dark).rect(26, 11, 3, 20, C.dark);
                    p.line(4, 12, 10, 5, C.light, 3).rect(10, 4, 12, 3, C.light).line(21, 5, 27, 12, C.light, 3);
                    [[4, 23], [4, 12], [10, 5], [21, 5], [28, 13], [28, 24]].forEach(([x, y], i) => { leaf(p, x, y + 3, i % 2 ? 1 : -1); flower(p, x, y, i % 2 ? C.pink : C.cream); }); break;
                case 'logpile': case 'logbench':
                    [[8, 26], [17, 26], [25, 26], [13, 19], [22, 19]].slice(0, k === 'logbench' ? 3 : 5).forEach(([x, y]) => {
                        p.rect(x - 4, y - 3, 8, 7, C.bark); ball(p, x, y, 4, 3, C.tan, C.wood);
                        p.rect(x - 1, y - 1, 3, 2, C.bark).dot(x, y, C.light);
                    });
                    if (k === 'logbench') plank(p, 2, 18, 28, 5); break;
                case 'picnic':
                    p.poly([[3, 20], [25, 20], [31, 29], [0, 29]], C.red0).poly([[4, 21], [24, 21], [28, 28], [2, 28]], C.cream);
                    for (let x = 4; x < 29; x += 6) p.rect(x, 22, 3, 6, C.pink);
                    p.rect(3, 24, 24, 1, C.red);
                    box(p, 10, 14, 13, 8, C.tan); p.oval(16, 14, 5, 4, C.bark).oval(16, 14, 3, 2, null).rect(11, 17, 11, 5, C.tan);
                    p.rect(12, 18, 9, 1, C.light); break;
                case 'woodcart': case 'minecart':
                    [7, 24].forEach(x => ball(p, x, 28, 3, 3, C.stone0, C.ink));
                    box(p, 2, 17, 27, 10, k === 'woodcart' ? C.wood : C.stone);
                    p.rect(3, 19, 24, 1, k === 'woodcart' ? C.light : C.stoneLight).rect(3, 23, 24, 1, C.dark);
                    if (k === 'woodcart') {
                        plank(p, 5, 11, 18, 5); plank(p, 8, 7, 16, 4); p.line(29, 18, 31, 12, C.bark, 2);
                    } else {
                        [[8, 14], [17, 12], [24, 15]].forEach(([x, y], i) => ball(p, x, y, 5, 4, i === 1 ? C.gold : C.stoneLight, C.stone0));
                        p.rect(0, 31, 32, 1, C.stone0);
                    } break;
                case 'treehouse':
                    drawTree(p, 16, 30, 28, 12, 'classic');
                    box(p, 8, 11, 17, 12, C.light); roof(p, 5, 4, 22, 8, C.red, C.red0);
                    p.rect(7, 23, 21, 2, C.wood); windowPane(p, 10, 14, 5, 5); box(p, 18, 16, 5, 7, C.wood);
                    p.rect(25, 23, 1, 9, C.tan).rect(30, 23, 1, 9, C.tan);
                    [25, 28, 31].forEach(y => p.rect(25, y, 6, 1, C.light)); break;
                case 'owltotem':
                    plank(p, 12, 17, 9, 14); ball(p, 16, 13, 8, 9, C.wood, C.bark);
                    p.poly([[8, 9], [8, 2], [14, 7]], C.bark).poly([[18, 7], [24, 2], [24, 9]], C.bark);
                    [12, 20].forEach(x => { p.oval(x, 11, 4, 4, C.cream).oval(x, 11, 2, 2, C.ink).dot(x - 1, 10, C.white); });
                    p.poly([[14, 15], [19, 15], [16, 18]], C.gold).rect(13, 22, 6, 1, C.light).rect(13, 26, 6, 1, C.light); break;
                case 'minelantern':
                    box(p, 8, 13, 17, 15, C.gold); box(p, 10, 15, 13, 11, C.yellow, C.bark);
                    p.rect(7, 11, 19, 3, C.stone0).rect(6, 28, 21, 3, C.stone0).rect(11, 5, 11, 2, C.stone0)
                        .rect(10, 6, 2, 5, C.stone0).rect(21, 6, 2, 5, C.stone0).rect(11, 16, 3, 8, C.cream);
                    p.rect(16, 15, 1, 11, C.wood); break;
                case 'catstatue':
                    p.rect(6, 28, 22, 3, C.stone0); ball(p, 16, 21, 8, 8, C.stoneLight, C.stone);
                    ball(p, 16, 12, 8, 6, C.stoneLight, C.stone);
                    p.poly([[8, 10], [8, 3], [14, 7]], C.stone).poly([[19, 7], [24, 3], [24, 11]], C.stone);
                    p.rect(7, 18, 3, 7, C.stone).rect(6, 15, 4, 3, C.stoneLight);
                    p.dot(12, 12, C.ink).dot(20, 12, C.ink).dot(16, 15, C.red);
                    p.rect(11, 18, 11, 2, C.red).oval(17, 24, 4, 4, C.gold).rect(16, 22, 2, 4, C.gold0); break;
                case 'crystals': case 'geode':
                    if (k === 'geode') ball(p, 16, 23, 13, 7, C.stone, C.stone0, C.stoneLight);
                    [[7, 14, C.purple], [15, 7, C.aqua], [24, 12, C.lavender]].forEach(([x, y, c]) => {
                        p.poly([[x - 3, 27], [x - 3, y + 5], [x, y], [x + 4, y + 5], [x + 4, 27]], C.ink);
                        p.poly([[x - 2, 26], [x - 2, y + 5], [x, y + 2], [x + 3, y + 5], [x + 3, 26]], c).rect(x - 1, y + 7, 1, 15 - y / 2, C.foam);
                    }); break;
                case 'dino':
                    p.rect(5, 29, 24, 2, C.stone0).rect(8, 27, 1, 2, C.stone0).rect(23, 24, 1, 5, C.stone0);
                    p.line(3, 16, 21, 13, C.tan, 3).line(4, 15, 22, 12, C.cream, 2)
                        .line(21, 13, 22, 7, C.cream, 3).rect(21, 4, 9, 5, C.cream);
                    p.dot(27, 5, C.bark).line(11, 15, 8, 26, C.cream, 2).line(18, 14, 23, 25, C.cream, 2);
                    [9, 13, 17].forEach(x => p.line(x, 15, x + 1, 20, C.light)); break;
                case 'starfishsign':
                    plank(p, 14, 17, 4, 14); plank(p, 2, 12, 28, 10);
                    p.poly([[16, 2], [18, 8], [25, 8], [20, 12], [22, 18], [16, 14], [10, 18], [12, 12], [7, 8], [14, 8]], C.gold0);
                    p.poly([[16, 4], [18, 9], [22, 9], [18, 12], [19, 15], [16, 13], [12, 15], [13, 11], [10, 9], [15, 9]], C.coral); break;
                case 'shellchime':
                    p.line(16, 1, 16, 6, C.bark).line(4, 11, 16, 5, C.wood, 2).line(16, 5, 28, 11, C.wood, 2);
                    [7, 16, 25].forEach((x, i) => {
                        const y = i === 1 ? 28 : 23;
                        p.rect(x, 10, 1, y - 10, C.cream); ball(p, x, y, 4, 3, C.pinkLight, C.coral); p.line(x - 2, y - 1, x, y + 1, C.tan);
                    }); break;
                case 'coralpot':
                    box(p, 6, 23, 22, 8, C.blue); p.rect(5, 22, 24, 3, C.aqua);
                    p.line(16, 23, 16, 8, C.red, 3).line(16, 17, 7, 12, C.coral, 3).line(17, 14, 25, 8, C.pink, 3);
                    p.rect(7, 6, 2, 8, C.coral).rect(24, 4, 2, 7, C.pink).rect(15, 5, 3, 4, C.coral); break;
                case 'pearllamp':
                    box(p, 14, 16, 5, 13, C.gold); p.rect(9, 29, 15, 2, C.gold0);
                    ball(p, 16, 12, 9, 9, C.cream, C.pink, C.white); p.rect(8, 19, 17, 2, C.gold); break;
                case 'lighthouse':
                    p.poly([[9, 30], [11, 10], [23, 10], [25, 30]], C.ink)
                        .poly([[11, 29], [12, 11], [22, 11], [23, 29]], C.cream).rect(12, 18, 11, 5, C.red);
                    box(p, 10, 6, 15, 7, C.yellow); roof(p, 8, 1, 18, 5, C.red, C.red0);
                    p.rect(16, 7, 2, 5, C.bark).rect(8, 13, 19, 2, C.ink).rect(16, 26, 4, 4, C.bark); break;
                case 'shipwreck':
                    box(p, 5, 17, 23, 13, C.wood); p.oval(16, 17, 11, 7, C.bark).rect(6, 16, 21, 6, C.tan);
                    p.rect(5, 23, 23, 2, C.gold).rect(6, 18, 2, 11, C.gold).rect(25, 18, 2, 11, C.gold).rect(14, 22, 6, 5, C.gold);
                    [10, 16, 22].forEach(x => ball(p, x, 15, 3, 2, C.yellow, C.gold)); p.dot(15, 24, C.bark); break;
                case 'bossshield':
                    p.line(3, 5, 28, 27, C.stoneLight, 2).line(28, 5, 3, 27, C.stoneLight, 2);
                    p.poly([[5, 6], [16, 2], [28, 6], [26, 21], [16, 29], [7, 21]], C.ink)
                        .poly([[7, 7], [16, 4], [26, 7], [24, 20], [16, 26], [9, 20]], C.blue);
                    flower(p, 16, 13, C.yellow); break;
                case 'gardencup':
                    box(p, 9, 27, 15, 4, C.wood); p.rect(14, 21, 5, 6, C.gold0);
                    p.oval(6, 14, 5, 5, C.gold).oval(6, 14, 3, 3, null).oval(26, 14, 5, 5, C.gold).oval(26, 14, 3, 3, null);
                    p.oval(16, 17, 9, 7, C.gold0).rect(7, 9, 19, 8, C.gold).rect(9, 10, 4, 10, C.yellow).rect(8, 8, 17, 2, C.cream);
                    flower(p, 10, 6, C.pink); flower(p, 22, 6, C.white); break;
                case 'trophy-gold': case 'trophy-silver': case 'trophy-bronze':
                    {
                        const c = k === 'trophy-silver' ? C.stoneLight : k === 'trophy-bronze' ? C.tan : C.yellow;
                        const shade = k === 'trophy-silver' ? C.stone0 : C.gold0;
                        p.oval(6, 12, 5, 5, shade).oval(6, 12, 3, 3, null).oval(26, 12, 5, 5, shade).oval(26, 12, 3, 3, null);
                        p.oval(16, 15, 9, 8, shade).rect(7, 7, 19, 9, shade).rect(8, 8, 17, 6, c).rect(10, 9, 3, 10, C.cream);
                        p.rect(14, 22, 5, 5, shade); box(p, 8, 27, 17, 4, C.wood); p.rect(13, 28, 7, 1, c);
                    } break;
            }
            return p.svg(2);
        });
    }

    function house(level) {
        level = Math.max(0, Math.min(4, level | 0));
        return memo('house:' + level, () => {
            const p = new Pixels(32, 32); shadow(p, 16, 31, 15);
            const colors = [C.gold, C.red, C.blue, C.green2, C.purple];
            if (level >= 3) {
                box(p, 1, 17, 12, 13, C.light); roof(p, 0, 9, 14, 8, C.red, C.red0); windowPane(p, 3, 20);
            }
            const x = level >= 3 ? 11 : 4, w = level >= 3 ? 19 : 24;
            box(p, x, 14, w, 16, level >= 2 ? C.cream : C.light);
            p.rect(x + w - 4, 15, 3, 14, C.tan).rect(x, 29, w, 2, C.bark);
            for (let y = 19; y < 29; y += 4) p.rect(x + 1, y, w - 5, 1, C.tan);
            p.rect(x + w - 8, 5, 3, 8, C.bark).rect(x + w - 9, 4, 5, 2, C.wood);
            roof(p, x - 3, 3, w + 5, 12, colors[level], level === 2 ? C.blue0 : level === 4 ? C.purple0 : C.red0);
            const door = x + Math.floor(w / 2) - 2;
            box(p, door, 21, 6, 9, C.wood); p.rect(door + 1, 22, 1, 6, C.tan).dot(door + 4, 26, C.gold);
            windowPane(p, x + 2, 18, 5, 6);
            if (w > 20) windowPane(p, x + w - 7, 18, 5, 6);
            if (level >= 2) {
                p.rect(0, 29, 32, 2, C.wood); p.rect(1, 28, 7, 1, C.light).rect(25, 28, 6, 1, C.light);
                flower(p, 3, 26, C.pink); flower(p, 29, 26, C.yellow);
            }
            if (level === 4) {
                p.rect(18, 0, 1, 5, C.bark).rect(19, 0, 5, 3, C.red);
                p.oval(20, 11, 2, 2, C.gold).dot(20, 10, C.cream);
            }
            return p.svg(2);
        });
    }
    function pot(kind) {
        return memo('pot:' + kind, () => {
            const p = new Pixels(110, 85);
            if (kind === 'ground') {
                p.oval(55, 80, 25, 4, C.soil0).oval(55, 78, 22, 3, C.soil2);
                [35, 43, 66, 77].forEach(x => sprout(p, x, 81));
            } else {
                const c = kind === 'wood' ? C.wood : kind === 'celadon' ? C.cream : kind === 'stone' ? C.stone : C.coral;
                p.poly([[40, 72], [70, 72], [66, 83], [44, 83]], C.ink)
                    .poly([[42, 72], [68, 72], [65, 81], [45, 81]], c).rect(44, 73, 3, 7, kind === 'stone' ? C.stoneLight : C.light);
                box(p, 39, 69, 32, 5, c); p.rect(40, 70, 30, 1, C.cream).rect(42, 68, 26, 2, C.soil0);
                if (kind === 'wood') { p.rect(44, 77, 22, 1, C.bark).rect(49, 74, 1, 7, C.bark).rect(62, 74, 1, 7, C.bark); }
                if (kind === 'celadon') {
                    p.rect(40, 72, 30, 1, C.blue0).rect(46, 79, 18, 1, C.blue);
                    [48, 54, 60].forEach(x => p.rect(x, 75, 3, 2, C.blue));
                }
                if (kind === 'clay') p.rect(47, 79, 15, 1, C.red0);
            }
            return p.svg(2);
        });
    }
    function tree(kind, stage, opts = {}) {
        stage = Math.max(0, Math.min(4, stage | 0));
        const key = ['tree', kind, stage, !!opts.wilted, !!opts.flower, !!opts.big].join(':');
        return memo(key, () => {
            const p = new Pixels(110, 85), h = [8, 17, 28, 40, 56][stage] * (kind === 'bonsai' ? .65 : 1);
            const top = drawTree(p, 55, 71, h, [3, 5, 11, 15, 20][stage], kind, opts);
            return { top: top * 2, svg: p.svg(2) };
        });
    }

    const CROPS = [
        'carrot', 'tomato', 'corn', 'cabbage', 'chili', 'strawberry', 'pumpkin', 'watermelon', 'tangerine', 'broccoli',
        'grape', 'cherry', 'banana', 'blueberry', 'lemon', 'coconut', 'mushroom', 'pineapple', 'peach', 'avocado',
        'eggplant', 'kiwi', 'sweetPotato', 'cucumber', 'bellPepper', 'onion', 'potato', 'garlic', 'mango', 'melon',
        'apple', 'pear', 'olive', 'greenApple', 'goldLantern', 'moonFruit', 'wheat', 'coffee', 'cocoa', 'tea',
        'rainbowCorn', 'starTomato', 'dragonChili', 'crystalBerry', 'luckyClover', 'moonPumpkin', 'galaxyMelon', 'lotusGod'
    ];
    const FLOWERS = ['sunflower', 'tulip', 'rose', 'daisy', 'hibiscus'];
    const PRODUCT_GROUPS = {
        egg: ['egg', 'duckEgg', 'blackEgg', 'goldenEgg', 'jadeEgg', 'swanEgg'],
        milk: ['milk', 'chocoMilk', 'moonMilk'],
        jar: ['honey', 'wildHoney', 'jam', 'resin', 'truffleOil', 'fishSauce', 'veggieJuice', 'berryJuice', 'salt'],
        wool: ['wool', 'pinkWool', 'rainbowWool', 'cloth'],
        cheese: ['cheese', 'alpineCheese', 'goldCheese', 'butter'],
        mushroom: ['truffle', 'whiteTruffle', 'strawMushroom', 'shiitake', 'lingzhi'],
        wood: ['wood', 'plank'], stone: ['stone', 'coal', 'copperOre', 'ironOre', 'silverOre', 'goldOre'],
        gem: ['ruby', 'emerald', 'sapphire', 'diamond', 'rubyCut', 'emeraldCut', 'sapphireCut', 'diamondCut', 'seaGlass', 'pearl', 'fruitCrystal', 'planetShard'],
        bar: ['copperBar', 'ironBar', 'silverBar', 'goldBar'],
        leaf: ['lemongrass', 'galangal', 'pandan', 'bambooShoot', 'driedTea', 'seaweed'],
        shell: ['conch', 'scallop', 'giantClam'], crab: ['seaCrab'], fish: ['saltedFish', 'cannedTuna'],
        bag: ['flour', 'coffeePowder', 'wovenBasket'], chocolate: ['chocolate'], flower: ['bouquet', 'coral', 'starfish'],
        fossil: ['fSkull', 'fTooth', 'fNeck', 'fRib', 'fSpine', 'fArm', 'fLeg', 'fTail', 'feather'],
        treasure: ['fruitGold', 'fruitHeart', 'fruitRainbow', 'fruitStar', 'nestHeaven', 'crownDeep', 'nagaTrident'],
        chair: ['chair']
    };
    const FISH = ['fish', 'tropical', 'shrimp', 'crab', 'oyster', 'puffer', 'squid', 'lobster', 'octopus', 'shark',
        'dragonFish', 'giantCatfish', 'ghostFish', 'moonWhale', 'skyKoi', 'mackerel', 'tuna', 'grouper', 'barracuda',
        'jellyfish', 'mantaRay', 'swordfish', 'hammerhead', 'giantSquid', 'naga'];
    const DISHES = ['mooncake', 'salad', 'soup', 'bread', 'curry', 'omelet', 'noodle', 'sandwich', 'taco', 'honeyToast', 'fruitPunch',
        'dumpling', 'smoothie', 'pancake', 'carrotCake', 'iceCream', 'custard', 'fruitSalad', 'pumpkinPie', 'scarf', 'woolDoll',
        'pizza', 'cheeseEgg', 'cheesecake', 'grilledFish', 'sushi', 'tempura', 'tomKha', 'bambooCurry', 'stirShiitake',
        'mushroomYum', 'pandanDrink', 'pandanCake', 'lingzhiTea', 'icedCoffee', 'hotChoc', 'thaiTea', 'tomYumKung',
        'somTamPu', 'seaweedSalad', 'crabFriedRice', 'grilledTuna', 'friedMackerel', 'tunaSalad', 'herbTonic', 'farmTea'];
    const ANIMALS = ['hen', 'duck', 'cow', 'sheep', 'goat', 'pig', 'cat', 'dog', 'rabbit', 'hamster'];
    const MACHINES = ['mill', 'juicer', 'churn', 'jam', 'loom', 'oil', 'workbench', 'roaster', 'furnace', 'polisher', 'fishdryer'];
    const GROUP_BY_KEY = {};
    Object.entries(PRODUCT_GROUPS).forEach(([group, keys]) => keys.forEach(k => { GROUP_BY_KEY[k] = group; }));
    function cropPixels(key) {
        const p = new Pixels(24, 24);
        const magic = {
            rainbowCorn: 'corn', starTomato: 'tomato', dragonChili: 'chili', crystalBerry: 'strawberry',
            moonPumpkin: 'pumpkin', galaxyMelon: 'watermelon', lotusGod: 'tulip'
        };
        const original = key; key = magic[key] || key;
        const purple = original === 'galaxyMelon', silver = original === 'moonPumpkin', crystal = original === 'crystalBerry';
        switch (key) {
            case 'carrot':
                p.poly([[7, 8], [18, 9], [13, 20], [10, 23], [9, 16]], C.bark)
                    .poly([[8, 9], [17, 10], [11, 21]], C.coral).line(10, 10, 11, 17, C.gold).rect(12, 13, 3, 1, C.wood);
                p.line(11, 8, 7, 3, C.green1, 2).line(12, 7, 13, 1, C.green2, 2).line(13, 8, 18, 3, C.green3, 2); break;
            case 'corn':
                ball(p, 12, 12, 5, 9, C.yellow, C.gold);
                for (let y = 6; y < 20; y += 3) p.rect(10, y, 5, 1, C.gold0).dot(10, y - 1, C.cream);
                p.poly([[4, 10], [9, 14], [13, 23], [7, 20]], C.green1).poly([[20, 8], [17, 20], [12, 23], [14, 14]], C.green3); break;
            case 'tomato': case 'apple': case 'greenApple': case 'tangerine': case 'peach': case 'bellPepper': case 'melon':
                { const c = key === 'greenApple' || key === 'melon' ? C.green3 : key === 'tangerine' ? C.gold : key === 'peach' ? C.pink : C.red;
                    ball(p, 12, 14, 8, 7, c, key === 'peach' ? C.coral : key === 'melon' || key === 'greenApple' ? C.green1 : C.red0, key === 'peach' ? C.pinkLight : C.cream);
                    p.rect(12, 4, 2, 5, C.bark); leaf(p, 13, 8, 1, C.green2);
                    if (key === 'tomato' || key === 'bellPepper') { p.rect(8, 7, 9, 2, C.green1).line(12, 8, 9, 11, C.green2); }
                    if (key === 'melon') [7, 12, 17].forEach(x => { p.line(x, 10, x + 2, 18, C.green4); p.line(7, x, 18, x + 2, C.green4); });
                    if (key === 'peach') p.line(13, 12, 12, 19, C.coral);
                } break;
            case 'chili':
                p.poly([[6, 8], [13, 6], [18, 10], [18, 16], [13, 20], [4, 22], [11, 17], [12, 12]], C.red0)
                    .poly([[8, 9], [13, 8], [16, 11], [15, 16], [8, 20], [12, 15]], C.red).rect(11, 9, 3, 2, C.coral);
                p.line(12, 8, 14, 3, C.green1, 2).rect(14, 2, 5, 2, C.green2); break;
            case 'strawberry':
                p.poly([[4, 9], [7, 6], [17, 6], [20, 10], [18, 16], [12, 23], [6, 17]], C.ink)
                    .poly([[5, 10], [8, 7], [16, 7], [19, 10], [17, 16], [12, 21], [7, 16]], crystal ? C.aqua : C.red);
                [[8, 11], [14, 10], [10, 15], [16, 15], [12, 18]].forEach(([x, y]) => p.dot(x, y, C.yellow));
                p.rect(8, 6, 9, 2, C.green1).line(12, 7, 6, 5, C.green2).line(12, 7, 17, 3, C.green3).rect(11, 3, 2, 5, C.green2); break;
            case 'pumpkin': case 'watermelon':
                { const c = silver ? C.stoneLight : purple ? C.purple : key === 'watermelon' ? C.green2 : C.gold;
                    ball(p, 12, 15, 10, 7, c, purple ? C.purple0 : silver ? C.stone : key === 'watermelon' ? C.green0 : C.wood, silver ? C.white : C.yellow);
                    [7, 12, 17].forEach(x => p.line(x, 10, x - 1, 20, purple ? C.lavender : silver ? C.stone : key === 'watermelon' ? C.green0 : C.gold0));
                    p.line(12, 9, 13, 4, C.bark, 2).rect(13, 4, 4, 1, C.green1);
                } break;
            case 'cabbage': case 'broccoli':
                if (key === 'broccoli') {
                    p.rect(10, 12, 5, 10, C.green3).rect(11, 13, 2, 8, C.green4);
                    [[6, 9], [12, 6], [18, 10]].forEach(([x, y]) => ball(p, x, y, 5, 5, C.green2, C.green0, C.green3));
                } else {
                    ball(p, 12, 14, 10, 8, C.green3, C.green1, C.green4);
                    p.line(5, 12, 12, 19, C.green1).line(19, 12, 12, 19, C.green1).line(7, 8, 11, 15, C.green4).rect(11, 8, 2, 10, C.green2);
                } break;
            case 'grape': case 'blueberry':
                [[7, 10], [15, 9], [11, 14], [17, 15], [13, 20]].slice(0, key === 'blueberry' ? 3 : 5).forEach(([x, y]) =>
                    ball(p, x, y, 4, 4, key === 'blueberry' ? C.blue : C.purple, key === 'blueberry' ? C.blue0 : C.purple0, C.lavender));
                p.rect(12, 2, 1, 5, C.bark); leaf(p, 12, 5, 1); break;
            case 'cherry':
                p.line(6, 13, 13, 3, C.green1).line(18, 15, 13, 3, C.green1); leaf(p, 13, 4);
                ball(p, 6, 17, 5, 5, C.red, C.red0, C.coral); ball(p, 18, 18, 5, 5, C.red, C.red0, C.coral); break;
            case 'banana':
                p.poly([[3, 7], [7, 12], [13, 15], [20, 10], [20, 16], [16, 21], [9, 21], [4, 17]], C.gold0)
                    .poly([[4, 10], [8, 14], [14, 17], [19, 13], [17, 19], [10, 20], [6, 16]], C.yellow);
                p.line(7, 7, 13, 13, C.yellow, 3).rect(2, 5, 3, 3, C.bark).rect(18, 9, 3, 3, C.green1); break;
            case 'lemon': case 'mango': case 'pear': case 'avocado': case 'olive':
                { const c = key === 'avocado' || key === 'olive' ? C.green2 : key === 'pear' ? C.green3 : C.yellow;
                    ball(p, 12, 14, key === 'olive' ? 5 : 7, 8, c, key === 'mango' ? C.gold : C.green1, C.cream);
                    if (key === 'avocado') { p.oval(12, 14, 5, 6, C.green4); ball(p, 12, 16, 3, 3, C.wood, C.bark); }
                    if (key === 'pear') p.oval(12, 9, 4, 6, C.green3);
                    p.rect(12, 3, 1, 5, C.bark); leaf(p, 13, 5);
                } break;
            case 'coconut': case 'kiwi':
                ball(p, 12, 14, 9, 8, C.wood, C.bark, C.tan); p.oval(12, 12, 7, 5, key === 'kiwi' ? C.green3 : C.cream);
                if (key === 'kiwi') { p.oval(12, 12, 2, 2, C.cream); [[8, 10], [15, 10], [8, 14], [16, 14]].forEach(([x, y]) => p.dot(x, y, C.ink)); }
                else p.oval(12, 12, 4, 3, C.soil0); break;
            case 'mushroom':
                box(p, 9, 12, 7, 10, C.cream); p.oval(12, 11, 10, 7, C.red0).oval(11, 9, 8, 5, C.red)
                    .rect(5, 9, 4, 2, C.cream).rect(13, 6, 3, 3, C.white).rect(16, 11, 3, 2, C.cream); break;
            case 'pineapple':
                ball(p, 12, 15, 7, 8, C.gold, C.gold0, C.yellow);
                for (let y = 10; y < 22; y += 4) p.line(7, y, 17, y + 2, C.wood).line(8, y + 2, 16, y, C.yellow);
                p.line(12, 8, 7, 2, C.green1, 2).line(12, 7, 12, 0, C.green2, 2).line(13, 7, 18, 2, C.green3, 2); break;
            case 'eggplant': case 'sweetPotato': case 'cucumber':
                p.line(7, 19, 16, 8, C.ink, 5).line(6, 17, 15, 7, key === 'cucumber' ? C.green1 : C.purple0, 5)
                    .line(7, 16, 14, 7, key === 'cucumber' ? C.green3 : C.purple, 2);
                if (key === 'eggplant') { p.rect(14, 6, 6, 3, C.green1).rect(17, 3, 2, 4, C.green2); }
                else p.dot(17, 6, C.tan); break;
            case 'onion': case 'garlic': case 'potato':
                ball(p, 12, 15, 8, 7, key === 'potato' ? C.tan : C.cream, C.wood, C.light);
                if (key !== 'potato') { p.poly([[8, 9], [11, 3], [14, 9]], C.light).line(11, 10, 10, 20, C.tan).line(14, 10, 15, 20, C.tan); }
                else [[8, 12], [14, 17], [17, 12]].forEach(([x, y]) => p.dot(x, y, C.bark)); break;
            case 'wheat':
                [7, 13, 18].forEach((x, i) => {
                    p.line(x, 5 + i * 2, 12, 23, C.gold0);
                    for (let y = 5 + i * 2; y < 16; y += 4) {
                        p.rect(x - 3, y, 3, 2, C.yellow).rect(x + 1, y + 1, 3, 2, C.gold);
                    }
                }); break;
            case 'coffee': case 'cocoa':
                ball(p, 9, 12, 5, 7, C.wood, C.bark, C.tan); p.line(10, 7, 8, 17, C.ink);
                ball(p, 17, 17, 5, 6, key === 'cocoa' ? C.gold : C.red, C.bark, C.coral); p.line(17, 12, 16, 21, C.bark); break;
            case 'tea': case 'luckyClover':
                sprout(p, 12, 22); leaf(p, 12, 12, -1); leaf(p, 13, 10);
                if (key === 'luckyClover') [[8, 7], [16, 7], [8, 14], [16, 14]].forEach(([x, y]) => ball(p, x, y, 4, 4, C.green3, C.green1));
                break;
            case 'goldLantern':
                p.rect(11, 2, 2, 4, C.bark); ball(p, 12, 13, 8, 8, C.yellow, C.gold); p.rect(8, 4, 9, 2, C.green1).rect(12, 7, 1, 12, C.gold0); break;
            case 'moonFruit': ball(p, 12, 13, 9, 9, C.cream, C.gold, C.white); p.rect(8, 9, 3, 2, C.light).rect(14, 16, 4, 2, C.light); break;
            default:
                p.rect(11, 9, 2, 14, C.green1); leaf(p, 12, 19, -1);
                if (key === 'sunflower') { p.oval(12, 8, 7, 7, C.gold); p.oval(12, 8, 4, 4, C.bark); }
                else if (key === 'tulip') { p.rect(6, 4, 13, 7, C.pink).rect(8, 10, 9, 3, C.red); p.rect(6, 2, 3, 4, C.pink).rect(11, 2, 3, 4, C.pink).rect(16, 2, 3, 4, C.pink); }
                else flower(p, 12, 8, key === 'rose' ? C.red : key === 'hibiscus' ? C.pink : C.white);
        }
        if (magic[original]) {
            [[3, 3], [20, 18]].forEach(([x, y]) => { p.rect(x, y - 1, 1, 3, C.cream).rect(x - 1, y, 3, 1, C.yellow); });
            if (original === 'rainbowCorn') [C.red, C.coral, C.yellow, C.green3, C.blue, C.purple].forEach((c, i) => p.rect(10, 5 + i * 2, 4, 1, c));
        }
        return p;
    }
    function itemPixels(k) {
        if (CROPS.includes(k) || FLOWERS.includes(k)) return cropPixels(k);
        const p = new Pixels(24, 24), group = GROUP_BY_KEY[k];
        if (ANIMALS.includes(k)) {
            const color = k === 'pig' ? C.pink : k === 'duck' ? C.yellow : k === 'dog' ? C.tan : k === 'cat' ? C.coral : C.cream;
            ball(p, 12, 14, 9, 7, color, k === 'pig' ? C.coral : C.tan, C.white);
            p.rect(6, 19, 3, 4, C.bark).rect(16, 19, 3, 4, C.bark).dot(8, 12, C.ink).dot(16, 12, C.ink);
            if (k === 'hen' || k === 'duck') {
                p.poly([[10, 14], [14, 14], [12, 17]], C.gold).rect(10, 4, 4, 4, k === 'hen' ? C.red : C.yellow);
            } else {
                p.rect(3, 6, 5, 4, color).rect(16, 6, 5, 4, color);
                if (k === 'rabbit') p.rect(5, 1, 3, 9, C.cream).rect(16, 1, 3, 9, C.cream).rect(6, 2, 1, 6, C.pink).rect(17, 2, 1, 6, C.pink);
                if (k === 'cat') p.poly([[3, 9], [3, 3], [9, 8]], color).poly([[15, 8], [21, 3], [21, 9]], color);
                if (k === 'dog') p.rect(2, 7, 4, 8, C.bark).rect(18, 7, 4, 8, C.bark);
                if (k === 'hamster') p.oval(5, 7, 3, 3, C.tan).oval(18, 7, 3, 3, C.tan).oval(5, 16, 3, 3, C.pink).oval(18, 16, 3, 3, C.pink);
                if (k === 'cow' || k === 'goat') p.rect(4, 4, 2, 4, C.tan).rect(18, 4, 2, 4, C.tan);
                if (k === 'cow') p.rect(15, 7, 4, 3, C.bark).rect(4, 13, 3, 4, C.bark);
                if (k === 'sheep') [[5, 8], [10, 6], [16, 7]].forEach(([x, y]) => p.oval(x, y, 3, 3, C.white));
                p.rect(9, 15, 7, 3, k === 'pig' ? C.coral : C.tan).dot(10, 16, C.bark).dot(14, 16, C.bark);
            }
        } else if (FISH.includes(k) || group === 'fish' || group === 'crab' || group === 'shell') {
            const crab = /crab|lobster|shrimp/i.test(k), shell = /oyster|Clam|conch|scallop/i.test(k);
            if (shell) {
                ball(p, 12, 14, 9, 7, C.pinkLight, C.coral, C.cream);
                [6, 10, 14, 18].forEach(x => p.line(12, 20, x, 9, C.tan)); p.rect(8, 21, 9, 1, C.bark);
            } else if (crab) {
                ball(p, 12, 15, 7, 4, C.coral, C.red0); p.rect(7, 9, 2, 3, C.ink).rect(16, 9, 2, 3, C.ink);
                [6, 18].forEach(x => { p.line(x, 16, x < 10 ? 2 : 22, 19, C.red, 2); p.line(x, 13, x < 10 ? 2 : 22, 8, C.red, 2); });
            } else if (/squid|octopus|jellyfish/i.test(k)) {
                ball(p, 12, 10, 7, 7, C.lavender, C.purple, C.pinkLight);
                [6, 10, 14, 18].forEach(x => p.line(x, 15, x - 1, 21, C.purple, 2)); p.dot(9, 11, C.ink).dot(15, 11, C.ink);
            } else {
                const c = k === 'dragonFish' || k === 'skyKoi' ? C.gold : k === 'tropical' ? C.coral : C.blue;
                p.poly([[15, 13], [23, 7], [23, 20]], C.blue0); ball(p, 10, 13, 9, 6, c, C.blue0, C.aqua);
                p.poly([[9, 7], [15, 3], [16, 8]], C.blue0).dot(5, 12, C.ink).dot(5, 11, C.white).rect(11, 11, 1, 5, C.foam);
            }
        } else if (group === 'egg') {
            const c = k === 'goldenEgg' ? C.yellow : k === 'jadeEgg' ? C.green3 : k === 'blackEgg' ? C.stone0 : C.cream;
            ball(p, 12, 14, 7, 9, c, k === 'blackEgg' ? C.ink : C.tan, C.white);
        } else if (group === 'milk' || group === 'jar') {
            const c = /Milk|milk/.test(k) ? k === 'chocoMilk' ? C.wood : C.cream : /berry|jam/.test(k) ? C.red : k === 'salt' ? C.white : C.gold;
            box(p, 6, 8, 13, 14, C.aqua); p.rect(7, 12, 11, 9, c).rect(8, 4, 9, 5, C.foam);
            p.rect(7, 4, 11, 2, C.bark).rect(7, 9, 2, 10, C.white).rect(11, 14, 5, 4, C.cream);
        } else if (group === 'wool') {
            const c = k === 'pinkWool' ? C.pink : k === 'rainbowWool' ? C.lavender : C.cream;
            ball(p, 12, 14, 9, 8, c, C.tan, C.white);
            p.line(6, 10, 17, 18, C.purple).line(5, 14, 13, 20, C.purple).line(11, 7, 20, 14, C.purple);
        } else if (group === 'cheese') {
            p.poly([[3, 11], [18, 6], [22, 13], [22, 21], [3, 20]], C.gold0)
                .poly([[4, 11], [17, 7], [20, 12], [4, 15]], C.cream).rect(4, 15, 17, 5, C.yellow);
            p.rect(7, 16, 2, 2, C.gold).dot(17, 18, C.gold0).rect(14, 10, 2, 2, C.gold);
        } else if (group === 'mushroom') return cropPixels('mushroom');
        else if (group === 'wood') { plank(p, 3, 5, 18, 6); plank(p, 2, 13, 20, 7); }
        else if (group === 'stone') {
            ball(p, 12, 15, 10, 7, k === 'coal' ? C.stone0 : C.stone, C.stone0, C.stoneLight);
            const c = /gold/i.test(k) ? C.gold : /copper/i.test(k) ? C.coral : /silver/i.test(k) ? C.white : C.stoneLight;
            p.rect(6, 12, 4, 3, c).rect(14, 15, 4, 3, c);
        } else if (group === 'gem' || group === 'bar') {
            const c = /ruby/i.test(k) ? C.red : /emerald/i.test(k) ? C.green3 : /gold/i.test(k) ? C.gold : /copper/i.test(k) ? C.coral : /sapphire/i.test(k) ? C.blue : C.aqua;
            if (group === 'bar') p.poly([[5, 9], [17, 9], [21, 18], [2, 18]], C.ink).poly([[6, 10], [16, 10], [18, 15], [4, 15]], c).rect(4, 16, 15, 2, C.tan);
            else p.poly([[5, 4], [18, 4], [23, 11], [12, 23], [1, 11]], C.ink)
                .poly([[6, 5], [17, 5], [21, 11], [12, 21], [3, 11]], c)
                .poly([[7, 6], [11, 6], [8, 11], [4, 11]], C.white).line(8, 12, 12, 20, C.foam).line(3, 11, 21, 11, C.foam);
        } else if (group === 'leaf') return cropPixels('tea');
        else if (group === 'flower') { p.rect(11, 12, 2, 11, C.green1); flower(p, 12, 9, C.pink); flower(p, 5, 13, C.yellow); flower(p, 19, 14, C.cream); }
        else if (group === 'chocolate') {
            box(p, 3, 4, 18, 18, C.bark); [5, 10, 15].forEach(x => [6, 12, 17].forEach(y => p.rect(x, y, 4, 3, C.wood)));
            p.poly([[3, 16], [20, 13], [20, 21], [3, 21]], C.pink);
        } else if (group === 'fossil') {
            p.line(5, 6, 18, 18, C.tan, 5).line(5, 5, 18, 17, C.cream, 4);
            [[4, 5], [7, 3], [17, 19], [21, 16]].forEach(([x, y]) => p.oval(x, y, 2, 2, C.cream));
        } else if (group === 'chair') {
            plank(p, 5, 4, 14, 5); plank(p, 5, 11, 14, 4); plank(p, 4, 15, 16, 4);
            p.rect(5, 19, 3, 4, C.bark).rect(17, 19, 3, 4, C.bark);
        } else if (group === 'bag') {
            box(p, 5, 7, 15, 15, C.light); p.rect(7, 4, 11, 4, C.cream).rect(6, 8, 13, 2, C.bark);
            sprout(p, 12, 20);
        } else if (group === 'treasure') {
            p.poly([[3, 18], [2, 6], [8, 10], [12, 2], [17, 10], [22, 6], [21, 18]], C.gold0)
                .poly([[4, 17], [3, 8], [9, 12], [12, 5], [16, 12], [21, 8], [20, 17]], C.yellow).rect(4, 19, 17, 3, C.gold);
            p.rect(10, 14, 4, 4, C.red).dot(11, 14, C.pinkLight);
        } else if (k === 'scarf' || k === 'woolDoll') {
            if (k === 'scarf') p.rect(4, 5, 17, 7, C.pink).rect(13, 12, 7, 10, C.red).rect(5, 7, 14, 2, C.coral).rect(14, 15, 5, 2, C.pink);
            else {
                ball(p, 12, 16, 6, 6, C.tan, C.wood); ball(p, 12, 8, 6, 5, C.light, C.tan);
                p.oval(7, 4, 2, 2, C.wood).oval(17, 4, 2, 2, C.wood).dot(10, 8, C.ink).dot(15, 8, C.ink).rect(10, 13, 5, 2, C.red);
            }
        } else if (DISHES.includes(k)) {
            const drink = /Drink|Tea|Coffee|Choc|Punch|smoothie|herbTonic/.test(k);
            const baked = /bread|Toast|pancake|Cake|cake|Pie|pizza|sandwich/.test(k);
            if (drink) {
                box(p, 6, 6, 12, 16, C.aqua); p.rect(7, 12, 10, 9, /Coffee|Choc/.test(k) ? C.wood : /Tea|Tea|tea/.test(k) ? C.gold : C.pink);
                p.line(14, 3, 12, 15, C.cream); p.rect(5, 6, 14, 2, C.cream).rect(7, 10, 2, 8, C.foam);
            } else {
                p.oval(12, 19, 11, 4, C.stoneLight).oval(12, 18, 10, 3, C.cream);
                if (baked) { ball(p, 12, 13, 8, 6, C.light, C.wood, C.yellow); p.rect(6, 17, 13, 2, C.cream).rect(8, 10, 2, 2, C.red).rect(14, 11, 3, 2, C.green1); }
                else { p.oval(12, 13, 9, 6, C.wood).oval(12, 11, 9, 4, C.cream).oval(12, 11, 7, 2, C.gold); p.rect(8, 10, 3, 2, C.green2).rect(14, 10, 3, 2, C.coral); }
            }
        } else return null;
        return p;
    }
    function icon(key, fallback = '') {
        const k = String(key).split('~')[0];
        return memo('icon:' + k, () => {
            const p = itemPixels(k);
            return p ? '<svg class="farm-pixel-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' + p.svg() + '</svg>' : null;
        }) || fallback;
    }
    function machine(k, fallback = '') {
        if (!MACHINES.includes(k)) return fallback;
        return memo('machine:' + k, () => {
            const p = new Pixels(24, 24);
            box(p, 4, 9, 16, 13, k === 'furnace' ? C.stone : C.wood);
            p.rect(3, 8, 18, 3, C.light).rect(5, 20, 14, 2, C.bark);
            if (k === 'loom') {
                [7, 10, 13, 16].forEach(x => p.rect(x, 4, 1, 14, C.cream)); p.rect(6, 12, 12, 5, C.pink);
            } else if (k === 'mill' || k === 'workbench') {
                ball(p, 12, 10, 6, 6, C.stoneLight, C.stone); p.rect(11, 6, 2, 8, C.bark).rect(8, 9, 8, 2, C.bark);
            } else {
                box(p, 8, 13, 8, 7, k === 'furnace' || k === 'roaster' ? C.gold : C.aqua);
                p.rect(15, 2, 3, 7, C.stone0).dot(10, 15, C.cream);
            }
            return '<svg class="farm-pixel-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' + p.svg() + '</svg>';
        });
    }
    // Interface sprites use the same 24 px grid and palette as farm goods.
    function uiPixels(k) {
        const p = new Pixels(24, 24);
        const book = (color = C.red) => {
            box(p, 3, 3, 18, 19, color); p.rect(5, 4, 2, 16, C.light).rect(8, 6, 10, 12, C.cream);
            p.rect(10, 8, 6, 1, C.tan).rect(10, 11, 6, 1, C.tan).rect(10, 14, 4, 1, C.tan);
        };
        const star = (x = 12, y = 11, c = C.yellow) => {
            p.poly([[x,y-8],[x+3,y-3],[x+9,y-2],[x+5,y+2],[x+6,y+8],[x,y+5],[x-6,y+8],[x-5,y+2],[x-9,y-2],[x-3,y-3]], C.ink);
            p.poly([[x,y-6],[x+2,y-2],[x+7,y-1],[x+3,y+2],[x+4,y+5],[x,y+3],[x-4,y+5],[x-3,y+1],[x-6,y-1],[x-2,y-2]], c);
            p.dot(x-1,y-3,C.cream);
        };
        switch (k) {
            case 'orders': case 'quest': case 'note':
                box(p, 5, 3, 15, 19, C.tan); box(p, 6, 4, 13, 17, C.cream);
                if (k === 'orders') { box(p, 9, 1, 7, 5, C.gold); p.rect(11,2,3,1,C.cream); }
                else if (k === 'quest') p.rect(3,2,5,3,C.light).rect(17,19,5,3,C.light);
                [9,13,17].forEach(y => p.rect(9,y,7,1,C.wood)); p.rect(8,6,7,1,C.light); break;
            case 'barn': case 'house': case 'stall': case 'museum': case 'castle':
                box(p, 4, 10, 17, 12, k === 'barn' ? C.red : C.light);
                if (k === 'museum') {
                    p.poly([[2,9],[12,2],[22,9]],C.ink).poly([[5,8],[12,4],[19,8]],C.stoneLight);
                    p.rect(3,10,19,2,C.stone).rect(3,20,19,2,C.stone0);
                    [5,11,17].forEach(x => p.rect(x,12,3,8,C.cream).rect(x+1,12,1,8,C.white));
                } else if (k === 'stall') {
                    p.rect(3,5,19,7,C.cream); [3,11,19].forEach(x=>p.rect(x,5,3,7,C.green2));
                    p.rect(2,11,21,2,C.ink).rect(6,14,13,5,C.bark).rect(4,19,17,2,C.wood);
                    p.rect(7,14,3,3,C.red).rect(12,15,3,2,C.yellow).rect(16,14,2,3,C.green3);
                } else {
                    roof(p, 2, 2, 21, 9, k === 'barn' ? C.red : C.red0, C.bark);
                    box(p, 9, 14, 7, 8, C.bark); p.line(10,15,14,20,C.light);
                    if (k !== 'barn') windowPane(p,5,12,4,5); else p.rect(6,12,1,9,C.coral).rect(18,12,1,9,C.coral);
                    p.rect(11,8,4,3,C.cream);
                }
                break;
            case 'auction': case 'hammer': case 'pickaxe': case 'axe': case 'wrench':
                p.line(5,20,17,5,C.ink,3).line(6,19,18,5,C.wood,2).dot(7,18,C.light);
                if (k === 'pickaxe') p.poly([[4,5],[11,2],[18,4],[22,10],[17,8],[11,6],[4,8]],C.ink).line(6,5,14,4,C.stoneLight,2).line(14,4,20,8,C.stone,2);
                else if (k === 'axe') p.poly([[6,4],[12,2],[19,6],[14,13],[7,10]],C.stone0).poly([[7,4],[12,3],[17,6],[13,10],[8,9]],C.stoneLight);
                else if (k === 'wrench') p.line(7,18,17,8,C.stone,4).poly([[15,2],[15,7],[20,8],[22,4],[22,10],[17,13],[12,8],[12,4]],C.stoneLight);
                else { p.poly([[6,4],[10,1],[21,10],[17,15]],C.ink).poly([[8,4],[10,3],[19,10],[17,12]],C.tan).line(10,4,18,10,C.light); p.rect(2,21,14,2,C.bark); }
                break;
            case 'kitchen':
                p.line(1,5,9,13,C.ink,4).line(2,5,10,13,C.wood,2);
                p.oval(15,15,8,7,C.ink).oval(15,14,6,5,C.stone0).oval(14,13,4,3,C.white).oval(15,13,2,2,C.yellow); break;
            case 'craft': return null;
            case 'pond':
                p.line(3,21,16,3,C.ink,3).line(4,20,17,3,C.wood).line(17,3,22,10,C.cream).line(22,10,22,17,C.cream);
                p.rect(20,16,3,4,C.red).rect(20,19,3,2,C.cream); p.rect(1,22,22,1,C.aqua); break;
            case 'forest': drawTree(p,12,23,22,8,'pine'); break;
            case 'sprout': sprout(p,12,21); p.rect(6,22,14,2,C.soil0);break;
            case 'sea':
                p.rect(2,20,20,3,C.light).rect(1,22,9,1,C.aqua).rect(14,11,1,11,C.bark);
                p.poly([[2,12],[5,6],[12,3],[19,6],[22,12]],C.ink).poly([[4,11],[7,6],[12,4],[12,11]],C.coral).poly([[12,4],[18,6],[20,11],[12,11]],C.cream);
                p.line(3,18,9,20,C.blue0,2).rect(4,21,7,1,C.blue); break;
            case 'trophy': case 'medal':
                if (k === 'trophy') {
                    box(p,3,4,6,8,C.gold); box(p,16,4,6,8,C.gold); p.rect(5,6,3,4,C.ink).rect(17,6,3,4,C.ink);
                    p.poly([[7,2],[18,2],[17,13],[14,17],[14,20],[19,20],[19,23],[6,23],[6,20],[11,20],[11,17],[8,13]],C.ink);
                    p.poly([[8,3],[17,3],[16,12],[13,15],[11,14],[9,11]],C.gold).rect(9,4,2,6,C.cream).rect(11,16,3,5,C.gold).rect(7,21,11,1,C.tan);
                } else {
                    p.poly([[5,2],[11,2],[14,11],[9,13]],C.blue).poly([[13,2],[19,2],[15,13],[10,11]],C.red);
                    ball(p,12,15,7,7,C.yellow,C.gold0,C.cream); p.rect(11,11,2,7,C.gold0).rect(9,13,6,2,C.gold0);
                } break;
            case 'compost':
                box(p,3,9,19,14,C.wood); p.rect(2,7,21,3,C.bark).rect(4,8,17,1,C.light);
                [7,12,17].forEach(x=>p.rect(x,12,1,9,C.tan));
                p.line(7,5,11,3,C.green2,2).line(12,5,17,2,C.green3,2);
                p.line(8,16,12,18,C.pink,2).line(12,18,17,15,C.pink,2).dot(17,15,C.ink); break;
            case 'wormUp':
                [20,15,10,6].forEach((y,i)=>ball(p,12,y,4+i%2,4,C.green3,C.green1));
                p.line(10,2,8,0,C.ink).line(15,2,17,0,C.ink).dot(10,5,C.ink).dot(14,5,C.ink).rect(11,8,3,1,C.cream);break;
            case 'worm': case 'pest':
                [5,9,13,17].forEach((x,i)=>ball(p,x,16-i%2,4,4,k==='pest'?C.green3:C.pink,k==='pest'?C.green1:C.red0));
                p.line(17,10,16,7,C.ink).line(20,10,22,7,C.ink).dot(17,13,C.ink).dot(20,13,C.ink).rect(18,17,2,1,C.cream); break;
            case 'skills':
                [10,7,4].forEach((r,i)=>p.oval(11,12,r,r,[C.ink,C.red,C.cream][i])); p.oval(11,12,2,2,C.red);
                p.line(11,12,21,2,C.bark,2).line(12,11,21,2,C.light).rect(18,1,5,2,C.blue).rect(21,1,2,5,C.blue); break;
            case 'pass': case 'ticket':
                box(p,2,6,21,13,C.gold); p.rect(1,10,3,5,C.cream).rect(21,10,3,5,C.cream).rect(5,8,1,9,C.gold0).rect(18,8,1,9,C.gold0);
                p.rect(10,9,5,2,C.cream).rect(9,11,7,3,C.cream).rect(11,14,3,2,C.cream); break;
            case 'book': case 'calendar':
                if (k === 'book') {
                    p.poly([[1,4],[10,3],[12,5],[15,3],[23,4],[23,22],[14,21],[12,23],[10,21],[1,22]],C.ink);
                    p.rect(2,5,8,15,C.cream).rect(14,5,8,15,C.light).rect(11,6,2,15,C.wood);
                    [8,12,16].forEach(y=>p.rect(4,y,5,1,C.tan).rect(16,y,4,1,C.wood));
                } else { book(C.blue); p.rect(3,7,18,2,C.ink); [8,12,16].forEach(x=>[12,16].forEach(y=>p.rect(x,y,2,2,C.red))); }
                break;
            case 'gift':
                box(p,3,10,19,13,C.red); p.rect(2,8,21,4,C.coral).rect(11,8,3,14,C.yellow);
                box(p,5,2,7,6,C.gold); box(p,13,2,7,6,C.gold); p.rect(7,4,3,2,C.cream).rect(15,4,3,2,C.cream).rect(11,6,3,3,C.yellow); break;
            case 'farmer': case 'friends': case 'chef': case 'ninja': case 'person':
                if (k === 'friends') {
                    ball(p,6,8,4,4,C.light,C.tan); ball(p,18,8,4,4,C.light,C.tan);
                    p.rect(1,14,10,8,C.green1).rect(14,14,9,8,C.red).rect(3,15,2,6,C.green3).rect(17,15,2,6,C.coral);
                    p.dot(5,8,C.ink).dot(8,8,C.ink).dot(17,8,C.ink).dot(20,8,C.ink);
                } else {
                    p.rect(5,14,15,9,k==='ninja'?C.purple0:C.blue0).rect(7,15,3,7,C.blue).rect(16,15,2,7,C.blue);
                    ball(p,12,10,7,7,k==='ninja'?C.purple0:C.light,C.tan);
                    if(k==='ninja')p.rect(6,8,13,4,C.light);
                    p.dot(9,9,C.ink).dot(15,9,C.ink).rect(11,13,3,1,C.bark);
                    if(k==='farmer')p.rect(6,2,13,4,C.gold).rect(2,6,21,2,C.tan).rect(7,3,10,1,C.yellow);
                    if(k==='chef'){p.oval(7,4,4,3,C.cream).oval(12,3,4,3,C.cream).oval(17,4,4,3,C.cream).rect(7,4,11,3,C.cream);}
                } break;
            case 'water':
                p.poly([[12,1],[5,11],[3,16],[5,21],[10,23],[16,23],[21,18],[20,12]],C.ink)
                    .poly([[12,3],[6,12],[5,17],[8,20],[15,21],[19,17],[18,12]],C.blue).rect(7,13,2,5,C.foam).rect(10,19,5,1,C.aqua); break;
            case 'fertilizer': case 'potion':
                p.rect(8,2,9,3,C.ink).rect(10,3,5,7,C.foam).poly([[9,8],[16,8],[21,18],[19,23],[6,23],[3,18]],C.ink)
                    .poly([[9,10],[16,10],[19,18],[17,21],[7,21],[5,18]],k==='potion'?C.purple:C.aqua).rect(6,16,12,3,k==='potion'?C.lavender:C.green2).rect(7,13,2,6,C.white); break;
            case 'coin':
                ball(p,12,12,10,10,C.yellow,C.gold0,C.cream); p.oval(12,12,6,7,C.gold).rect(11,6,2,12,C.cream).rect(9,9,6,2,C.cream).rect(9,14,6,2,C.cream); break;
            case 'energy':
                p.poly([[12,1],[3,14],[10,14],[8,23],[21,9],[14,9],[18,1]],C.ink)
                    .poly([[13,3],[6,12],[13,12],[11,18],[18,11],[12,11],[15,3]],C.yellow); break;
            case 'heart':
                p.poly([[2,4],[6,2],[10,3],[12,6],[15,3],[19,2],[23,6],[23,12],[12,23],[1,12],[1,7]],C.ink)
                    .poly([[3,6],[6,4],[9,5],[12,9],[16,5],[19,4],[21,7],[21,11],[12,20],[3,11]],C.red).rect(5,6,3,3,C.pinkLight).line(5,13,11,18,C.coral,2); break;
            case 'star': case 'sparkle': star(); break;
            case 'lock':
                p.oval(12,9,7,8,C.ink).oval(12,9,5,6,C.stoneLight).rect(9,6,7,8,C.ink);
                box(p,3,11,19,12,C.gold); p.rect(11,14,3,3,C.ink).rect(12,16,1,4,C.ink).rect(5,12,2,8,C.yellow); break;
            case 'check': case 'close': case 'plus': case 'up': case 'back': case 'next': case 'play':
                if(k==='check')p.line(3,12,9,19,C.green0,4).line(9,19,21,5,C.green0,4).line(4,12,9,17,C.green3,2).line(9,17,20,5,C.green3,2);
                else if(k==='close')p.line(5,5,19,19,C.red0,4).line(19,5,5,19,C.red0,4).line(5,5,18,18,C.coral,2).line(18,5,5,18,C.coral,2);
                else if(k==='plus')p.rect(9,2,6,21,C.green0).rect(2,9,21,6,C.green0).rect(11,4,2,17,C.green3).rect(4,11,17,2,C.green3);
                else if(k==='play')p.poly([[5,2],[22,12],[5,23]],C.ink).poly([[7,5],[18,12],[7,19]],C.green3);
                else {const pts=k==='up'?[[12,2],[22,12],[17,12],[17,22],[7,22],[7,12],[2,12]]:k==='back'?[[2,12],[12,2],[12,7],[22,7],[22,17],[12,17],[12,22]]:[[22,12],[12,2],[12,7],[2,7],[2,17],[12,17],[12,22]];p.poly(pts,C.ink);p.line(k==='up'?12:5,k==='up'?7:12,k==='up'?12:18,k==='up'?19:12,C.gold,4);} break;
            case 'help': case 'warning': case 'info':
                if(k==='warning')p.poly([[12,1],[24,23],[0,23]],C.ink).poly([[12,5],[21,21],[3,21]],C.yellow);
                else ball(p,12,12,10,10,k==='help'?C.blue:C.gold,C.blue0,C.foam);
                if(k==='help')p.line(8,7,14,7,C.cream,2).line(15,8,15,11,C.cream,2).line(12,12,15,11,C.cream,2).rect(11,13,2,2,C.cream).rect(11,18,2,2,C.cream);
                else p.rect(11,8,3,7,C.ink).rect(11,18,3,2,C.ink); break;
            case 'clock': case 'hourglass':
                if(k==='clock'){ball(p,12,13,10,10,C.cream,C.tan,C.white);p.line(12,6,12,13,C.bark,2).line(12,13,17,15,C.bark,2).rect(9,1,7,2,C.bark);}
                else {p.rect(5,1,15,3,C.bark).rect(5,21,15,3,C.bark).line(7,4,17,20,C.aqua,2).line(17,4,7,20,C.aqua,2).poly([[8,5],[17,5],[12,11]],C.gold).poly([[7,20],[12,14],[18,20]],C.gold);} break;
            case 'basket': case 'bag': case 'chest':
                if(k==='bag'){p.oval(12,7,6,6,C.ink).oval(12,7,4,4,C.light);box(p,3,8,19,15,C.tan);p.rect(6,12,13,8,C.light).rect(11,12,3,8,C.green2);}
                else if(k==='chest'){box(p,2,6,21,17,C.wood);p.rect(4,7,17,6,C.tan).rect(3,13,19,3,C.bark).rect(5,6,2,15,C.gold).rect(18,6,2,15,C.gold);box(p,10,12,5,6,C.yellow);}
                else {p.oval(12,9,8,7,C.bark).oval(12,9,6,5,C.light);p.poly([[1,10],[23,10],[20,23],[4,23]],C.ink).poly([[3,12],[21,12],[18,21],[6,21]],C.tan);[7,12,17].forEach(x=>p.rect(x,13,1,7,C.wood));p.rect(5,16,15,1,C.light);} break;
            case 'chat': case 'mail':
                if(k==='chat'){box(p,1,3,22,15,C.cream);p.poly([[4,17],[10,17],[4,23]],C.ink).rect(5,17,2,2,C.cream);[6,11,16].forEach(x=>p.rect(x,9,2,2,C.bark));}
                else{box(p,1,5,22,16,C.cream);p.line(2,6,12,14,C.tan).line(12,14,22,6,C.tan).line(2,19,8,13,C.light).line(22,19,16,13,C.light);}break;
            case 'sun': case 'moon': case 'cloud': case 'rain': case 'storm': case 'snow': case 'wind': case 'wave':
                if(k==='sun'){[0,1,2,3].forEach(i=>{const x=[12,3,12,21][i],y=[2,12,21,12][i];p.rect(x-1,y-1,3,3,C.gold);});ball(p,12,12,7,7,C.yellow,C.gold,C.cream);}
                else if(k==='moon'){p.oval(12,12,10,10,C.gold0).oval(11,11,9,9,C.yellow);p.poly([[13,1],[24,1],[24,24],[15,24],[19,18],[20,10]],'none');p.oval(17,8,7,9,'none');}
                else if(k==='wave'||k==='wind'){[7,12,17].forEach((y,i)=>{p.line(2,y,16-i*3,y,C.blue0,2).line(3,y-1,19-i*2,y-1,C.aqua);p.rect(18-i*2,y-3,3,3,C.blue);});}
                else{p.oval(8,10,7,5,C.blue0).oval(14,7,7,6,C.blue0).oval(19,11,5,4,C.blue0).rect(5,10,16,6,C.foam).oval(8,9,5,4,C.foam).oval(14,6,5,4,C.cream);
                    if(k==='rain'||k==='storm')[5,11,18].forEach(x=>p.line(x+1,18,x,21,C.blue,2));
                    if(k==='storm')p.poly([[12,13],[8,20],[12,20],[10,24],[17,17],[13,17],[15,13]],C.yellow);
                    if(k==='snow')[5,12,19].forEach(x=>p.rect(x,18,1,5,C.white).rect(x-2,20,5,1,C.white));}
                break;
            case 'fire': case 'candle':
                if(k==='candle'){box(p,7,9,11,14,C.cream);p.rect(8,11,2,9,C.yellow);p.rect(11,7,2,3,C.bark);}
                p.poly(k==='fire'?[[11,1],[14,8],[18,5],[22,15],[20,21],[12,24],[3,21],[1,15],[6,7],[7,12]]:[[12,0],[17,6],[15,9],[10,9],[8,6]],C.red0);
                p.poly(k==='fire'?[[11,4],[14,12],[18,10],[20,16],[17,21],[7,21],[4,17],[8,10],[9,15]]:[[12,2],[15,6],[13,8],[10,6]],C.coral);
                if(k==='fire')p.poly([[12,12],[16,20],[13,22],[9,21],[8,18]],C.yellow);break;
            case 'palette':
                ball(p,12,12,11,9,C.light,C.wood,C.cream);[[6,8,C.red],[11,5,C.yellow],[17,7,C.blue],[19,12,C.green2],[6,15,C.purple]].forEach(([x,y,c])=>p.rect(x,y,3,3,c));p.oval(13,17,3,2,C.ink);break;
            case 'fountain':
                p.rect(11,7,3,13,C.stone0).rect(8,8,9,3,C.stoneLight).rect(9,17,7,4,C.stoneLight).rect(3,20,19,3,C.stone0).rect(4,20,17,1,C.aqua);
                p.line(12,6,6,13,C.blue,2).line(12,6,18,13,C.blue,2).rect(11,2,3,6,C.aqua);break;
            case 'slots':
                box(p,2,4,19,19,C.red0);p.rect(4,6,15,12,C.gold).rect(5,8,13,8,C.cream);[6,10,14].forEach((x,i)=>p.rect(x,11,3,3,[C.red,C.green2,C.gold][i]).dot(x+1,10,C.green1));p.rect(6,20,10,1,C.gold).rect(22,8,2,8,C.wood).rect(21,6,3,3,C.red);break;
            case 'restroom':
                box(p,2,1,21,23,C.blue0);p.rect(12,4,1,17,C.aqua);[7,17].forEach(x=>{p.rect(x-1,4,3,3,C.cream).rect(x-2,9,5,6,C.cream).rect(x-2,15,2,6,C.cream).rect(x+1,15,2,6,C.cream);});break;
            case 'gear':
                p.rect(9,1,6,22,C.stone0).rect(1,9,22,6,C.stone0).line(4,4,20,20,C.stone0,4).line(20,4,4,20,C.stone0,4);ball(p,12,12,8,8,C.stoneLight,C.stone);p.oval(12,12,3,3,C.ink);break;
            case 'shield':
                p.poly([[2,3],[12,1],[23,3],[21,14],[17,20],[12,24],[6,20],[3,14]],C.ink).poly([[4,5],[12,3],[21,5],[19,14],[16,18],[12,21],[8,18],[5,13]],C.blue0).poly([[6,6],[12,5],[12,18],[8,15]],C.aqua);break;
            case 'puzzle':
                p.rect(3,8,18,14,C.ink).oval(12,6,4,4,C.ink).rect(4,9,16,12,C.green2).oval(12,6,3,3,C.green3).oval(21,15,3,3,C.green2).oval(3,15,3,3,C.cream).rect(6,10,2,3,C.green4);break;
            case 'dna':
                p.line(5,2,19,22,C.purple,2).line(19,2,5,22,C.blue,2);[4,9,14,19].forEach((y,i)=>p.line(6+i%2*3,y,18-i%2*3,y,C.cream,2));break;
            case 'rainbow':
                [C.ink,C.red,C.gold,C.green2,C.blue,C.purple].forEach((c,i)=>p.oval(12,21,12-i,18-i*2,c));p.rect(10,15,5,9,'none');break;
            case 'ladder':
                p.rect(4,1,4,23,C.bark).rect(17,1,4,23,C.bark).rect(5,2,1,20,C.tan).rect(18,2,1,20,C.tan);[4,10,16,21].forEach(y=>p.rect(8,y,9,2,C.light));break;
            case 'bat':
                p.poly([[1,3],[8,7],[12,10],[17,7],[23,3],[23,18],[18,15],[15,19],[9,19],[6,15],[1,18]],C.ink).poly([[3,7],[8,10],[8,15],[5,12],[3,14]],C.purple).poly([[15,10],[21,7],[21,14],[18,12],[16,15]],C.purple).rect(9,7,7,13,C.purple0).dot(10,10,C.cream).dot(14,10,C.cream);break;
            case 'ghost':
                p.oval(12,10,8,8,C.ink).rect(4,10,17,12,C.ink).oval(12,10,6,6,C.cream).rect(6,10,13,10,C.cream).rect(7,20,3,3,C.cream).rect(15,20,3,3,C.cream).rect(8,10,2,3,C.ink).rect(15,10,2,3,C.ink).rect(11,15,3,2,C.pink);break;
            case 'candy':
                p.poly([[1,7],[7,9],[7,16],[1,19],[3,13]],C.pink).poly([[23,7],[17,9],[17,16],[23,19],[21,13]],C.pink);box(p,6,6,13,14,C.coral);p.line(8,7,17,16,C.cream,2).line(7,13,12,18,C.cream,2);break;
            case 'boat':
                p.poly([[1,14],[23,14],[18,22],[6,22]],C.ink).poly([[4,16],[21,16],[17,20],[7,20]],C.wood).rect(11,1,2,15,C.bark).poly([[10,2],[10,13],[2,13]],C.cream).poly([[14,3],[22,13],[14,13]],C.red);p.rect(1,23,22,1,C.aqua);break;
            case 'key':
                p.oval(8,8,6,6,C.gold0).oval(8,8,4,4,C.yellow).oval(8,8,2,2,C.ink).line(11,11,21,21,C.gold0,4).line(12,12,21,21,C.yellow,2).rect(18,16,4,2,C.yellow).rect(16,19,2,4,C.yellow);break;
            case 'flag':
                p.rect(4,1,3,23,C.bark).rect(5,1,1,23,C.light).poly([[7,2],[23,2],[19,7],[23,12],[7,12]],C.red0).rect(8,3,11,7,C.coral);break;
            case 'camera': case 'phone': case 'computer':
                if(k==='camera'){box(p,1,7,22,15,C.stone0);p.rect(4,3,7,4,C.stone0);ball(p,13,14,6,6,C.blue,C.ink,C.foam);p.rect(3,9,3,2,C.red);}
                else if(k==='phone'){box(p,6,1,13,23,C.ink);p.rect(8,4,9,15,C.aqua).rect(11,21,3,1,C.light);sprout(p,12,16);}
                else{box(p,1,2,22,16,C.bark);p.rect(3,4,18,12,C.aqua).rect(10,18,5,3,C.stone0).rect(5,21,15,2,C.stone);sprout(p,12,14);}break;
            case 'search':
                p.oval(10,10,8,8,C.bark).oval(10,10,6,6,C.aqua).rect(6,6,2,4,C.foam).line(15,15,22,22,C.ink,3).line(16,16,21,21,C.tan,2);break;
            case 'map':
                p.poly([[1,4],[8,1],[16,4],[23,1],[23,21],[16,24],[8,21],[1,24]],C.ink).poly([[3,5],[8,3],[15,6],[21,4],[21,20],[16,22],[8,19],[3,21]],C.light);p.line(8,4,8,18,C.tan).line(16,6,16,20,C.tan).line(4,13,19,10,C.green2,2).rect(14,12,3,3,C.red);break;
            case 'link': case 'refresh':
                if(k==='link'){p.oval(8,15,6,7,C.blue0).oval(8,15,3,4,'none').oval(17,8,6,7,C.blue).oval(17,8,3,4,'none').line(8,15,17,8,C.cream,3);}
                else{p.oval(12,12,10,10,C.green1).oval(12,12,7,7,'none').rect(1,1,12,8,'none').poly([[21,1],[23,10],[14,8]],C.green3).poly([[3,23],[1,14],[10,16]],C.green3);}break;
            case 'chart':
                p.rect(2,2,2,21,C.bark).rect(2,21,21,2,C.bark);[[6,13,4,C.blue],[12,8,4,C.green2],[18,3,4,C.gold]].forEach(([x,y,w,c])=>p.rect(x,y,w,21-y,c).rect(x,y,1,21-y,C.cream));break;
            case 'scale':
                p.rect(11,2,3,19,C.bark).rect(5,21,15,2,C.wood).rect(2,5,21,2,C.gold);[5,19].forEach(x=>{p.line(x,7,x-3,14,C.tan).line(x,7,x+3,14,C.tan).rect(x-4,14,9,2,C.gold).rect(x-2,16,5,2,C.gold0);});break;
            case 'scarecrow':
                p.rect(11,9,2,15,C.bark).rect(1,13,22,2,C.wood).rect(7,13,11,8,C.red).rect(8,14,3,3,C.light);ball(p,12,8,5,5,C.light,C.tan);p.rect(8,1,9,4,C.gold).rect(4,5,17,2,C.tan).dot(10,8,C.ink).dot(14,8,C.ink).rect(11,10,3,1,C.bark);break;
            case 'bee':
                p.oval(7,6,5,4,C.foam).oval(18,6,5,4,C.foam);ball(p,12,14,9,6,C.yellow,C.gold);[8,13].forEach(x=>p.rect(x,10,3,10,C.bark));p.dot(19,13,C.ink).line(18,8,20,5,C.ink);break;
            case 'snake':
                p.line(4,20,17,20,C.green0,5).line(17,20,8,11,C.green0,5).line(8,11,18,6,C.green0,5).line(4,19,17,19,C.green3,3).line(17,19,8,10,C.green3,3).line(8,10,18,5,C.green3,3).dot(19,4,C.ink).rect(21,6,3,1,C.red);break;
            case 'trap':
                p.rect(1,18,22,4,C.stone0).line(3,16,10,5,C.stone,3).line(21,16,14,5,C.stone,3).rect(9,16,7,3,C.red).rect(11,7,3,11,C.bark);break;
            case 'sword':
                p.poly([[19,1],[23,1],[23,5],[9,19],[5,15]],C.ink).poly([[20,3],[21,3],[21,5],[8,17],[7,15]],C.stoneLight).line(7,14,12,19,C.gold,3).line(6,19,3,22,C.bark,3);break;
            case 'hat':
                p.rect(5,3,15,12,C.gold0).rect(6,4,13,10,C.light).rect(5,12,15,3,C.red0).rect(1,15,23,5,C.gold).rect(2,15,21,2,C.yellow);break;
            case 'lantern':
                p.line(12,1,12,5,C.bark).oval(12,12,8,9,C.red0).oval(11,11,6,7,C.red).rect(7,4,11,2,C.gold).rect(7,19,11,2,C.gold).rect(11,6,2,13,C.yellow).rect(11,21,2,3,C.red);break;
            case 'balloon':
                ball(p,12,9,8,8,C.pink,C.red0,C.pinkLight);p.rect(11,16,3,2,C.red).line(12,18,9,23,C.cream);break;
            case 'krathong':
                p.poly([[1,14],[6,10],[12,13],[19,10],[23,14],[19,22],[5,22]],C.green0).rect(5,16,15,5,C.green2).rect(7,19,11,1,C.green3);flower(p,12,13,C.pink);p.rect(11,6,2,6,C.cream).poly([[12,1],[15,5],[12,8],[10,5]],C.gold);break;
            case 'tree':
                drawTree(p,12,23,22,9,'pine');[[7,12],[16,15],[12,8]].forEach(([x,y])=>p.rect(x,y,2,2,C.red));star(12,4);break;
            case 'snowman':
                ball(p,12,17,8,6,C.cream,C.stoneLight);ball(p,12,8,6,5,C.white,C.stoneLight);p.rect(7,1,11,3,C.ink).rect(4,4,17,2,C.ink).dot(10,8,C.ink).dot(15,8,C.ink).rect(12,10,4,1,C.coral).rect(6,12,13,2,C.red);break;
            case 'smile': case 'sleep': case 'sad': case 'surprise':
                ball(p,12,12,10,10,C.yellow,C.gold,C.cream);p.rect(7,9,k==='sleep'?4:2,2,C.ink).rect(15,9,k==='sleep'?4:2,2,C.ink);
                if(k==='surprise')p.oval(12,16,2,3,C.ink);else if(k==='sad')p.line(8,18,12,15,C.bark).line(12,15,16,18,C.bark);else p.line(8,15,11,18,C.bark).line(11,18,16,15,C.bark);
                break;
            default: return null;
        }
        return p;
    }
    const UI_ITEMS = { animals:'hen', pumpkin:'pumpkin', flower:'daisy', lotus:'lotusGod', leaf:'tea', wood:'wood', stone:'stone', gem:'diamond', crown:'crownDeep', shell:'oyster', bone:'fArm', dragon:'dragonFish', cat:'cat', dog:'dog', rabbit:'rabbit', bear:'woolDoll', mushroom:'mushroom', wheat:'wheat' };
    function ui(k, fallback = '') {
        if (UI_ITEMS[k]) return icon(UI_ITEMS[k], fallback);
        if (k === 'craft') return machine('mill', fallback);
        return memo('ui:' + k, () => { const p = uiPixels(k); return p ? '<svg class="farm-pixel-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">'+p.svg()+'</svg>' : null; }) || fallback;
    }
    function bush(i) {
        return memo('bush:'+i%4,()=>{
            const p=new Pixels(32,23); shadow(p,16,22,14); canopy(p,16,14,10); canopy(p,7,17,5); canopy(p,25,17,5);
            if(i%2)[[8,15],[15,11],[23,16]].forEach(([x,y])=>p.rect(x,y,2,2,i%4===1?C.red:C.cream));
            return '<svg viewBox="0 0 64 46" aria-hidden="true">'+p.svg(2)+'</svg>';
        });
    }
    function rock(c,f,i) {
        return memo('rock:'+Math.floor(f/10)+':'+i%3+':'+(c.hp>1)+':'+!!c.cracked,()=>{
            const p=new Pixels(20,17),tone=f<10?[C.bark,C.stone,C.stoneLight]:f<20?[C.blue0,C.stone,C.foam]:[C.purple0,C.purple,C.lavender];
            p.oval(10,16,9,1,C.ink).poly([[1,10],[4,4],[10,1],[16,3],[19,9],[17,15],[5,16],[2,14]],tone[0]).poly([[3,9],[5,4],[10,2],[15,4],[17,9],[15,14],[5,14]],tone[1]).poly([[5,4],[10,2],[15,4],[13,7],[6,8]],tone[2]);
            if(c.hp>1||c.cracked)p.rect(6,9,2,2,C.gold).rect(13,11,2,2,C.light);
            if(c.cracked)p.line(10,2,8,7,C.ink).line(8,7,12,10,C.ink).line(12,10,9,15,C.ink);
            return '<svg viewBox="0 0 40 34" aria-hidden="true">'+p.svg(2)+'</svg>';
        });
    }
    function festival(theme,top) {
        const at=(key,x,y,w,h)=>ui(key).replace('<svg ','<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" ').replace('width="24" height="24"','');
        const keys={halloween:['pumpkin','bat'],christmas:['gift','star'],loykrathong:['lotus','candle'],newyear:['gift','sparkle'],songkran:['animals','water'],valentine:['heart','heart'],cny:['gift','candy'],mothersday:['flower','heart'],fathersday:['flower','star'],okphansa:['candle','moon']};
        const a=keys[theme];return a?at(a[0],37,134,30,30)+at(a[1],151,Math.max(12,top-10),26,26):'';
    }
    function scene(kind) {
        return memo('scene:'+kind,()=>{
            const p=new Pixels(160,kind==='mine'?75:100);
            if(kind==='mine'){
                p.rect(0,0,160,75,C.light).poly([[0,38],[20,18],[45,10],[79,14],[106,9],[140,27],[160,35],[160,75],[0,75]],C.bark)
                    .poly([[0,48],[29,29],[54,24],[88,32],[112,24],[150,40],[160,42],[160,75],[0,75]],C.tan);
                p.rect(61,37,39,38,C.ink).poly([[61,38],[68,27],[92,27],[100,38]],C.ink);
                plank(p,56,33,49,6);plank(p,58,39,5,36);plank(p,98,39,5,36);
                p.line(73,75,77,47,C.stone,2).line(88,75,84,47,C.stone,2);[56,63,71].forEach(y=>p.rect(73,y,15,2,C.wood));
                p.rect(79,40,3,5,C.gold).rect(80,41,1,3,C.cream);
                p.poly([[113,58],[136,58],[132,68],[117,68]],C.stone0).rect(117,59,15,5,C.stone).rect(117,69,3,3,C.ink).rect(130,69,3,3,C.ink);
                [[119,56],[125,54],[131,56]].forEach(([x,y],i)=>p.rect(x,y,4,4,[C.coral,C.gold,C.aqua][i]));
                for(let i=0;i<35;i++)p.rect(i*29%160,40+i*13%34,2,1,C.wood);
            }else{
                p.rect(0,0,160,100,C.aqua).rect(0,20,160,30,C.foam).rect(0,50,160,50,kind==='beach'?C.light:C.green3);
                p.oval(132,16,7,7,C.yellow).rect(11,14,22,4,C.white).rect(18,11,12,3,C.white);
                if(kind==='forest'){
                    for(let i=0;i<12;i++)drawTree(p,i*15-3,65,34+i%3*8,10,'pine');
                    p.poly([[69,59],[82,59],[78,74],[92,91],[101,100],[72,100],[67,87],[62,75]],C.light);
                    [7,29,132,154].forEach((x,i)=>drawTree(p,x,85+i%2*5,64,15,'classic'));
                    for(let i=0;i<45;i++)p.rect(i*37%160,67+i*13%32,2,1,i%2?C.green2:C.green4);
                }else{
                    p.rect(0,39,160,29,C.blue).rect(0,40,160,2,C.aqua);
                    for(let i=0;i<24;i++)p.rect(i*19%160,43+i*7%24,6+i%3,1,i%2?C.foam:C.aqua);
                    p.rect(0,68,160,2,C.cream).poly([[0,69],[50,67],[97,74],[160,68],[160,72],[95,78],[49,71],[0,73]],C.cream);
                    p.line(12,81,23,22,C.bark,4).line(13,80,24,22,C.wood,2);
                    [[-1,14],[0,30],[19,11],[38,14],[48,29]].forEach(([x,y])=>p.line(23,22,x,y,C.green0,4).line(23,21,x,y,C.green2,2));
                    for(let i=0;i<35;i++)p.dot(i*37%160,75+i*11%24,C.tan);
                    flower(p,146,89,C.pink);
                }
            }
            return '<svg class="'+(kind==='mine'?'mine-entrance':'forest-bg')+'" viewBox="0 0 320 '+(kind==='mine'?150:200)+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+p.svg(2)+'</svg>';
        });
    }
    function plot(state, opts = {}) {
        const soil = state.soil < 30 ? 0 : state.soil < 60 ? 1 : 2;
        const stage = !state.seed ? -1 : state.stage === 0 ? 0 : state.stage >= state.need - 1 ? 2 : 1;
        const treeStage = state.type === 'tree' ? Math.min(4, Math.floor(state.stage / state.need * 4)) : 0;
        return memo(['plot', state.seed, state.type, soil, stage, treeStage, !!opts.secret].join(':'), () => {
            const p = new Pixels(40, 36), y = 27;
            p.poly([[6, y - 4], [33, y - 4], [38, y + 3], [35, y + 6], [4, y + 6], [2, y + 3]], C.soil0)
                .poly([[6, y - 5], [33, y - 5], [37, y + 1], [3, y + 1]], soil === 0 ? C.tan : soil === 1 ? C.soil2 : C.soil1);
            [25, 28].forEach(yy => p.rect(6, yy, 28, 1, soil === 0 ? C.soil1 : C.soil0));
            for (let i = 0; i < 10; i++) p.dot(6 + i * 7 % 28, 23 + i * 3 % 7, i % 2 ? C.light : C.bark);
            if (stage === 0) { p.rect(18, 23, 5, 2, C.bark).rect(19, 22, 2, 2, C.light); }
            else if (state.type === 'tree' && stage > 0) {
                const kind = /lantern|moon/i.test(state.seed) ? 'sakura' : /mango/i.test(state.seed) ? 'mango' : 'classic';
                drawTree(p, 20, 25, 11 + treeStage * 3, 5 + treeStage, kind);
            } else if (stage > 0) {
                sprout(p, 20, 26);
                if (stage === 2) {
                    p.rect(19, 12, 2, 14, C.green1); leaf(p, 19, 18, -1); leaf(p, 20, 15, 1);
                    if (state.type === 'flower') flower(p, 20, 10, C.pink);
                    else if (!opts.secret) { const crop = cropPixels(state.seed); p.blit(crop, 8, 0); }
                }
            }
            return '<svg class="farm-pixel-plot" viewBox="0 0 80 72" aria-hidden="true">' + p.svg(2) + '</svg>';
        });
    }

    function backdrop(kind, time = 'day', wet = false) {
        return memo(['bg', kind, time, wet].join(':'), () => {
            const p = new Pixels(160, 100), night = time === 'night', snow = kind === 'snow';
            const skies = {
                day: ['#90bdce', '#b6d6d7', '#e0e6cd'], dawn: ['#d7a9af', '#ebc8b5', '#f3dfba'],
                dusk: ['#ae92b0', '#d4a2ac', '#edc8b1'], night: ['#303d5c', '#495573', '#68758a']
            };
            const sky = wet ? ['#80979e', '#a0b4b4', '#c0c9b8'] : skies[time] || skies.day;
            p.rect(0, 0, 160, 100, sky[0]).rect(0, 18, 160, 35, sky[1]).rect(0, 40, 160, 35, sky[2]);
            if (night && !wet) {
                for (let i = 0; i < 24; i++) p.dot((i * 47 + 8) % 160, (i * 17 + 3) % 40, C.cream);
                p.oval(132, 15, 6, 6, C.cream).oval(135, 13, 5, 5, sky[0]);
            } else if (!wet) p.oval(time === 'dawn' ? 29 : 132, time === 'day' ? 20 : 43, 8, 8, C.yellow);
            [[10, 14, 19], [54, 8, 16], [96, 26, 23]].forEach(([x, y, w]) => {
                p.rect(x, y + 3, w, 3, night ? '#79839b' : C.foam).rect(x + 4, y, w - 8, 7, night ? '#79839b' : C.foam);
            });
            p.poly([[0, 53], [22, 36], [40, 48], [68, 26], [92, 49], [117, 32], [160, 53], [160, 70], [0, 70]], night ? '#566d79' : '#9bad9b');
            p.poly([[0, 61], [29, 49], [47, 58], [83, 43], [122, 57], [145, 48], [160, 55], [160, 75], [0, 75]], night ? '#4e6a63' : '#819f7b');
            const ground = snow ? '#e7e6dc' : kind === 'beach' ? '#dfc791' : kind === 'japan' ? '#cec6a7' : '#95b66d';
            p.rect(0, 65, 160, 35, ground).rect(0, 64, 160, 2, snow ? '#c6d2ce' : C.green2);
            if (kind === 'beach' || kind === 'thai') {
                p.rect(0, 53, 160, kind === 'beach' ? 20 : 14, C.blue).rect(0, 54, 160, 2, C.aqua);
                for (let i = 0; i < 12; i++) p.rect(i * 17 % 160, 57 + i * 3 % 12, 5 + i % 3, 1, C.foam);
                p.rect(0, kind === 'beach' ? 72 : 67, 160, 2, C.cream);
            }
            if (kind === 'pine' || snow) {
                for (let i = 0; i < 12; i++) {
                    const x = i * 15, h = 13 + i % 3 * 4;
                    drawTree(p, x, 65, h, 7, 'pine');
                    if (snow) p.poly([[x - 3, 50 - h / 4], [x, 45 - h / 4], [x + 3, 50 - h / 4]], C.white);
                }
            } else if (kind === 'japan') {
                drawTree(p, 9, 70, 26, 12, 'sakura'); drawTree(p, 149, 68, 25, 12, 'sakura');
                p.poly([[56, 48], [77, 23], [100, 48]], '#8b9ca8').poly([[71, 31], [77, 23], [84, 31]], C.cream);
            } else if (kind === 'thai') {
                p.rect(67, 45, 27, 12, C.light); roof(p, 62, 34, 37, 12, C.red, C.red0);
                p.rect(79, 24, 2, 11, C.gold).rect(78, 29, 4, 2, C.yellow);
            } else if (kind !== 'beach') {
                [8, 27, 132, 152].forEach((x, i) => drawTree(p, x, 65, 12 + i % 2 * 4, 6, 'classic'));
            }
            // A worn path, tufts and tiny wildflowers give the farm a hand-made
            // tile-map feel without filling the foreground where items are placed.
            if (kind !== 'beach' && !snow) {
                p.poly([[130, 66], [140, 66], [134, 76], [115, 90], [111, 100], [96, 100], [105, 88], [125, 73]], '#c5b17c');
                for (let i = 0; i < 17; i++) p.rect(104 + i * 11 % 31, 70 + i * 7 % 28, 2, 1, '#d7c58b');
            }
            for (let i = 0; i < 100; i++) {
                const x = (i * 37 + 9) % 160, y = 69 + i * 13 % 30;
                if (kind === 'beach') p.dot(x, y, i % 2 ? C.light : C.tan);
                else if (snow) p.rect(x, y, 2, 1, i % 3 ? C.white : '#c6d2ce');
                else {
                    p.rect(x, y, 2, 1, i % 3 ? '#a8c77b' : C.green2);
                    if (i % 7 === 0) p.line(x, y, x, y - 2, C.green2).dot(x + 1, y - 1, C.green4);
                }
            }
            if (kind === 'flowers') {
                for (let i = 0; i < 32; i++) flower(p, i * 17 % 160, 67 + i * 11 % 28, [C.pink, C.yellow, C.white, C.lavender][i % 4]);
                p.rect(117, 35, 5, 24, C.cream).line(111, 38, 128, 51, C.wood, 2).line(111, 51, 128, 38, C.wood, 2);
            } else if (kind === 'meadow') [[15, 80], [43, 93], [119, 78], [148, 89]].forEach(([x, y], i) => flower(p, x, y, i % 2 ? C.yellow : C.white));
            let svg = p.svg(2);
            if (night) svg += '<rect width="320" height="200" fill="#303352" opacity=".18"/>';
            else if (time === 'dusk') svg += '<rect width="320" height="200" fill="#d58a84" opacity=".08"/>';
            return svg;
        });
    }
    function avatar(look = {}, direction = 'down', frame = 0) {
        return memo('avatar:'+look.shirt+':'+look.hair+':'+look.hat+':'+direction+':'+frame,()=>{
            const p=new Pixels(24,32),shirts=[C.green2,C.blue,C.red,C.purple,C.gold,C.pink];
            const hair=[C.bark,C.ink,C.wood,C.light][look.hair||0],shirt=shirts[look.shirt||0],step=frame%2;
            p.oval(12,30,7,1,'#61704e');
            p.rect(7,23,4,6-step,C.blue0).rect(14,23,4,5+step,C.blue0).rect(6,28-step,5,2,C.bark).rect(14,28+step,5,2,C.bark);
            box(p,6,14,13,11,shirt);p.rect(8,15,2,8,C.cream).rect(15,15,2,8,C.cream).rect(8,21,9,3,C.blue0);
            p.rect(3,16+step,3,7,C.light).rect(19,17-step,3,7,C.light);
            box(p,6,4,13,11,C.light);p.rect(6,4,13,4,hair).rect(6,7,2,5,hair);
            if(direction==='up')p.rect(7,7,11,7,hair).rect(8,15,9,2,shirt);
            else if(direction==='left'||direction==='right'){
                const x=direction==='left'?5:18;p.rect(direction==='left'?15:7,6,3,8,hair).dot(direction==='left'?8:16,10,C.ink).rect(x,11,2,2,C.light);
            }else p.dot(9,10,C.ink).dot(15,10,C.ink).rect(11,13,3,1,C.bark).dot(8,12,C.pink).dot(17,12,C.pink);
            if(look.hat===1)p.rect(6,1,13,4,C.gold).rect(3,5,19,3,C.tan).rect(7,2,10,1,C.yellow).rect(6,4,13,1,C.green1);
            if(look.hat===2)p.rect(6,1,13,5,shirt).rect(5,5,16,2,C.ink).rect(direction==='left'?3:15,6,7,2,shirt);
            return p.svg();
        });
    }
    root.FarmPixelArt = Object.freeze({
        palette: C, decorIds: Object.freeze(DECOR_IDS.map(k => k.startsWith('trophy-') ? k : 'decor-' + k)),
        cropIds: Object.freeze(CROPS), icon, machine, decor, house, pot, tree, plot, backdrop,
        ui, bush, rock, festival, scene, avatar
    });
})(typeof window === 'undefined' ? globalThis : window);
