See PROJECT.md for project description.

## Stack
Ruby on Rails 8, PostgreSQL 18, Minitest, Sidekiq, Redis

## Key commands
- `bin/setup` — bootstrap
- `bin/rails s` — run server
- `bundle exec rspec` — run tests
- `bin/rails db:migrate` — migrate

## Conventions
- Standard Rails MVC, Comand pattern, no service objects apart from external API clients
- Minitest for tests, FactoryBot for fixtures
- No new gems without explicit request

## Constraints
- Don't touch existing migrations
- Don't implement auth yet
