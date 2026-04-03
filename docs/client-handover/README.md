# Документация по продукту ikamdocs (передача клиенту)

Набор документов соответствует типовому запросу на описание ПО для передачи прав и самостоятельной доработки.

**Область описания:** функциональность без учёта интеграций с внешними торговыми площадками (маркетплейсами). В кодовой базе могут присутствовать соответствующие модули — в настоящей поставке они не документируются и могут быть отключены на уровне конфигурации.

| № | Документ | Содержание |
|---|----------|------------|
| 2 | [02-functional-specification.md](./02-functional-specification.md) | Назначение, задачи, модули, сценарии, результаты, ограничения |
| 3 | [03-installation-and-operation.md](./03-installation-and-operation.md) | Требования, установка, настройка, запуск, бэкапы, обновления, диагностика |
| 4 | [04-lifecycle-support.md](./04-lifecycle-support.md) | Поддержание жизненного цикла ПО |
| 5 | [05-user-manual.md](./05-user-manual.md) | Руководство пользователя |
| 6 | [06-admin-manual.md](./06-admin-manual.md) | Руководство администратора |
| 7 | [07-software-composition.md](./07-software-composition.md) | Состав поставляемого ПО |

**Связанные материалы в репозитории:** `deploy/DEPLOY_GUIDE.md`, `deploy/deploy.sh`, `deploy/nginx-ikamdocs.conf`, `backend/.env.example`, `backend/requirements.txt`, `frontend/package.json`.

**Формат Word:** объединённый файл `ikamdocs-client-handover.docx` (все разделы подряд). Пересборка после правок Markdown:

```bash
cd ikamdocs/docs/client-handover
python3 build_docx.py
```

Требуются пакеты: `python-docx`, `markdown`, `beautifulsoup4`, `lxml` (см. вызовы в `build_docx.py`).

---

*Версия комплекта документов: 2026-03.*
