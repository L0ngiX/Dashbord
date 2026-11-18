# Инструкция по обновлению

1. Сделайте резервную копию текущего GitHub-репозитория и Supabase.
2. Supabase → SQL Editor → New Query → скопируйте и выполните `supabase/migrations/20261118_building_modules.sql`.
3. Замените в корне репозитория только `index.html`, `app.js`, `styles.css`.
4. Сохраните `config.js`, workflow GitHub Actions и существующие миграции.
5. Выполните Commit Changes и дождитесь успешного деплоя.
6. Обновите страницу через Ctrl+F5.

Подробное описание разделов, источников, достоверности размеров и разграничения доступа находится в `SETUP_ROLES_RU.md`.
