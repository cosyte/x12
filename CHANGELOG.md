# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repo scaffolding (Phase 1): package metadata, dual ESM+CJS build via
  `tsup`, strict TypeScript config (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), ESLint flat config with
  type-checked rules + JSDoc/`@example` gate on public exports, Prettier,
  Vitest, and a Node 18/20/22 CI matrix.
