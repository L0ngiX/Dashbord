# Настройка доступа и тестовых профилей

Четыре профиля (`visitor`, `design`, `maintenance`, `owner`) больше не создаются как Auth-пользователи. Это только переключаемые режимы просмотра внутри администраторской сессии.

Для управления приложением создайте один или несколько реальных администраторских аккаунтов в Supabase → Authentication → Users с обычными email и паролями. Для каждого администратора должна быть запись в `public.profiles` с `role='admin'`.

```sql
insert into public.profiles (user_id, display_name, role)
values ('UUID_ИЗ_AUTH_USERS', 'Имя администратора', 'admin')
on conflict (user_id) do update
set display_name=excluded.display_name, role='admin';
```

Обычные посетители не входят в систему и видят только публичную музейную страницу. Тестовые профили не аутентифицируются в Supabase и не имеют прав редактирования.
