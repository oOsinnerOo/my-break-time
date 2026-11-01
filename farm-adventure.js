/* Offline simulation and durable economy operations. No network or DOM dependencies. */
(function (root) {
    'use strict';
    const integer = (v, max = 1e7) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
    const personalities = {
        chick: { name: 'คนทำขนม', likes: ['carrot', 'wheat', 'egg', 'milk', 'strawberry'], factor: 1.08 },
        bunny: { name: 'นักจัดสวน', likes: ['carrot', 'wood', 'resin', 'herb', 'bambooShoot'], factor: 1.12 },
        dadBear: { name: 'ช่างไม้', likes: ['wood', 'plank', 'stone', 'ironBar', 'coal'], factor: 1.18 },
        momElephant: { name: 'แม่ครัว', likes: ['rice', 'salt', 'milk', 'shiitake', 'seaweed'], factor: 1.1 },
        orangeCat: { name: 'นักตกปลา', likes: ['tuna', 'salmon', 'mackerel', 'crab', 'shrimp'], factor: 1.15 },
        hedgehog: { name: 'นักสำรวจ', likes: ['herb', 'feather', 'fossil', 'copperOre', 'ironOre'], factor: 1.14 },
        luckyCat: { name: 'นักสะสม', likes: ['pearl', 'diamond', 'ruby', 'jade', 'amber'], factor: 1.3 },
        teddy: { name: 'พ่อค้าประหยัด', likes: ['wheat', 'carrot', 'stone', 'wood'], factor: 0.92 }
    };
    function random(l) {
        l.seed = ((integer(l.seed, 0xffffffff) || 1) * 1664525 + 1013904223) >>> 0;
        return l.seed / 4294967296;
    }
    function interest(who, key) {
        const p = personalities[who] || personalities.chick;
        const base = String(key).split('~')[0];
        return p.likes.some(k => base.toLowerCase().includes(k.toLowerCase()));
    }
    function initLot(l, own, ref, ids) {
        if (l.v === 2) return false;
        l.v = 2; l.seed = ((l.id * 2654435761) ^ Math.floor(l.at / 1000)) >>> 0;
        l.originalEnd = l.ends;
        l.top = own ? (l.fin ? l.start : 0) : integer(l.top);
        l.bids = own ? (l.fin ? 1 : 0) : integer(l.bids, 999);
        l.who = own ? (l.fin ? l.by : '') : (l.my ? 'me' : l.bids ? l.who : '');
        l.my = own ? 0 : integer(l.my);
        l.history = [];
        l.people = ids.filter(id => id !== l.seller).map(id => ({ id,
            budget: Math.max(1, Math.round(ref * (personalities[id]?.factor || 1) *
                (interest(id, l.k) ? 1.22 : 1) * (0.72 + random(l) * 0.55))),
            interest: interest(id, l.k) ? 0.88 : 0.48 + random(l) * 0.2
        })).filter(() => random(l) > 0.15).slice(0, 6);
        l.nextAt = Math.ceil(l.at + Math.max(20000, (l.ends - l.at) * (0.025 + random(l) * 0.075)));
        delete l.fin; delete l.max;
        return true;
    }
    const minimum = l => l.bids ? l.top + Math.max(1, Math.ceil(l.top * 0.05)) : l.start;
    function record(l, who, amount, at) {
        l.top = amount; l.who = who; l.by = who; l.bids = Math.min(999, l.bids + 1);
        l.history.push({ who, amount, at }); l.history = l.history.slice(-5);
    }
    function advance(l, now) {
        let refund = 0, changed = false, steps = 0;
        const until = Math.min(now, l.ends);
        while (l.nextAt < l.ends && l.nextAt <= until && steps++ < 100) {
            const at = l.nextAt, min = minimum(l);
            const candidates = l.people.filter(p => p.id !== l.who && p.budget >= min && random(l) < p.interest);
            if (candidates.length) {
                const p = candidates[Math.floor(random(l) * candidates.length)];
                const amount = Math.min(p.budget, min + Math.floor(random(l) * 3) * Math.max(1, Math.ceil(min * 0.025)));
                if (l.who === 'me') { refund += l.my; l.my = 0; }
                record(l, p.id, amount, at);
            }
            l.nextAt = Math.ceil(at + Math.max(30000, (l.originalEnd - l.at) / 14 * (0.45 + random(l))));
            changed = true;
        }
        return { refund, changed };
    }
    function bid(l, amount, now) {
        if (now >= l.ends || !Number.isInteger(amount) || amount < minimum(l) || amount > 1e7 || l.who === 'me') return false;
        record(l, 'me', amount, now); l.my = amount;
        if (l.ends - now < 60000) l.ends = Math.min(l.originalEnd + 120000, Math.max(l.ends, now + 60000));
        l.nextAt = Math.min(l.nextAt, Math.ceil(now + 15000 + random(l) * 30000));
        return true;
    }
    function cleanLot(raw, npc) {
        if (raw.v !== 2) return {};
        const at = integer(raw.at, 9e15), end = integer(raw.ends, 9e15);
        const originalEnd = Math.min(end, Math.max(at, integer(raw.originalEnd, 9e15) || end));
        return { v: 2, seed: integer(raw.seed, 0xffffffff), originalEnd,
            top: integer(raw.top), my: integer(raw.my), bids: integer(raw.bids, 999),
            who: raw.who === 'me' ? 'me' : raw.who ? npc(raw.who) : '', by: raw.by ? npc(raw.by) : '',
            nextAt: Math.max(at, integer(raw.nextAt, 9e15) || at),
            people: (Array.isArray(raw.people) ? raw.people : []).filter(p => p && typeof p.id === 'string').slice(0, 8)
                .map(p => ({ id: npc(p.id), budget: integer(p.budget), interest: Math.max(0, Math.min(1, Number(p.interest) || 0)) })),
            history: (Array.isArray(raw.history) ? raw.history : []).filter(h => h && Number.isFinite(+h.amount)).slice(-5)
                .map(h => ({ who: h.who === 'me' ? 'me' : npc(h.who), amount: integer(h.amount), at: integer(h.at, 9e15) })) };
    }
    function haggle({ key, price, ref, rep, rare, roll = Math.random }) {
        const ids = Object.keys(personalities), who = ids[Math.floor(roll() * ids.length) % ids.length];
        const persona = who === 'teddy' ? 'stingy' : who === 'luckyCat' && rare ? 'collector' : roll() < .2 ? 'rush' : 'kind';
        const likes = interest(who, key), relationship = 0.97 + Math.min(100, Math.max(0, rep)) / 2000;
        const max = Math.max(1, Math.round(ref * personalities[who].factor * (likes ? 1.25 : 1.08) * relationship * (.96 + roll() * .12)));
        const offer = Math.min(max, Math.max(1, Math.round(Math.min(price, ref * 1.3) * (.72 + roll() * .15))));
        const note = likes ? `กำลังหาไปใช้พอดี ถ้าราคาคุยกันได้ก็อยากซื้อเลย` : persona === 'rush' ? 'มีธุระต่อ ขอคุยราคาสั้น ๆ นะ' : persona === 'stingy' ? 'วันนี้มีงบจำกัด ขอราคาที่พอไหวหน่อยนะ' : 'แวะมาดูของ เห็นแล้วน่าสนใจ ขอคุยราคาหน่อยนะ';
        return { who, persona, max, offer, note, left: persona === 'rush' ? 2 : 3 + (rep >= 80 ? 1 : 0) };
    }
    const JOURNAL = 'bt_economy_pending_v1';
    function recover(storage) {
        const raw = storage.getItem(JOURNAL);
        if (!raw) return false;
        const p = JSON.parse(raw);
        if (p.v !== 1 || !p.veg || !p.shop || Array.isArray(p.veg) || Array.isArray(p.shop)) throw new Error('bad_economy_journal');
        storage.setItem('veggie_garden', JSON.stringify(p.veg));
        storage.setItem('shop_state', JSON.stringify(p.shop));
        storage.removeItem(JOURNAL); return true;
    }
    function commit(storage, veg, shop) {
        // The single write is the commit point. Recovery finishes an interrupted pair of saves.
        storage.setItem(JOURNAL, JSON.stringify({ v: 1, veg, shop }));
        try { recover(storage); return { durable: true, pending: false }; }
        catch (_) { return { durable: true, pending: true }; }
    }
    const routes = {
        forest: [
            { id: 'supply', name: 'ทางคนตัดไม้', text: 'รับประกันไม้ 3 จุด · เหมาะกับงานช่าง', target: 6, reward: ['resin', 2] },
            { id: 'forage', name: 'ลำธารสมุนไพร', text: 'รับประกันเห็ดและสมุนไพร · เก็บของ 6 จุด', target: 6, reward: ['shiitake', 2] }
        ],
        mine: [
            { id: 'ore', name: 'สำรวจสายแร่', text: 'พบแร่เพิ่ม 2 จุดต่อชั้น · ทุบหิน 8 ก้อน', target: 8, reward: ['coal', 3] },
            { id: 'survey', name: 'ตามรอยนักสำรวจ', text: 'เห็นเบาะแสบันได · เปิดทางลง 2 ชั้น', target: 2, reward: ['ironOre', 2] }
        ],
        beach: [
            { id: 'salvage', name: 'ตามของน้ำพัด', text: 'ไม้ลอยน้ำและเปลือกหอย 3 จุด · สำรวจ 6 จุด', target: 6, reward: ['salt', 2] },
            { id: 'cleanup', name: 'ดูแลชายหาด', text: 'เก็บขยะ 3 จุดให้สัตว์ทะเล · ได้เหยื่อเพิ่ม', target: 3, reward: ['seaweed', 3] }
        ]
    };
    function plan(zone, route, cells, floor = 1) {
        const out = cells.map(c => ({ ...c })), def = routes[zone]?.find(r => r.id === route);
        if (!def) return out;
        const usable = out.map((c, i) => !c.open && !['ladder', 'chest'].includes(c.k) ? i : -1).filter(i => i >= 0);
        const set = (pos, k, n) => { const i = usable[pos]; if (i !== undefined) out[i] = { k, n, open: false, ...(zone === 'mine' ? { hp: 1 } : {}) }; };
        if (zone === 'forest') {
            if (route === 'supply') { set(0, 'wood', 2); set(2, 'wood', 2); set(5, 'wood', 2); }
            else { set(0, 'shiitake', 1); set(3, 'lemongrass', 2); }
        } else if (zone === 'mine') {
            if (route === 'ore') { set(1, floor >= 10 ? 'ironOre' : 'copperOre', 2); set(4, 'coal', 2); }
            else out.filter(c => c.k === 'ladder').forEach(c => { c.hint = true; });
        } else if (route === 'salvage') { set(0, 'wood', 2); set(3, 'wood', 2); set(5, 'conch', 2); }
        else { set(0, 'trash', 1); set(3, 'trash', 1); set(5, 'trash', 1); }
        return out;
    }
    function cleanAdventure(raw) {
        const a = raw && typeof raw === 'object' ? raw : {}, active = {};
        Object.keys(routes).forEach(z => {
            const t = a.active?.[z], def = t && routes[z].find(r => r.id === t.route);
            if (def) active[z] = { route: def.id, progress: integer(t.progress, def.target), claimed: !!t.claimed };
        });
        return { gear: Object.fromEntries(['gloves', 'lamp', 'tidechart'].map(k => [k, integer(a.gear?.[k], 3)])),
            selected: Object.fromEntries(Object.keys(routes).map(z => [z, routes[z].some(r => r.id === a.selected?.[z]) ? a.selected[z] : routes[z][0].id])),
            active, supplies: { bandage: integer(a.supplies?.bandage, 20), rope: integer(a.supplies?.rope, 20) },
            rescues: integer(a.rescues, 1e6), completed: integer(a.completed, 1e6) };
    }
    root.FarmAdventure = { personalities, interest, initLot, advance, bid, cleanLot, minimum, haggle, commit, recover, routes, plan, cleanAdventure };
    if (typeof module === 'object') module.exports = root.FarmAdventure;
})(typeof window === 'object' ? window : globalThis);
