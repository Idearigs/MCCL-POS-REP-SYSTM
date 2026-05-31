# Development Process

How work flows from idea → code → production for TrueDesk / MPS.

> **Context:** mission-critical, multi-tenant jewelry POS. If it breaks, customers
> can't take payments. This process is deliberately **lightweight** (currently a
> solo developer) but the few rules here exist because the cost of a bad production
> push is high. When in doubt, favour the safe path.

---

## 1. Branching model (GitFlow-lite)

```
main      ●───────────●────────────●     ← PRODUCTION. Protected. Auto-deploys.
           \         / \          /
develop     ●──●──●─●   ●──●──●──●        ← Integration. Protected. Always releasable.
             \  /        \    /
feature/x     ●─●         ●──●            ← Short-lived working branches.
```

- **`main`** — production. Every commit here deploys to live customers (see §5). Never commit directly; only merge from `develop` via PR.
- **`develop`** — integration branch. All features land here first. Should always be in a releasable state.
- **Working branches** — branch off `develop`, one per task. Use a type prefix:

  | Prefix | For |
  |--------|-----|
  | `feature/` | new functionality |
  | `fix/` | bug fixes |
  | `docs/` | documentation only |
  | `chore/` | tooling, deps, config, refactors |
  | `hotfix/` | urgent production fix (branch off `main`, see §6) |

  Example: `feature/gift-card-refunds`, `fix/sale-duplicate-number`.

Both `main` and `develop` are **branch-protected**: no direct pushes, and the
**`CI Gate`** status check must pass before merge.

---

## 2. Commit messages (Conventional Commits)

Format: `type(scope): summary`

```
feat(sales): add partial refund support
fix(auth): reject expired refresh tokens
docs: add database restore runbook
chore(deps): bump @sentry/node to 9.x
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`.
Keep the summary imperative and under ~72 chars. Explain the *why* in the body
when it isn't obvious.

---

## 3. The everyday loop

1. Pick (or open) an Issue — see §7. One branch = one Issue where possible.
2. `git checkout develop && git pull` then `git checkout -b feature/<thing>`.
3. Build it. Add/adjust tests for the behaviour you changed.
4. Run the checks locally (see §4) until green.
5. Push and open a **PR into `develop`**. Reference the issue (`Closes #12`).
6. Wait for **CI Gate** to pass. Self-review the diff (see the PR checklist).
7. Merge to `develop`. Delete the branch.
8. When `develop` is ready to ship, open a **PR `develop` → `main`** to release (§5).

Even solo, **always go through a PR** — it runs CI, gives you a diff to review
with fresh eyes, and creates a paper trail of *why* each change shipped.

---

## 4. Definition of Done

A change is "done" only when **all** of these are true:

- [ ] Code builds locally (`npm run build` in the affected package)
- [ ] Lint passes with **no new errors** (`npm run lint`)
- [ ] Tests pass (`npm test`); new/changed money paths (sales, refunds, auth,
      inventory, payments) have test coverage
- [ ] Any DB schema change ships as a **Prisma migration** and is backward-safe
      (additive first; don't drop columns the running app still reads)
- [ ] No secrets committed (`.env` stays untracked; use `.env.example`)
- [ ] PR description explains **what** and **why**; linked to its Issue
- [ ] CI Gate is green
- [ ] After deploy: `/health` is green and a quick **smoke test** passed (§5)

---

## 5. Release & deployment

**Deployment is automated by GitHub Actions and triggers only on `main`.**
Pushing/merging to `main` runs `.github/workflows/ci-cd.yml`, which:

```
merge to main
   └─ run tests (must pass)
   └─ detect which services changed (only those deploy)
   └─ curl the Coolify deploy webhook for each changed service
   └─ post-deploy health check (curls the public URL / /health)
         └─ job fails loudly if the service doesn't come back healthy
```

Production services & their checks:

| Service | Public URL | Post-deploy check |
|---------|------------|-------------------|
| POS Backend | https://api.truedesk.co.uk | `GET /health` |
| POS Frontend | https://pos.truedesk.co.uk | homepage 200 |
| Mainframe Backend / Admin | *.truedesk.co.uk | webhook trigger |

### To release
1. Open a PR `develop` → `main`. Review the full diff — this is the last gate
   before customers.
2. Merge. Watch the **Actions** tab: the deploy job(s) should go green.
3. **Smoke test production**: log in, load customers, ring up a test sale,
   confirm `/health` returns `ok`.
4. If Discord pings a failure, or the smoke test fails → **roll back** (§6).

> ⚠️ **No staging environment yet.** `develop` is a git branch, not a running
> deploy — code is first *executed in production*. This is the biggest reliability
> gap in the current process. See [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md)
> for the plan to add a staging deploy from `develop`.

---

## 6. Hotfixes & rollback

**Urgent production bug:**
1. Branch `hotfix/<thing>` off **`main`** (not develop).
2. Fix + test, PR into `main`, merge → it auto-deploys.
3. Merge `main` back into `develop` so the fix isn't lost.

**Rollback (deploy made things worse):**
- Fastest: in **Coolify**, redeploy the previous good image/commit for that service.
- Or: `git revert` the bad merge on `main` and push → CI redeploys the reverted state.
- Then smoke test and confirm `/health` is green.

**Database disaster:** see
[runbooks/database-backup-restore.md](./runbooks/database-backup-restore.md).

---

## 7. Tracking work (GitHub Issues)

All features and bugs live as **GitHub Issues** — not in your head. Even a
one-line issue is worth it: it gives history, links to the PR that resolved it,
and a place to capture context.

- Open an Issue using the **Bug report** or **Feature request** template.
- Label it (`type:*`, `priority:*`, `area:*`).
- Reference it from the branch/PR; close it with `Closes #<n>` in the PR.

Labels:

| Group | Labels |
|-------|--------|
| Type | `type:bug`, `type:feature`, `type:chore`, `type:docs` |
| Priority | `priority:high`, `priority:medium`, `priority:low` |
| Area | `area:pos-backend`, `area:pos-frontend`, `area:mainframe`, `area:ops` |

`priority:high` = customer-impacting / data-risk → do first.

---

## 8. Where things live

| Topic | Location |
|-------|----------|
| Reliability maturity & plan | [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md) |
| Backup & restore runbook | [runbooks/database-backup-restore.md](./runbooks/database-backup-restore.md) |
| CI/CD pipeline | `.github/workflows/ci-cd.yml` |
| Backend env template | `backend/.env.example` |

---

## 9. Operational guardrails (don't undo these)

- Production DB **public port stays closed** — the app connects internally.
- **Backups** run nightly to off-site storage and are restore-tested (see runbook).
- **Discord alerts** fire on backup/deploy/scheduled-task **failures** only.
- Secrets are rotated when exposed; never commit real `.env` files.
