# API для интеграции

> Полная документация по всем способам интеграции: **[INTEGRATIONS.md](./INTEGRATIONS.md)** (REST API, Webhooks, модули 1С/ERP/CRM).

## Назначение

API ikamdocs позволяет двухстороннюю передачу данных с 1С, ERP, CRM и другими системами.

## Получение API-ключа

1. Войдите в личный кабинет → Настройки → API
2. Создайте новый ключ (например, «1С УТ 11»)
3. Сохраните ключ — он отображается один раз

## Базовый URL

```
https://ikamdocs.ru/api/v1/integrate
```

## Аутентификация

Все запросы должны содержать заголовок:

```
X-Api-Key: ваш_api_ключ
```

## Сущности для обмена

- `nomenclature` — номенклатура (код изделия, название, категория, спецификация и т.д.)
- `category` — категория
- `subcategory` — подкатегория
- `supply` — поставка
- `manufacturer` — производитель
- `supplier` — поставщик (телефон, адрес)
- `contract` — договор поставки
- `contract_appendix` — приложение к договору
- `document` — сопроводительная документация (сканы, PDF)

## Эндпоинты

### GET /api/v1/integrate/entities

Получение списка сущностей.

**Query-параметры:**
- `entity_type` — nomenclature | supplier | supply | manufacturer | contract | ...
- `limit`, `offset` — пагинация

### POST /api/v1/integrate/entities

Создание сущности.

**Тело запроса (JSON):**
```json
{
  "entity_type": "nomenclature",
  "data": {
    "name": "Изделие А",
    "code": "IZD-001",
    "category_id": 1,
    "tag_number": "TAG-123",
    "specification": "..."
  }
}
```

### PUT /api/v1/integrate/entities/{id}

Обновление сущности.

### DELETE /api/v1/integrate/entities/{id}

Удаление (soft delete).

## Поля сущностей

| Сущность      | Ключевые поля                                              |
|---------------|------------------------------------------------------------|
| nomenclature  | code, name, category_id, subcategory_id, tag_number, specification, question_sheet_no, manufacturer_id |
| supplier      | name, phone, address, inn                                 |
| manufacturer  | name, address                                              |
| supply        | supplier_id, nomenclature_id, quantity, production_date, calibration_date |
| contract      | supplier_id, number, date_start, date_end                 |
| contract_appendix | contract_id, name                                      |

## Выбор сущностей для передачи

В личном кабинете → API → Управление интеграциями вы можете выбрать, какие сущности синхронизировать с внешней системой.

## Интеграция с 1С

1. Создайте HTTP-соединение в 1С к `https://ikamdocs.ru/api/v1/integrate`
2. Добавьте заголовок `X-Api-Key`
3. Реализуйте обмен по расписанию или по событию
4. Маппинг справочников — через соответствие полей (см. документацию 1С)

## Интеграция с ERP/CRM

Аналогично: REST API, заголовок `X-Api-Key`, JSON-тела запросов.
