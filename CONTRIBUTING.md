# Contributing

Follow the installation instructions in [README.md](README.md) before making changes.
Keep pull requests focused on one problem and explain the resulting behavior.

## Verification

Run from the repository root in the configured development environment:

```sh
npm run lint
npm test
npm run typecheck
npm run build
```

Include regression coverage for behavioral fixes. Report which checks ran and which
integrations, hardware, or deployment environments were not verified. Do not describe
a successful build as proof of production readiness.

## Changes and evidence

Use concise, descriptive commit messages. Keep generated caches, credentials, local
databases, private documents, and model checkpoints out of commits. Preserve dependency
lockfiles where present. Explain changes to configuration, data formats, and public APIs.

Document experiments with their dataset, split, configuration, environment, and metric
definitions. Keep synthetic examples separate from measured real-world results.
Dependency upgrades should include compatibility checks rather than only version edits.

The scoped `minimatch` override in `package.json` fixes GHSA-g3hv-75wg-m249 in the
TypeScript ESLint dependency tree. Keep it until the upstream dependency resolves to
a patched release without the override. Run `npm audit`, lint, tests, type generation,
typechecking, and a build when changing this resolution.

For a bug report, include reproduction steps, expected and actual behavior, and relevant
versions. Remove secrets and personal data from logs. Follow [SECURITY.md](SECURITY.md)
for security-sensitive reports.
