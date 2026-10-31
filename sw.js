// Service worker ของ Break Recorder: เก็บหน้าเว็บไว้ในเครื่อง เปิดใช้ได้แม้ไม่มีอินเทอร์เน็ต
// เปลี่ยนเลขเวอร์ชันเมื่อเปลี่ยนรายการไฟล์ที่ต้องเก็บ (ตัวหน้าเว็บเองจะอัปเดตทุกครั้งที่ออนไลน์อยู่แล้ว)
const CACHE = 'break-time-v3-pixel-art';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
    './farm.webmanifest', './farm-icon.svg', './farm-192.png', './farm-512.png', './farm-maskable-512.png', './farm-180.png',
    './farm-pixel-art.js?v=20261031', './farm-pixel-art.css?v=20261031'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // หน้าเว็บ: ขอจากเน็ตก่อนเพื่อให้ได้เวอร์ชันล่าสุด ถ้าออฟไลน์ค่อยใช้ฉบับที่เก็บไว้
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
                    }
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // ไฟล์ของเว็บและฟอนต์: ใช้ฉบับในเครื่องทันที แล้วแอบอัปเดตจากเน็ตไว้รอบหน้า
    if (url.origin === self.location.origin || FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.open(CACHE).then(async (cache) => {
                const cached = await cache.match(req);
                const network = fetch(req)
                    .then((res) => {
                        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
                        return res;
                    })
                    .catch(() => cached);
                return cached || network;
            })
        );
    }
});

// แตะการแจ้งเตือนแล้วเปิด/สลับกลับมาที่หน้าเว็บ
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            const win = wins.find((w) => w.url.startsWith(self.registration.scope));
            return win ? win.focus() : self.clients.openWindow('./');
        })
    );
});
