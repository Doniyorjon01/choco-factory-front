# Chocolate Factory — frontend

React + Vite. Butun ilova bitta faylda: `src/App.jsx`.

```
choco-frontend/
├── src/
│   ├── App.jsx          # hamma ekranlar, uslublar, matnlar (uz/ru), API
│   └── main.jsx         # App ni sahifaga ulaydi
├── .dockerignore
├── docker-compose.yml   # frontend konteyneri (nginx)
├── Dockerfile           # build (node) → nginx
├── index.html
├── nginx.conf           # sahifa + /api → backend
├── package.json
├── README.md
└── vite.config.js       # dev serverda /api → backend
```

API so'rovlari doim `/api/...` ga ketadi. Dev rejimda ularni Vite, Docker'da nginx backendga uzatadi.
Shuning uchun CORS sozlash shart emas.

## Lokal ishlab chiqish

Backend Docker'da ishlab turishi kerak (`127.0.0.1:8020`).

```bash
cd choco-frontend
npm install
npm run dev          # http://localhost:5173
```

Backend boshqa portda bo'lsa, `choco-frontend/.env` faylini yarating:

```
API_TARGET=http://127.0.0.1:8021
```

## Docker (serverda)

Avval backend ishga tushgan bo'lishi kerak: u `chocolate_default` tarmog'ini yaratadi.

```bash
cd choco-frontend
docker compose up -d --build
docker compose ps
```

- Sayt: http://127.0.0.1:8030 (faqat shu kompyuterdan ochiladi)
- Port band bo'lsa: `WEB_HOST_PORT=8031 docker compose up -d --build`
- Domen kerak bo'lsa, mavjud reverse proxy (Caddy) dan `127.0.0.1:8030` ga yo'naltiring.
- Loyiha nomi `chocolate-web`. U javon, annur, saxovat va backend konteynerlariga tegmaydi.
- Kod o'zgarganda: `docker compose up -d --build`.

## Rollar

| Rol | Ekranlar |
|---|---|
| Administrator | hammasi |
| Omborchi | ombor paneli, qoldiqlar, kirim, tuzatish, brak, jurnal, mahsulotlar (ko'rish) |
| Operator | ishlab chiqarish, qoldiqlar (ko'rish), mening hujjatlarim, brak (faqat tayyor mahsulot) |

Demo loginlar (backend seed): `admin`, `omborchi`, `operator`, parol `Kakao2026`.
