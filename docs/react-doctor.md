# React Doctor

[React Doctor](https://www.react.doctor) scans this codebase for security, performance, correctness, and architecture issues. Configuration lives in [`react-doctor.config.json`](../react-doctor.config.json) at the project root.

## Running scans

```bash
pnpm doctor
```

Use `--verbose` to see file paths and line numbers. Use `--diff` to scan only changed files.

## What we optimize for

React Doctor is a **triage tool**, not a style guide. We fix real issues (unused exports, incorrect patterns, security smells) and ignore rules that produce false positives or conflict with deliberate project conventions.

When adding a new ignore entry, document the rationale in this file so future contributors understand it is intentional, not oversight.

## Ignored files

| Pattern                                                 | Rationale                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `app/components/ui/**`                                  | shadcn/ui primitives — third-party generated components, not application logic |
| `packages/websockets/client/components/ChannelTest.tsx` | Dev-only WebSocket test harness, not production UI                             |

## Ignored rules

| Rule                                  | Rationale                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-doctor/no-cascading-set-state` | Too noisy for our event-handler and WebSocket bootstrap patterns where related state updates in one callback are intentional                                                                                                                                                                                                                   |
| `react-doctor/no-derived-useState`    | We sync props into local state in a few interactive components (inline edit, drag UI); the rule fights established UX patterns here                                                                                                                                                                                                            |
| `react-doctor/prefer-useReducer`      | **Not a pattern we use.** Multiple `useState` calls for form, dialog, and drag state are preferred over `useReducer` in this codebase                                                                                                                                                                                                          |
| `react-doctor/async-parallel`         | **False positive.** The rule flags sequential `await` even when independent work already runs in parallel. Example: [`change-password.tsx`](../app/routes/change-password.tsx) uses `Promise.all` for `getSystemAgent` and `hashPassword`; later awaits are correctly ordered dependencies (`updatePassword` → `createUserSession` → redirect) |
| `knip/types`                          | Knip type-export noise; type-only exports are handled separately and are not React Doctor signal                                                                                                                                                                                                                                               |

## Understanding the score

The CLI warning count and the displayed score use different weighting:

- **Warnings shown** = diagnostic hits in the report (files and messages).
- **Score (default, online)** = weighted by rule tier via React Doctor's API. A single high-tier warning can cost more points than many low-tier ones.
- **Score (`--offline`)** = local formula: `100 − (unique error rules × 1.5) − (unique warning rules × 0.75)`.

With current ignores, a clean scan should report **0 warnings** and a score near **100**. Use `--offline` if you want the transparent local formula instead of the cloud-weighted score.

## When to remove an ignore

Remove or narrow an ignore when:

1. The underlying pattern has been refactored away (e.g. a component no longer matches the false-positive case).
2. React Doctor releases a fix for a known tool bug (check [changelog](https://www.react.doctor) before re-enabling).
3. A rule was ignored temporarily during migration and the migration is complete.

Re-run `pnpm doctor` after changing config and update this document if the rationale changes.
