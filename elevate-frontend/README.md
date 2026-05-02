# Elevate — Progress Tracker

## Структура

```
elevate/
├── backend/          ← твій існуючий бекенд
│   ├── server.js
│   ├── db.js
│   ├── data/         ← створюється автоматично
│   └── package.json  ← замінити на elevate-backend-package.json
│
└── elevate-frontend/ ← новий фронтенд
    ├── src/
    │   ├── App.jsx
    │   ├── index.css
    │   ├── main.jsx
    │   ├── api/index.js
    │   ├── components/
    │   └── pages/
    └── package.json
```

## Запуск

### 1. Бекенд

```bash
cd backend
# Замінити package.json на elevate-backend-package.json (додати type:module + залежності)
npm install
npm start
# Запуститься на http://localhost:3001
```

### 2. Фронтенд

```bash
cd elevate-frontend
npm install
npm run dev
# Відкрий http://localhost:5173
```

> Vite автоматично проксує `/api` → `http://localhost:3001`

---

## Функціонал

- **Dashboard** — картки всіх проектів з прогресом і фільтрами
- **Projects** — список у вигляді рядків з прогрес-барами  
- **Project Detail**:
  - Вкладка **Activities** — лог всіх активностей з можливістю видалення
  - Вкладка **Statistics** — streak, години, heatmap 21 день, розподіл інтенсивності
  - Вкладка **Settings** — архівація / видалення проекту
- Модалки: **Новий проект**, **Логування активності**, **Редагування проекту**
- Toast-повідомлення для всіх дій
