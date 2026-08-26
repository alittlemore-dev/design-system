# design-system

[🇺🇸 English version](./README.md)

Angular-библиотека дизайн-системы с независимыми от приложений UI-компонентами, общими стилями,
Markdown-рендерингом и редактором, а также тестовыми утилитами для `my-site` и
`personal-workspace`.

## Архитектура

- [Топология пакета](../docs/package-topology.md)
- [Дистрибуция пакета](../docs/package-distribution.md)
- [Совместимость с Angular](../docs/angular-compatibility.md)

## Make-команды

| Команда | Описание |
| --- | --- |
| `make install` | Установить зависимости из lock-файла. |
| `make build` | Собрать production-пакет библиотеки. |
| `make watch` | Пересобирать библиотеку при изменении исходных файлов. |
| `make test-api-surface` | Запустить тесты проверки публичного API. |
| `make check-api-surface` | Собрать и проверить публичный API и границы импортов. |
| `make update-api-surface` | Обновить API-отчёты после намеренного изменения публичного API. |
