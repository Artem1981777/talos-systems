# Contributing to TALOS Systems

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code refactoring |
| `docs` | Documentation |
| `chore` | Build, CI, deps |
| `style` | Formatting, no logic change |

### Scopes

| Scope | Description |
|---|---|
| `agent` | AI agent reasoning logic |
| `chain` | Mantle RPC / on-chain |
| `ui` | Frontend components |
| `api` | Backend routes |
| `db` | Database schema |
| `ci` | GitHub Actions |

### Examples

```
feat(agent): add GPT-5 chain-of-thought reasoning
fix(chain): retry RPC on timeout with exponential backoff
perf(ui): memoize health factor chart data
docs(api): add OpenAPI spec for /agent/think endpoint
chore(ci): add typecheck job to CI workflow
```

## Branch Strategy

```
main        — production (auto-deploys to replit.app)
develop     — integration branch
feat/*      — feature branches
fix/*       — bugfix branches
```

## Development

```bash
# Install dependencies
pnpm install

# Run all services
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/talos run dev

# Push DB schema
pnpm --filter @workspace/db run push

# Typecheck everything
pnpm run typecheck
```

## Architecture

See [README.md](../README.md) for full architecture details.
