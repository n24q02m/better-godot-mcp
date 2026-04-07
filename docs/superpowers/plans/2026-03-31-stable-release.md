# Stable Release: better-godot-mcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all open issues/PRs/security, achieve >95% test coverage, pass E2E testing with real Godot 4.6.1, release stable version via PSR.

**Architecture:** 4-phase approach — cleanup first (merge PRs, close issues, delete branches), then code quality (coverage gaps), then E2E verification with real Godot binary, then release via PSR workflow_dispatch.

**Tech Stack:** TypeScript, Node.js 24, Bun, Vitest, Biome, MCP SDK, Godot 4.6.1, PSR v10.

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `tests/godot/headless.test.ts` or new `tests/godot/headless-async.test.ts` | Add tests for `execGodotAsync` |
| No change | `tests/live/full-godot.full.test.ts` | Existing E2E tests — run with real Godot |
| No change | `tests/live/mcp-protocol.live.test.ts` | Existing protocol tests — run with real Godot |
| No change | `test-live-mcp.mjs` | Standalone live test script |

---

### Task 1: Review and merge PR #342 (Bolt regex optimization)

**Context:** PR #342 adds `includes()` guards before regex `match()` calls in `src/tools/helpers/scene-parser.ts`. This is a pure performance optimization — if the substring isn't present, skip the regex entirely. CI passes. All 644 tests pass.

- [ ] **Step 1: Review the PR diff**

The diff changes 26 lines in `scene-parser.ts`. Pattern: `line.match(rxFoo)` becomes `line.includes('foo=') ? line.match(rxFoo) : null`. Verify:
- Each `includes()` guard string matches what the regex actually looks for
- No behavioral change: both paths produce `null` when there's no match
- Guards cover: `format=`, `load_steps=`, `uid=`, `type="`, `path="`, ` id="`, `name="`, `parent="`, `instance=`, `groups=`, `signal="`, `from="`, `to="`, `method="`, `flags=`

```bash
cd ~/projects/better-godot-mcp && gh pr diff 342
```

- [ ] **Step 2: Merge the PR**

```bash
cd ~/projects/better-godot-mcp && gh pr merge 342 --squash --delete-branch
```

- [ ] **Step 3: Pull changes to local**

```bash
cd ~/projects/better-godot-mcp && git pull origin main
```

- [ ] **Step 4: Verify tests still pass after merge**

```bash
cd ~/projects/better-godot-mcp && bun run test
```

Expected: 40+ test files, 644+ tests, all PASS.

---

### Task 2: Review and merge PR #341 (dependency update)

**Context:** PR #341 updates non-major dependencies: `@biomejs/biome` ^2.4.9 -> ^2.4.10, `@modelcontextprotocol/sdk` ^1.28.0 -> ^1.29.0. CI passes. Dependency review passes.

- [ ] **Step 1: Review changes**

Only `package.json` and `bun.lock` change. Verify:
- Biome 2.4.10: patch release with new lint rules and fixes. No breaking changes.
- MCP SDK 1.29.0: minor release. Check if any API changes affect our usage.

```bash
cd ~/projects/better-godot-mcp && gh pr diff 341
```

- [ ] **Step 2: Merge the PR**

```bash
cd ~/projects/better-godot-mcp && gh pr merge 341 --squash --delete-branch
```

- [ ] **Step 3: Pull and install**

```bash
cd ~/projects/better-godot-mcp && git pull origin main && bun install --frozen-lockfile
```

- [ ] **Step 4: Run full check suite**

```bash
cd ~/projects/better-godot-mcp && bun run check && bun run test && bun run build
```

Expected: lint PASS, 644+ tests PASS, build succeeds.

---

### Task 3: Close Issue #322 and cleanup stale branches

**Context:** Issue #322 is about relay page integration. Relay was already removed from the code (commit `c25015e`). The relay core library exists separately in `mcp-relay-core` but godot-mcp no longer uses it. ~28 stale remote branches exist from bot PRs, jules tasks, and closed PRs.

- [ ] **Step 1: Close Issue #322 with explanation**

```bash
cd ~/projects/better-godot-mcp && gh issue close 322 --comment "Relay feature has been removed from better-godot-mcp. Config is handled via env vars (GODOT_PROJECT_PATH, GODOT_PATH) and runtime config.set. The relay core library remains available in mcp-relay-core for other MCP servers that need it."
```

- [ ] **Step 2: Delete stale remote branches**

Delete all remote branches except `main` and active Renovate branches. Run this to identify candidates:

