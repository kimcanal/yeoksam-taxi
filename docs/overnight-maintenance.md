# Overnight Maintenance Runbook

This runbook defines the unattended local workflow for data refreshes and
presentation-safe artifact maintenance.

## Single Command

Use this command as the one approval target:

```bash
npm run overnight:maintenance
```

Recommended persistent approval prefix:

```text
["npm", "run", "overnight:maintenance"]
```

The script writes:

- `.tmp/overnight-report.md`
- `.tmp/overnight-report.json`
- `.tmp/overnight-report.log`

The `.tmp/` directory is git-ignored.

## Modes

Live data refresh with checks:

```bash
npm run overnight:maintenance
```

Offline refresh from cached snapshots, useful when API/network access is not
available:

```bash
npm run overnight:maintenance -- --offline
```

Refresh, run checks, commit generated artifacts, and push the current branch:

```bash
npm run overnight:maintenance -- --commit --push
```

Skip API collection but regenerate artifacts from the latest raw snapshots:

```bash
npm run overnight:maintenance -- --skip-collect
```

Run for a specific target hour:

```bash
npm run overnight:maintenance -- "2026-05-07 01:00"
```

Fast smoke run without lint/build:

```bash
npm run overnight:maintenance -- --no-checks
```

Dry run that only writes the report skeleton:

```bash
npm run overnight:maintenance -- --dry-run
```

## Safety Contract

The script may:

- Run the existing live demand cycle.
- Refresh public/generated JSON artifacts.
- Run `npm run lint` and `npm run build`.
- Commit and push only when `--commit --push` is explicit.

The script will not:

- Merge into `main`.
- Delete files.
- Change secrets or repository variables.
- Stage arbitrary code changes by default.
- Commit if the worktree was already dirty at start, unless `--allow-dirty` is
  explicitly passed.

When committing, the script stages only the generated artifact allowlist used by
the forecast workflow. Code refactors should still be reviewed and committed by
the agent in a normal branch/PR flow.

## Failure Policy

If collection fails, the live cycle can continue with the latest cached raw
snapshots. If lint or build fails, the script exits non-zero and skips commit and
push. The report captures the failed step and the command log path.

## Recommended Nightly Pattern

For unattended data refreshes:

```bash
npm run overnight:maintenance -- --commit --push
```

For safer no-push maintenance while evaluating a code refactor:

```bash
npm run overnight:maintenance -- --offline --no-checks
```

After waking up, inspect:

```bash
sed -n '1,220p' .tmp/overnight-report.md
git status -sb
```
