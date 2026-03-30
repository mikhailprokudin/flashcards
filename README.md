# Карточки для изучения китайского языка

## Бэкенд API (Docker)

Нужны [Docker](https://docs.docker.com/get-docker/) и Docker Compose v2.

1. Скопируйте [`.env.example`](.env.example) в `.env` и задайте свои значения: пароли MySQL (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`), тот же пароль пользователя в `DATABASE_URL`, случайную строку для `JWT_SECRET`.
2. Из корня репозитория:

   ```bash
   docker compose up --build
   ```

   Поднимутся MySQL (с healthcheck) и API: при старте контейнера API выполняются миграции, затем сервер слушает порт **3000** внутри контейнера; на хост пробрасывается порт из переменной `PORT` в `.env` (по умолчанию 3000).

3. Проверка: `GET http://localhost:3000/health` → `{"ok":true}` (подставьте свой порт, если меняли `PORT`).

Пример регистрации и входа (тело JSON, ответ содержит `token`):

```bash
curl -sS -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'

curl -sS -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

Дальнейшие запросы к защищённым маршрутам: заголовок `Authorization: Bearer <token>`.

Фронтенд (Vite) в dev обычно на `http://localhost:5173` — в `.env` для API задайте `CORS_ORIGIN` под ваш origin.
