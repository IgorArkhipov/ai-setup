# AI Setup API

Rails 8 API-only application scaffolded for PostgreSQL 18 and container-first local development.

## Versions

- Rails 8.1.3
- Ruby 3.4.7
- Bundler 4.0.9
- Minitest 6.0.2

## Run with Docker

```bash
docker compose up --build
```

The API will be available on `http://localhost:3000`, and the built-in health endpoint is `http://localhost:3000/up`.

## Run tests in Docker

```bash
docker compose run --rm web bundle _4.0.9_ exec rails test
```
