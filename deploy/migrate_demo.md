# Перенос demo@ikamdocs.ru и сущностей на прод

## Шаг 1. Экспорт (локально или с исходной БД)

Убедитесь, что `DATABASE_URL` в `.env` указывает на БД с demo-пользователем.

```bash
cd backend
python scripts/export_demo.py demo_export.json
```

Создастся файл `demo_export.json` с пользователями, компанией и сущностями.

## Шаг 2. Копирование на сервер

```bash
scp backend/demo_export.json root@195.133.25.37:/var/ikamdocs/backend/
```

## Шаг 3. Импорт на сервере

Подключитесь к серверу и выполните импорт. `.env` на сервере должен указывать на прод-БД.

```bash
ssh root@195.133.25.37
cd /var/ikamdocs/backend
source /var/ikamdocs/venv/bin/activate
python scripts/import_demo.py demo_export.json
```

## Альтернатива: через deploy

Добавьте `demo_export.json` в rsync (если уже экспортирован) и запускайте импорт вручную на сервере после деплоя.

## Учётные данные после импорта

- **demo@ikamdocs.ru** / Demo123!
- **user@demo.ikamdocs.ru** / User123! (если был в экспорте)
