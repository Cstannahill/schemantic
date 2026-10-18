# Releasing schemantic

Everyday releases start with `npm run release:prepare -- <patch|minor|major|exact-version>` and finish by publishing a matching GitHub Release. Preparation is local; publication happens only after the release verification workflow succeeds.

## One-time setup

Merge these workflows and scripts into the default branch before using the release workflow. In GitHub, create an environment named `npm`. If desired, add a required reviewer as the final publication approval. Environment deployment rules must allow the version tags used by this workflow.

In the existing `schemantic` package's npm settings, add a GitHub Actions trusted publisher:

| Setting | Value |
| --- | --- |
| Organization or user | `Cstannahill` |
| Repository | `schemantic` |
| Workflow filename | `release.yml` |
| Environment | `npm` |
| Allowed action | Direct `npm publish` |

No `NPM_TOKEN` secret is used. The publisher runs on GitHub-hosted Ubuntu with Node 24, pinned npm 11.12.1, and `id-token: write`; npm requires at least Node 22.14 and npm 11.5.1. Configure trust when ready to release: unused new publisher configurations currently expire after two days. Keep the package repository URL accurate for provenance. See [npm's trusted publishing setup](https://docs.npmjs.com/trusted-publishers/) for account-side settings.

Configure branch protection to require the `Required checks` job from `CI / Verify` once GitHub has reported its exact check name. It aggregates lint/tests/coverage, all compatibility jobs, fixture compilation, packed-consumer verification, live integration, and the dependency audit. CodeQL reports separately. Protect `v*` tags against updates/deletion so release identity remains stable between validation and publication. These repository/account settings are not created by local source edits.

## Prepare and publish

1. Write useful notes under `## [Unreleased]` in `CHANGELOG.md`. Review and commit the implementation first. Preparation requires a clean Git working tree; its dry run also works while changes are pending.
2. Preview the next version:

   ```sh
   npm run release:prepare -- minor --dry-run
   ```

3. Prepare it:

   ```sh
   npm run release:prepare -- minor
   npm run release:check
   npm run release:notes
   ```

   This updates only the manifest version, both lockfile version fields, and the changelog. Unreleased notes move into a dated release section. Nothing is committed, tagged, pushed, or published. Exact versions are accepted, must be higher than the current version, and cannot include build metadata.

4. Review those three files, commit them, and merge them into the default branch through the normal PR checks. The version stays `0.3.0` until preparation is explicitly run. The current naming default changes warrant a minor release such as `0.4.0` while this package is pre-1.0; do not reuse the already published `0.3.0`.
5. In GitHub's **Releases → Draft a new release**, use the exact tag `v<package-version>` and select the reviewed commit on the default branch. Paste the output of `npm run release:notes` into the description, then publish the GitHub Release. A draft does not publish to npm. Approve the `npm` environment deployment if you configured a reviewer.

The workflow resolves and verifies the tagged commit, runs the full reusable verification workflow without dependency caches, downloads its tested archive, rechecks the tag/release/version, and publishes that archive with provenance. After npm reports matching archive integrity, it attaches the archive and `package-info.json` to the GitHub Release. Existing identical assets are preserved; conflicting assets cause an explicit failure.

## Prereleases

Use an exact version, for example:

```sh
npm run release:prepare -- 0.4.0-rc.1
```

Mark the GitHub Release **prerelease**. The workflow rejects mismatched flags. Prefixes `alpha`, `beta`, `rc`, and `next` select the corresponding npm dist-tag; other prerelease identifiers select `next`. Stable versions select `latest`. Prereleases leave `latest` intact. Preparing `0.4.0` later releases the stable version.

## Previewing and recovering a release

In **Actions → Release to npm → Run workflow**, supply an existing published GitHub Release tag. Select a workflow ref containing both release workflows; the tagged source must also contain the invoked release and verification scripts. `dry-run` defaults to true: all verification runs, followed by an npm publication preview, without publishing or attaching assets. This preview checks package validity and version availability; it cannot prove successful OIDC authentication. Publishing the GitHub Release normally starts the real release workflow immediately, so use the manual preview for diagnostics rather than as an approval step before that event.

For a failed run, fix account configuration or transient infrastructure issues and rerun it. Alternatively dispatch the same tag with `dry-run` unchecked. Publication is serialized and never cancels an in-progress publisher. A version already on npm is accepted only when its SHA512 integrity matches the tested archive; publication is then skipped and missing release assets can be attached. HTTP errors never count as an unpublished version. Stable releases cannot move `latest` backward.

If a version exists with different bytes, choose a new version and release; npm versions cannot be replaced. Do not move an existing release tag to fix source code. A verification failure prevents publication. An error after npm publication can leave a valid npm package with incomplete GitHub assets; inspect the job summary and retry the same commit. There is no automatic unpublish or rollback.

`npm run publish:npm` remains an explicit local fallback requiring your own npm authentication. It checks release metadata and runs the package lifecycle checks, but the GitHub workflow is the standard path for publishing the exact archive validated by the full release gate. The compatibility shell wrapper `scripts/release.sh` now only invokes local preparation and requires a version argument.

## Verification commands and evidence

```sh
npm ci
npm run lint
npm run build
npm run test:release
npm run test:coverage -- --runInBand
npm run verify:fixtures
npm run package:verify
python -m pip install fastapi uvicorn python-multipart
npm run verify:live
npm audit --audit-level=moderate
```

`npm test` builds first; `test:coverage` and the verification scripts expect a fresh build. For live tests, install the Python packages into your development virtual environment; `PYTHON` can select its executable. The live test starts and stops only its own loopback FastAPI process.

Fixture checks cover all six schema fixtures in plain, Zod, and hooks modes with both camelCase and preserved properties. Package verification packs once with lifecycle scripts disabled, validates required files and forbidden content, enforces 10 MiB compressed/25 MiB unpacked limits, installs the archive, and checks exports, the CLI, generated runtime conversion, and strict TypeScript consumers. It writes the publishable `.release/package/package-info.json` marker only after successful validation. Diagnostics are retained under `.artifacts/`; workflows upload reports on failure or where configured.

Compatibility jobs cover Node 20/22/24 on Linux, Windows, and macOS. External actions use immutable commit pins, checkout credentials are not persisted, and ordinary CI has read-only repository permissions. The always-running aggregate gate fails if any prerequisite fails, is cancelled, or is skipped. Weekly CodeQL and generation measurements run separately; measurements include repeated fixture durations and source sizes, with no unsupported performance regression claims. Retired duplicate workflows and the unconfigured documentation deployment are removed.

Local verification does not establish that the hosted matrix, npm trust configuration, or real publication has passed. Confirm those results in GitHub Actions and npm when the reviewed changes are released.
