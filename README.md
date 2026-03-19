# Базовый сетап для курса AI driven development

Основное взаимодействие с окружающей системой происходит через CLI-утилиты. Поэтому важно иметь рабочий базовый набор инструментов и agent skills, а после установки проверить, что они не только поставились, но и реально настроены под ваши аккаунты.

## Автоматическая установка

Подходит для базовых Linux-дистрибутивов (Ubuntu-tested) и macOS.

```bash
make
```

По умолчанию `make` запускает target `ai`, который последовательно:

1. ставит `mise`, если его еще нет;
2. устанавливает инструменты из `mise.toml`;
3. ставит CLI-агенты;
4. ставит CLI-утилиты для агентов;
5. ставит curated skills для `codex` и `claude-code`;
6. добавляет marketplace и plugins для `claude-code`.

## Что устанавливается автоматически

### Инструменты через `mise`

Из `mise.toml` ставятся:

- `direnv`
- `gh`
- `himalaya`
- `gitleaks`
- `jq`
- `node`
- `ruby`
- `tmux`
- `yarn`
- `zellij`

### CLI-агенты

- `@anthropic-ai/claude-code`
- `@openai/codex`

### CLI-утилиты для агентов

| Утилита | Для чего | Как проверить |
| --- | --- | --- |
| `@playwright/cli` | Автоматизация работы с сайтами и тестирование веба | Попросить агента зайти на сайт и сделать скриншот |
| [gh](https://github.com/cli/cli) | Работа с GitHub API за пределами `git`: просмотр и создание issue, pull request, projects | Попросить агента посмотреть или создать issue в репозитории |
| [tgcli](https://github.com/dapi/tgcli) | Сбор требований из переписки | Попросить агента найти что-то в личной переписке в Telegram или закинуть пост в Избранное |
| [googleworkspace/cli](https://github.com/googleworkspace/cli) (`gws-docs`, `gws-docs-write`, `gws-drive`, `gws-sheets`) | Сбор требований и формирование проектной документации | Дать агенту ссылку на закрытый Google Doc и попросить прочитать его и дать выдержку |
| [himalaya](https://github.com/pimalaya/himalaya) | Работа с почтой через IMAP/SMTP из CLI | Попросить агента прочитать письмо или найти письмо по теме после настройки почтового аккаунта |

### Skills для агентов

Эти skills ставятся для `codex` и `claude-code`:

- `tgcli`
- `playwright-cli`
- `fpf-simple`
- `prompt-engeneering`
- `gws-docs`
- `gws-docs-write`
- `gws-drive`
- `gws-sheets`

### Plugins для Claude Code

Во время установки добавляются marketplace:

- `lackeyjb/playwright-skill`
- `dapi/claude-code-marketplace`

И ставятся plugins:

- `playwright-skill@playwright-skill`
- `himalaya@dapi`
- `pr-review-fix-loop@dapi`
- `spec-reviewer@dapi`
- `zellij-workflow@dapi`

## Что нужно настроить руками после установки

Установка бинаря не означает, что агент уже сможет работать с конкретной системой. После `make` обычно нужно отдельно пройти авторизацию и базовую настройку:

- `gh`: выполнить `gh auth login`
- `tgcli`: подключить Telegram-аккаунт
- `googleworkspace/cli`: подключить Google Workspace
- `himalaya`: настроить почтовый аккаунт и доступ к IMAP/SMTP
- `claude-code`: при необходимости проверить список plugins командой `claude plugins list`

## Что не ставится автоматически

Некоторые корпоративные интеграции зависят от конкретной компании и должны ставиться отдельно, если они вам нужны:

| Утилита | Для чего | Как проверить |
| --- | --- | --- |
| [jira-cli](https://github.com/ankitpokhrel/jira-cli) | Работа с Jira | Попросить агента прочитать или создать issue |
| [linear-cli](https://github.com/schpet/linear-cli) | Работа с Linear | Попросить агента прочитать или создать issue |
| [trello-cli](https://github.com/mheap/trello-cli) | Работа с Trello | Попросить агента прочитать или создать карточку |
