# Календарь звонков


[![hexlet-check](https://github.com/alexander-baranov/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/alexander-baranov/ai-for-developers-project-386/actions)

Это web-приложение для бронирования слотов времени. Владелец публикует доступные интервалы времени, а гость имеет возможность забронировать свободный интервал для встречи. Владелец имеет возможность заводить типы встреч и их длительность. Гость заходит без регистрации, выбирает тип встречи, открывает календарь на ближайшие 14 дней и записывается на свободный слот.  Слот длится в соответствии с выбранным типом встречи. Одно и то же время нельзя занять дважды.

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Backend: Deno + `Deno.serve`, SQLite (`jsr:@db/sqlite`), порт 7999
- Frontend: Preact + Vite + TS, порт 8000, прокси `/api → http://localhost:7999`

## Установка (без Node, только Deno)

```bash
git clone https://github.com/alexander-baranov/ai-for-developers-project-386.git
cd ai-for-developers-project-386
# если сеть через прокси:
export HTTP_PROXY=http://127.0.0.1:3067 HTTPS_PROXY=http://127.0.0.1:3067 NO_PROXY=localhost,127.0.0.1
```

## Использование

```bash
# бэк (порт 7999)
cd backend && deno task start

# фронт (порт 8000, Vite через Deno)
cd frontend && deno task dev
```

API: `GET/POST /api/meeting-types`, `DELETE /api/meeting-types/:id`, `GET/POST /api/slots?from=&to=`, `DELETE /api/slots/:id`.
`start_at` — UTC ISO. Окно 09:00–18:00 UTC, шаг 15 мин, длительность `HH:MM` кратна 15 мин. 400 — валидация, 409 — пересечение.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