```bash
cd ~/projects/better-godot-mcp && git fetch --prune
git branch -r | grep -v 'origin/main$' | grep -v 'origin/HEAD' | grep -v 'renovate/non-major' | grep -v 'renovate/lock-file-maintenance'
```

Then delete the stale ones (bolt/*, jules/*, fix/*, feat/*, test/*, sentinel/*):

```bash
cd ~/projects/better-godot-mcp
for branch in $(git branch -r | grep -E 'origin/(bolt|jules|fix|feat|test|sentinel)' | sed 's|origin/||'); do
  git push origin --delete "$branch"
done
```

Also clean up closed Renovate branches:

```bash
cd ~/projects/better-godot-mcp
for branch in $(git branch -r | grep 'origin/renovate/' | grep -v 'non-major' | grep -v 'lock-file-maintenance' | sed 's|origin/||'); do
  git push origin --delete "$branch"
done
```

- [ ] **Step 3: Verify branches cleaned**

```bash
cd ~/projects/better-godot-mcp && git fetch --prune && git branch -r
```

Expected: only `origin/main`, `origin/HEAD`, and possibly active Renovate branches.

---

### Task 4: Relay infrastructure cleanup (external repos)

**Context:** Per session 30/03 audit (P1 item 4), relay artifacts for godot-mcp exist in external systems. These are NOT in the better-godot-mcp repo itself.

- [ ] **Step 1: Remove Caddy route for godot relay**

SSH into vm-prod and remove the godot relay route from Caddy config. The route is `better-godot-mcp.n24q02m.com` or similar.

```bash
tailscale ssh ubuntu@prod-vnic
# Edit Caddyfile to remove godot relay route
# Then: make up-caddy
```

- [ ] **Step 2: Remove Doppler variable**

Remove `BETTER_GODOT_MCP_DOMAIN` from Doppler vm-prod project.

- [ ] **Step 3: Remove relay pages in mcp-relay-core**

In the mcp-relay-core repo, remove the `pages/godot/` directory and update any route config.

- [ ] **Step 4: Clean up Infisical project (if empty)**

Verify the Infisical project `430ac905-a60f-4597-b5cd-1727daa95389` is empty and delete it.

---

### Task 5: Improve headless.ts test coverage

**Context:** `src/godot/headless.ts` has 77.27% line coverage. Lines 55-77 (`execGodotAsync` function) are entirely uncovered. The function uses `promisify(execFile)` for async Godot execution. Need to test both success and error paths.

**Files:**
- Modify: `tests/godot/headless-full.test.ts` (add `execGodotAsync` tests to existing file)

- [ ] **Step 1: Write failing tests for execGodotAsync**

Add these tests to `tests/godot/headless-full.test.ts` inside the existing `describe('headless', ...)` block:

```typescript
// Add to imports at top of file:
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

// Add new describe block after the existing launchGodotEditor describe:

  // ==========================================
  // execGodotAsync
  // ==========================================
  describe('execGodotAsync', () => {
    it('should resolve with success for successful execution', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, _opts: unknown, cb: Function) => {
          cb(null, 'async output', 'async stderr')
        }) as typeof child_process.execFile,
      )

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('async output')
      expect(result.stderr).toBe('async stderr')
      expect(result.exitCode).toBe(0)
    })

    it('should use default timeout when not specified', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, opts: unknown, cb: Function) => {
          expect((opts as { timeout: number }).timeout).toBe(30_000)
          cb(null, 'output', '')
        }) as typeof child_process.execFile,
      )

      await execGodotAsync('/usr/bin/godot', ['--version'])
    })

    it('should use custom timeout when specified', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, opts: unknown, cb: Function) => {
          expect((opts as { timeout: number }).timeout).toBe(5000)
          cb(null, 'output', '')
        }) as typeof child_process.execFile,
      )

      await execGodotAsync('/usr/bin/godot', ['--version'], { timeout: 5000 })
    })

    it('should pass cwd option', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, opts: unknown, cb: Function) => {
          expect((opts as { cwd: string }).cwd).toBe('/tmp/project')
          cb(null, 'output', '')
        }) as typeof child_process.execFile,
      )

      await execGodotAsync('/usr/bin/godot', ['--version'], { cwd: '/tmp/project' })
    })

    it('should handle execution errors with stdout/stderr', async () => {
      const error = Object.assign(new Error('Command failed'), {
        stdout: 'partial output',
        stderr: 'error details',
        code: 2,
      })
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, _opts: unknown, cb: Function) => {
          cb(error)
        }) as typeof child_process.execFile,
      )

      const result = await execGodotAsync('/usr/bin/godot', ['--invalid'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('partial output')
      expect(result.stderr).toBe('error details')
      expect(result.exitCode).toBe(2)
    })

    it('should handle errors without stdout/stderr/code', async () => {
      const error = new Error('Timeout')
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, _opts: unknown, cb: Function) => {
          cb(error)
        }) as typeof child_process.execFile,
      )

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('Timeout')
      expect(result.exitCode).toBe(1)
    })

    it('should handle null stdout/stderr in success response', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        ((_cmd: string, _args: unknown, _opts: unknown, cb: Function) => {
          cb(null, null, null)
        }) as typeof child_process.execFile,
      )

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })
  })
```

- [ ] **Step 2: Run the tests to verify they fail (execGodotAsync not imported)**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run tests/godot/headless-full.test.ts -v
```

Expected: New tests should fail because `execGodotAsync` is not yet imported in the test file.

- [ ] **Step 3: Update imports to include execGodotAsync**

The import line in `tests/godot/headless-full.test.ts` at line 7 already imports `execGodotSync` but not `execGodotAsync`. Update it:

```typescript
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'
```

Also ensure `execFile` is in the mock at line 9-13:

```typescript
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
  spawn: vi.fn(),
  execFile: vi.fn(),
}))
```

This is already present, so no change needed for the mock.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run tests/godot/headless-full.test.ts -v
```

Expected: All tests PASS including new `execGodotAsync` tests.

- [ ] **Step 5: Run full test suite with coverage**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run --coverage
```

Expected: `headless.ts` coverage should be >95% for all metrics. Overall coverage should remain >95%.

- [ ] **Step 6: Commit**

```bash
cd ~/projects/better-godot-mcp && git add tests/godot/headless-full.test.ts
git commit -m "test: add execGodotAsync coverage tests for headless.ts"
```

---

### Task 6: Verify lint, type check, and build

**Context:** After all changes, verify the full CI pipeline passes locally.

- [ ] **Step 1: Run Biome lint + TypeScript type check**

```bash
cd ~/projects/better-godot-mcp && bun run check
```

Expected: No errors. If Biome 2.4.10 introduces new lint rules, fix any violations.

- [ ] **Step 2: Run full test suite with coverage**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run --coverage
```

Expected: All metrics >95%. Specifically verify:
- Stmts >95%
- Branch >90% (was 90.39%, may not reach 95% but should improve)
- Funcs >95%
- Lines >95%

- [ ] **Step 3: Build the project**

```bash
cd ~/projects/better-godot-mcp && bun run build
```

Expected: Build succeeds, `build/` and `bin/` directories populated.

- [ ] **Step 4: Fix any issues found**

If Biome reports new lint issues from 2.4.10 upgrade, run:

```bash
cd ~/projects/better-godot-mcp && bun run check:fix
```

Then re-run `bun run check` to verify. Commit fixes if any.

---

### Task 7: E2E test with real Godot 4.6.1

**Context:** The repo has two existing E2E test files excluded from normal `vitest run`:
- `tests/live/mcp-protocol.live.test.ts` — Protocol-level tests (no Godot project needed)
- `tests/live/full-godot.full.test.ts` — Full tool tests against temp Godot projects

And a standalone script:
- `test-live-mcp.mjs` — Standalone Node.js script testing all 17 tools

Godot 4.6.1 is installed at `godot` (via WinGet).

- [ ] **Step 1: Build the project first (E2E tests use bin/cli.mjs)**

```bash
cd ~/projects/better-godot-mcp && bun run build
```

- [ ] **Step 2: Run the standalone live test script**

```bash
cd ~/projects/better-godot-mcp && node test-live-mcp.mjs
```

Expected: All tests PASS. Output shows `RESULT: X/X PASS (100.0%)`.

- [ ] **Step 3: Run MCP protocol live tests**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run tests/live/mcp-protocol.live.test.ts
```

Expected: All tests PASS. Tests cover:
- Server initialization
- tools/list returns 17 tools with annotations
- help tool works for all tools
- config.status, config.set, config.detect_godot, config.check
- editor.status
- Error handling (nonexistent paths, invalid actions, typo suggestions)
- Rapid sequential calls stability

- [ ] **Step 4: Run full Godot E2E tests**

```bash
cd ~/projects/better-godot-mcp && bun x vitest run tests/live/full-godot.full.test.ts
```

Expected: All tests PASS. Tests cover all 17 tools with real temp Godot projects:
- **P0**: project (info, version, settings_get, settings_set), scenes (create, list, info, duplicate, set_main, delete), nodes (add, list, rename, set_property, get_property, remove), scripts (create, list, read, write, attach, delete), editor (status), config (status, set, detect_godot, check)
- **P1**: resources (list, info, import_config, delete), input_map (list, add_action, add_event, remove_action), signals (list, connect, disconnect)
- **P2**: animation (create_player, add_animation, add_track, add_keyframe, list), shader (create, read, write, get_params, list), tilemap (create_tileset, list), physics (layers, set_layer_name, collision_setup, body_config)
- **P3**: audio (list_buses, add_bus, add_effect), navigation (create_region), ui (create_control, list_controls)

- [ ] **Step 5: Document E2E results**

Record the output of each test run. If any test fails, diagnose and fix before proceeding to release.

---

### Task 8: Push changes and verify CI

**Context:** All local work is done. Push to main and verify CI passes on GitHub.

- [ ] **Step 1: Push all commits to main**

```bash
cd ~/projects/better-godot-mcp && git push origin main
```

- [ ] **Step 2: Verify CI passes**

```bash
cd ~/projects/better-godot-mcp && gh run list --limit 3
```

Wait for CI to complete. Expected: SUCCESS for both CI and CodeQL workflows.

- [ ] **Step 3: If CI fails, diagnose and fix**

```bash
cd ~/projects/better-godot-mcp && gh run view <run-id> --log-failed
```

---

### Task 9: Release via PSR

**Context:** PSR (Python Semantic Release) v10 is configured via `semantic-release.toml`. The CD workflow is triggered via `workflow_dispatch` with `release_type: stable`. PSR analyzes conventional commits since last release to determine version bump. CD pipeline: PSR -> npm publish (OIDC provenance) -> Docker multi-arch (amd64+arm64) -> GHCR -> MCP Registry.

- [ ] **Step 1: Check what version PSR will produce**

Review commits since v1.9.1-beta.1 to predict version:
- `refactor: merge setup tool into config tool` -> minor? (could be breaking if setup was public API)
- `perf: optimize regex...` from PR #342 -> patch
- `fix(deps): update...` from PR #341 -> patch
- `test: add execGodotAsync coverage` -> no bump
- `docs: add stable release design spec` -> no bump

Since there's a `refactor:` commit, PSR should produce a minor bump -> **v1.10.0**.

```bash
cd ~/projects/better-godot-mcp && git log v1.9.1-beta.1..HEAD --oneline
```

- [ ] **Step 2: Trigger stable release**

```bash
cd ~/projects/better-godot-mcp && gh workflow run cd.yml -f release_type=stable
```

- [ ] **Step 3: Monitor release progress**

```bash
cd ~/projects/better-godot-mcp && gh run list --workflow=cd.yml --limit 3
# Wait for completion, then:
cd ~/projects/better-godot-mcp && gh run view <run-id>
```

Expected: All jobs succeed:
- Semantic Release: creates tag, GitHub release
- Publish to npm: publishes with OIDC provenance, `latest` tag
- Build Docker: multi-arch (amd64 + arm64)
- Merge Docker Manifests: pushes to DockerHub + GHCR
- Publish to MCP Registry: updates server.json version

- [ ] **Step 4: Verify published artifacts**

```bash
# npm
npm view @n24q02m/better-godot-mcp version

# Docker
docker manifest inspect n24q02m/better-godot-mcp:latest

# GitHub Release
cd ~/projects/better-godot-mcp && gh release view --json tagName,name,isDraft,isPrerelease
```

- [ ] **Step 5: Verify MCP Registry**

Check that the MCP Registry entry has the new version.

---

## Post-Release Verification Checklist

- [ ] All GitHub issues closed (0 open non-Renovate issues)
- [ ] All PRs merged or reviewed (0 open non-Renovate PRs)
- [ ] Zero open security alerts (CodeQL, Dependabot, Secret Scanning)
- [ ] Test coverage >95% across all metrics
- [ ] E2E tests pass for all 17 tools with real Godot 4.6.1
- [ ] CI/CD pipeline green on main
- [ ] npm package published with `latest` tag
- [ ] Docker image available on DockerHub + GHCR (amd64 + arm64)
- [ ] MCP Registry entry updated
- [ ] Stale branches cleaned up
