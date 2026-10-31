/* Pixel presentation for the farm UI. Game data keeps its original emoji IDs. */
(function (root) {
    'use strict';
    const art = root.FarmPixelArt;
    if (!art) return;
    const EMOJI = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
    const GROUPS = {
        orders: '📋 🧾', barn: '🏠 🏚️ 🏘️ 🛖', stall: '🏪 🛒 🛍️', auction: '🔨',
        kitchen: '🍳', craft: '🏭 🧰', pond: '🎣', forest: '🌲 🌳', pickaxe: '⛏️',
        sea: '🏖️ 🏝️', trophy: '🏆', compost: '🪱 ♻️', skills: '🎯', house: '🏡',
        medal: '🎖️ 🏅 🥇 🥈 🥉', quest: '📜', museum: '🏛️', pass: '🎫 🎟️',
        book: '📖 📗 📚 📰', gift: '🎁 💝 💌 🧧', friends: '👥 🤝',
        farmer: '🧑‍🌾 👩‍🌾 👨‍🌾 🙋 👵 👧 👦', chef: '👨‍🍳', ninja: '🥷 🤫',
        person: '👤 👋 👀 👇 🤚 👍 🤏 🙏 🧐 🏃 💃 😇',
        water: '💧 💦 🚿 🪣', fertilizer: '🧪 🧴', potion: '🔮 ⚗️',
        coin: '🪙 💰 💸', energy: '⚡ 💪',
        heart: '❤️ ❤ 💗 💖 💕 💙 💚 💛 🤍 💞 💘 💓',
        star: '⭐ 🌟', sparkle: '✨ 🌠 💫 ❇️ 🎉 🎊 🎆 🎇 🪩 ☄️',
        lock: '🔒', key: '🔑 🗝️', check: '✅', close: '❌', plus: '➕', up: '⬆️ ↗️',
        back: '↩️', next: '↪️', refresh: '🔄 🔁', play: '▶️',
        help: '❓ ❔', warning: '⚠️ ❗ ‼️ 🚨 💢', info: 'ℹ️',
        clock: '⏱️ ⏰ 🕐 🕛 🕒', hourglass: '⏳', calendar: '📅 🗓️',
        basket: '🧺', bag: '🎒 📦', chest: '🗝', chat: '💬 💭 📣 🔔', mail: '📩 📨 ✉️ 📮',
        sprout: '🌱', sun: '☀️ 🌤️ 🌇', moon: '🌙 🌕', cloud: '☁️', rain: '🌧️ ☔', storm: '⛈️',
        snow: '❄️', wind: '🌬️ 💨 🫧', wave: '🌊', fire: '🔥 💥', candle: '🕯️ 🪔',
        palette: '🎨 🖼️', gear: '⚙️', shield: '🛡️', sword: '⚔️ 🗡️ 🔪',
        puzzle: '🧩 🎲', dna: '🧬', rainbow: '🌈 🌌 🌐 🪐', ladder: '🪜 🛗',
        bat: '🦇', ghost: '👻 😈 👹 🧛 🧙 🧟', candy: '🍬', boat: '🚤 🛶',
        camera: '📸', phone: '📱 📲', computer: '🖥️ 💻', search: '🔎 🔍 🔦',
        map: '🗺️', link: '🔗 ⛓️', chart: '📊 📈 📉 📏', scale: '⚖️',
        axe: '🪓 🪚', wrench: '🔧 🏗️ 🚜 🚚', bee: '🐝 🦋 🦗 🐞',
        snake: '🐍', trap: '🪤 🕳️ 🕸️ 🕷️', hat: '🧢 🎩 🎓 👒 🎀',
        smile: '😊 😋 😽', sleep: '😴 💤', sad: '😢 😐 😤 😵', surprise: '🙈',
        pumpkin: '🎃', flower: '🌼 🌸 💐 🎏 🎐', lotus: '🪷', leaf: '🍃 🍂 🌿 🍁 🎋',
        wood: '🪵', stone: '🪨 ⛰️ 🏔️ 🟤 ⚫ 🟫 🧱', gem: '💎 🔶 🔷 💠 ♦️ 🧊',
        crown: '👑 🔱 🏰', shell: '🐚', bone: '🦴 🦕 💀 🦷 🪶',
        dragon: '🐉 🐲 🦄 🧚', animals: '🐔 🐣 🐥 🪺',
        dog: '🐕‍🦺 🐕 🐶 🐾', cat: '🐱 🐈 🐈‍⬛', rabbit: '🐇 🐰', bear: '🧸 🐻 🐼',
        pest: '🐛 🐌', mushroom: '🍄‍🟫', wheat: '🌾',
        note: '✏️ 💾 🗑️ 🔳', ticket: '🏷️', flag: '🎪 🚪', fountain: '⛲', slots: '🎰', restroom: '🚻',
        lantern: '🏮', balloon: '🪁', krathong: '🏺', tree: '🎄', snowman: '⛄'
    };
    const ROOTS = '#garden-card,#farm-app-bar,#fab-break,#farm-modal,#shop-modal,#veg-book,#checkin-modal,#cook-modal,#worm-modal,#sneak-modal,#break-garden-modal,#challenge-card,#snack-basket';
    const EFFECTS = {
        '.sneak-scene::before':'moon', '.sneak-scene.is-warn .sneak-guard::after':'search',
        '.worm-hole.hit::before':'sparkle', '.veg-plot.is-bloomed-near .veg-sign::after':'bee',
        '.garden-ghost.is-gold::after':'sparkle', '.sneak-dog.is-sleep::after':'sleep',
        '.sneak-dog.is-sniff::after':'help', '.sneak-dog.is-bark::after':'warning',
        '.garden-pet.wants-pet::after':'chat', '.veg-plot.is-giant::before':'trophy',
        '.garden-visitor::after':'sparkle', '.mp-plot.has-pest::after':'pest',
        '.veg-plot.rar-legendary::after':'sparkle', '.veg-plot.rar-mythic::after':'gem',
        '.veg-plot.rar-immortal::after':'rainbow', '.veg-plot.rar-cosmic::after':'star'
    };
    const SKIP = 'svg,script,style,textarea,input,select,option,pre,code,[contenteditable]:not([contenteditable="false"]),[data-pixel-skip],.farm-glyph';
    const symbols = new Map(), templates = new Map();
    let started = false;
    const strip = s => s.replace(/\uFE0F/g, '');
    function remember(emoji, svg, label) {
        if (svg) symbols.set(strip(emoji), { svg, label: label || emoji });
    }
    function enhance(node) {
        if (!node || !node.isConnected) return;
        const parent = node.nodeType === 3 ? node.parentElement : node;
        if (!parent || parent.closest(SKIP)) return;
        const texts = [];
        if (node.nodeType === 3) texts.push(node);
        else {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
                acceptNode: n => n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
            });
            while (walker.nextNode()) texts.push(walker.currentNode);
        }
        for (const text of texts) {
            const source = text.nodeValue;
            EMOJI.lastIndex = 0;
            const matches = Array.from(source.matchAll(EMOJI));
            if (!matches.length) continue;
            const fragment = document.createDocumentFragment();
            let offset = 0, changed = false;
            for (const match of matches) {
                const override = text.parentElement.dataset.pixelIcon;
                const entry = override ? { svg: art.ui(override), label: text.parentElement.dataset.pixelLabel || match[0] } : symbols.get(strip(match[0]));
                if (!entry || !entry.svg) continue;
                fragment.append(source.slice(offset, match.index));
                const glyph = document.createElement('span');
                glyph.className = 'farm-glyph'; glyph.setAttribute('role', 'img'); glyph.setAttribute('aria-label', entry.label);
                glyph.dataset.pixelGlyph = strip(match[0]);
                if (!templates.has(entry.svg)) {
                    const template = document.createElement('template'); template.innerHTML = entry.svg;
                    templates.set(entry.svg, template.content);
                }
                glyph.append(templates.get(entry.svg).cloneNode(true));
                // Keep textContent exactly as before: game selectors and saved IDs
                // continue to work, while the native emoji font is visually hidden.
                const original = document.createElement('span');
                original.className = 'farm-glyph-source'; original.setAttribute('aria-hidden', 'true'); original.textContent = match[0];
                glyph.append(original); fragment.append(glyph);
                offset = match.index + match[0].length; changed = true;
            }
            if (changed) { fragment.append(source.slice(offset)); text.replaceWith(fragment); }
        }
    }
    function start(catalogs = []) {
        if (started) return;
        started = true;
        // CSS-generated badges are outside the text-node observer.
        const effects = document.createElement('style'); effects.id = 'farm-pixel-effects';
        effects.textContent = Object.entries(EFFECTS).map(([selector,key]) => {
            const svg = art.ui(key).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
            return selector+'{content:"";display:block;width:1em;height:1em;background:url("data:image/svg+xml,'+encodeURIComponent(svg)+'") center/contain no-repeat;image-rendering:pixelated}';
        }).join('\n');
        document.head.append(effects);
        for (const catalog of catalogs) for (const [key, item] of Object.entries(catalog)) {
            if (item.e && !symbols.has(strip(item.e))) remember(item.e, art.icon(key) || art.machine(key), item.name || item.n);
        }
        for (const [key, emojis] of Object.entries(GROUPS)) {
            const svg = art.ui(key) || art.icon(key);
            for (const emoji of emojis.split(' ')) remember(emoji, svg);
        }
        // Additional food and wildlife symbols used by events and NPCs.
        const aliases = {
            '🍀':'luckyClover','🍎':'apple','🌰':'coffee','🫒':'olive','🍵':'farmTea','🫖':'farmTea','🥂':'fruitPunch','🍹':'fruitPunch','🍾':'fruitPunch','🫗':'milk',
            '🐿️':'hamster','🐒':'hamster','🐘':'cow','🐗':'pig','🦊':'dog','🐧':'duck','🐸':'fish','🐦':'hen','🦉':'hen','🦔':'hamster',
            '🧂':'salt','🍚':'crabFriedRice','🍙':'sushi','🍡':'dumpling','🧁':'carrotCake','🍧':'iceCream','🍢':'grilledFish','🥩':'grilledFish',
            '🦈':'shark','🐋':'moonWhale','🐳':'moonWhale','🦐':'shrimp','🦪':'oyster','🪸':'coral','🧵':'cloth','🪡':'cloth','🧶':'wool',
            '🍼':'milk','🫙':'honey','🥤':'smoothie','🧃':'veggieJuice','🥣':'soup','🍪':'bread','🧈':'butter','🍞':'bread',
            '🟡':'fruitGold','🟠':'tangerine','🔴':'tomato','🟢':'greenApple','🔵':'blueberry','🟣':'grape','⚪':'pearl','🤍':'fruitHeart'
        };
        for (const [emoji,key] of Object.entries(aliases)) if (!symbols.has(strip(emoji))) remember(emoji,art.icon(key));
        const roots = Array.from(document.querySelectorAll(ROOTS));
        if (document.body.classList.contains('farm-app')) {
            for (const id of ['toast-container','settings-modal','account-panel']) {
                const el = document.getElementById(id); if(el) roots.push(el);
            }
        }
        roots.forEach(enhance);
        const pending = new Set();
        let scheduled = false;
        const observer = new MutationObserver(records => {
            for (const record of records) {
                const parent = record.target.nodeType === 3 ? record.target.parentElement : record.target;
                if (!parent || parent.closest(SKIP)) continue;
                if (record.type === 'characterData') pending.add(record.target);
                else record.addedNodes.forEach(n => {
                    if (n.nodeType===1 && !n.matches('.farm-glyph')) pending.add(n);
                    else if (n.nodeType===3 && /\p{Extended_Pictographic}/u.test(n.textContent)) pending.add(n);
                });
            }
            if (!pending.size || scheduled) return;
            scheduled = true;
            queueMicrotask(() => {
                scheduled = false;
                const batch = new Set(pending); pending.clear();
                for (const node of batch) {
                    let ancestor = node.parentNode;
                    while (ancestor && !batch.has(ancestor)) ancestor = ancestor.parentNode;
                    if (!ancestor) enhance(node);
                }
            });
        });
        roots.forEach(el => observer.observe(el, { childList:true, subtree:true, characterData:true }));
    }
    root.FarmPixelUI = Object.freeze({ start, enhance });
})(window);
