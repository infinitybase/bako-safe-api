# Contributing to Bako Safe API

Thank you for your interest in contributing to Bako Safe!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow the [Development Setup](README.md#development) instructions

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-new-endpoint`
- `fix/transaction-validation`
- `docs/update-readme`
- `refactor/auth-module`

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
# Check formatting
pnpm lint

# Fix formatting issues
pnpm lint --fix
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat: add new endpoint for workspace settings
fix: resolve transaction timeout issue
docs: update API documentation
refactor: simplify auth middleware
test: add tests for predicate module
chore: update dependencies
```

### Testing

Before submitting a PR:

```bash
# Run tests
cd packages/api && pnpm test:build

# Verify the build
cd packages/api && pnpm build
```

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Fill out the PR template
4. Request review from maintainers

### PR Template

When creating a PR, include:
- Brief description of changes
- Summary of what was done
- Link to related issue (if applicable)

## Project Structure

```
packages/
├── api/            # Main REST API
├── socket-server/  # WebSocket server
├── database/       # Database Docker setup
├── redis/          # Redis Docker setup
├── chain/          # Local Fuel network
├── worker/         # Background jobs
└── metabase/       # Analytics
```

## Need Help?

- Check existing issues
- Create a new issue with details
- Join our community channels

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
