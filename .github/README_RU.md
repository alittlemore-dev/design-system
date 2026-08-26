# design-system

[🇺🇸 English version](./README.md)

Angular-библиотека дизайн-системы с независимыми от приложений UI-компонентами, общими стилями,
Markdown-рендерингом и редактором, а также публичными тестовыми утилитами.

## Архитектура

- [Топология пакета](../docs/package-topology.md)
- [Дистрибуция пакета](../docs/package-distribution.md)
- [Совместимость с Angular](../docs/angular-compatibility.md)
- [Контракты зависимостей](../docs/dependency-contracts.md)

## Make-команды

| Команда                   | Описание                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| `make install`            | Установить зависимости из lock-файла.                               |
| `make test`               | Запустить Angular Jest-тесты и тесты инструментов репозитория.      |
| `make test-watch`         | Запустить Angular Jest-тесты в watch-режиме.                        |
| `make test-coverage`      | Запустить Angular Jest-тесты с отчётами покрытия.                   |
| `make lint`               | Проверить TypeScript, Angular-шаблоны и инструменты репозитория.    |
| `make typecheck`          | Проверить типы production-исходников и Jest-тестов.                 |
| `make format`             | Отформатировать исходники, конфигурацию и документацию.             |
| `make format-check`       | Проверить форматирование без изменения файлов.                      |
| `make build`              | Собрать production-пакет библиотеки в partial-Ivy режиме.           |
| `make watch`              | Пересобирать библиотеку при изменении исходных файлов.              |
| `make verify-package`     | Собрать и проверить публичный API, зависимости и содержимое архива. |
| `make check`              | Запустить полный локальный quality gate.                            |
| `make test-api-surface`   | Запустить тесты проверки публичного API.                            |
| `make check-api-surface`  | Собрать и проверить публичный API и границы импортов.               |
| `make update-api-surface` | Обновить API-отчёты после намеренного изменения публичного API.     |
