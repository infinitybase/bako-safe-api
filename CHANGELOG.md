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

### Changed

- Improved README with complete setup instructions
- Optimized CI workflow with caching and concurrency
- Removed Docker-based start command for socket-server in development; now runs directly with Node.js for local development.
– Additional logs for detailed tracking of socket events emitted on the API
- Increased the socket auto-disconnect timeout after event emission to ensure more reliable delivery and prevent premature disconnections during high-latency operations.

### Fixed

- Security vulnerabilities in dependencies (js-yaml, uglify-js)
- Test infrastructure funding amount for fuel-core compatibility
- CLI token tests now environment-independent
- Worker deploy failing due to arm64v8-specific Docker images on amd64 runner
- Worker deploy workflow modernized to use docker/build-push-action with buildx

### Security

- Added pnpm overrides for vulnerable dependencies
- Security audit job in CI pipeline
- Upgraded axios from 1.12.0 to 1.13.5 (GHSA-43fc-jf86-j433)
