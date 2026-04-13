---
title: Configuration Guide
doc_kind: engineering
doc_function: canonical
purpose: Template for documenting the configuration ownership model. Read this when describing the project's env contract, naming conventions, and config sources.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Configuration Guide

This document does not need to list every environment variable one by one. Its job is to explain where the canonical configuration schema lives and how the downstream project documents important settings.

## Configuration Architecture

Describe the real configuration model of the project.

Examples:

- typed config class;
- `.env` + runtime env vars;
- YAML/JSON/TOML files with environment overlays;
- secret manager;
- Helm values / Terraform variables / deployment manifests.

### File Layout

```text
config/
├── application.yml
├── environments/
├── secrets/
└── ...
```

### Ownership Rules

Record:

1. which file or module owns the configuration schema;
2. where defaults are defined;
3. where environment-specific overrides live;
4. how secrets are documented without exposing values.

```ruby
# Example configuration access API:
Config.database_url
Settings.feature_flags.checkout_v2
ENV.fetch("APP_PORT")
```

## Naming Convention For Env Vars

| YAML structure | Env variable |
| --- | --- |
| `database.url` | `APP_DATABASE__URL` |
| `feature_checkout_v2` | `APP_FEATURE_CHECKOUT_V2` |
| `smtp.password` | `APP_SMTP__PASSWORD` |
| `storage.bucket` | `APP_STORAGE__BUCKET` |

Rules:

- choose one canonical prefix, or document explicitly that there is no prefix;
- if nesting is used, define the separator;
- document the rules for lists, booleans, and secrets;
- if the project forbids interpolation inside config files, state it explicitly.

## Documenting Important Variables

If the project needs a catalog of important variables, do not list everything. Focus on meaningful runtime contracts.

| Variable | Description | Default | Owner |
| --- | --- | --- | --- |
| `APP_DATABASE__URL` | Primary database connection | none | platform |
| `APP_REDIS__URL` | Cache or queue | `redis://localhost:6379/0` | platform |
| `APP_PUBLIC_BASE_URL` | Base URL used for link generation | `http://localhost:3000` | product/platform |
| `APP_FEATURE_X_ENABLED` | Feature flag | `false` | owning team |

## Secrets

- Never commit real secret values into the repository.
- Document only how secrets are stored, issued, and rotated.
- If part of the configuration comes from a secret manager, state that explicitly.

## Adoption Checklist

- [ ] the configuration schema owner is described
- [ ] the naming convention is documented
- [ ] important runtime and env contracts are listed
- [ ] secret handling is described
- [ ] references to nonexistent downstream catalogs are removed
