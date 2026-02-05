# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CI pipeline with lint, typecheck, security audit, and tests
- Test coverage for workspace and connections modules
- Test stability analysis documentation

### Changed
- Improved README with complete setup instructions
- Optimized CI workflow with caching and concurrency

### Fixed
- Security vulnerabilities in dependencies (js-yaml, uglify-js)
- Test infrastructure funding amount for fuel-core compatibility
- CLI token tests now environment-independent

### Security
- Added pnpm overrides for vulnerable dependencies
- Security audit job in CI pipeline
