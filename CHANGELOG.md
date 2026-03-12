# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive CI pipeline with lint, typecheck, security audit, and tests
- Test coverage for workspace and connections modules
- Test stability analysis documentation
- Added environment variable `SOCKET_CLIENT_DISCONNECT_TIMEOUT` to allow configuration of the socket client's auto-disconnect timeout.
- Health check endpoints for API uptime monitoring:
  - `GET /healthcheck/db` - PostgreSQL connectivity check (executes `SELECT 1`)
  - `GET /healthcheck/redis` - Redis connectivity check (executes `PING` on both read/write clients)
  - All endpoints return HTTP 200 with `{ status: 'ok' }` on success or HTTP 5\*\* on failure
  - Designed for integration with uptime monitoring services (e.g., UptimeRobot, Datadog, New Relic)

### Changed

- Improved README with complete setup instructions
- Optimized CI workflow with caching and concurrency
- Removed Docker-based start command for socket-server in development; now runs directly with Node.js for local development
– Additional logs for detailed tracking of socket events emitted on the API
- Increased the socket auto-disconnect timeout after event emission to ensure more reliable delivery and prevent premature disconnections during high-latency operations.
- Updated the `build:prod` script to execute `postbuild` after the build process, ensuring all necessary post-build steps are consistently applied in production builds.
- Method `findById` of PredicateService now returns the `email` and `notify` fields of predicate members.

### Fixed

- Security vulnerabilities in dependencies (js-yaml, uglify-js)
- Test infrastructure funding amount for fuel-core compatibility
- CLI token tests now environment-independent
- Worker deploy failing due to arm64v8-specific Docker images on amd64 runner
- Worker deploy workflow modernized to use docker/build-push-action with buildx
- Email sending errors during predicate creation no longer interrupt the creation flow; failures are logged but do not block predicate creation.

### Security

- Added pnpm overrides for vulnerable dependencies
- Security audit job in CI pipeline
- Upgraded axios from 1.12.0 to 1.13.5 (GHSA-43fc-jf86-j433)
- Upgraded nodemailer to 8.0.1 to resolve DoS vulnerability (GHSA-rcmh-qjqh-p98v)
