# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`onlyoffice` — an ownCloud server app (PHP + jQuery/vanilla JS, no build step) that connects ownCloud to ONLYOFFICE Docs (Document Server). The app never renders documents itself: it hands Document Server a signed config, and Document Server calls back into the app to download and save files.

App id `onlyoffice`, PHP namespace `OCA\Onlyoffice`, declared in [appinfo/info.xml](appinfo/info.xml). The supported ownCloud versions are the `<dependencies>` range there. Deployed by placing the checkout at `<owncloud>/apps/onlyoffice`.

## Commands

```bash
# Submodules are mandatory — assets/document-templates and assets/document-formats
git submodule update --init --recursive

# PHP syntax lint
find . -name \*.php -print0 | xargs -0 -n1 php -l

# PHP code style (ownCloud standard in ruleset.xml); CI's exact flags are in .github/workflows/lint-phpcs.yml
phpcs --standard=./ruleset.xml ./

# JS + CSS lint (devDependencies live in the root package.json); CI's commands are in .github/workflows/lint-eslint.yml
npm ci
npx eslint ./js/*.js
npx stylelint ./css/*.css

# Verify the Document Server connection (run from the ownCloud server root)
occ onlyoffice:documentserver --check
```

## Release mechanics

`CHANGELOG.md` is the version source of truth — CI takes the first version number from it to create the `v*` tag and the GitHub release, and the release body is the first changelog section. `appinfo/info.xml` carries the same version and must be bumped in step. Unreleased changes go at the top under `## Added` / `## Changed` / `## Security` with no version line; the `## X.Y.Z` line is added only by the release commit. Never write a dotted number (an ownCloud or Docs version) in that unreleased section — CI would take it as the app version. The `Artifact` workflow (`.github/workflows/artifact.yml`) packages the tarball and strips the dev-only files listed there — so nothing at runtime may depend on them.

Branches: `develop` is the integration branch, `master` is release. Working branches follow `feature|fix|chore|refactor/<slug>` with conventional-commit subjects.

## Architecture

### Editing flow

1. `EditorController::index` returns a `TemplateResponse` for [templates/editor.php](templates/editor.php), which only emits a `#iframeEditor` div with `data-*` attributes. No config is inlined. It also attaches a `ContentSecurityPolicy` allowing the configured Document Server as a script and frame domain — a new external origin in the editor page needs adding here or it is silently blocked. `inframe=true` switches the response to the `plain` renderer for embedding.
2. [js/editor.js](js/editor.js) reads those attributes and fetches the real config from the OCS endpoint `EditorApiController::config`, then constructs `DocsAPI.DocEditor`.
3. The config's `url` and `callbackUrl` point back at `CallbackController::download` / `::track`, each carrying a `doc` parameter — a JWT minted by `Crypt::getHash` whose payload *is* the authorization: an `action` (`download`/`track`/`empty`) plus the `fileId`, `userId`, `shareToken`, `version` and flags the request may use. This is how an unauthenticated Document Server request proves what it is allowed to touch, so never widen a payload without checking every consumer.
4. Document Server POSTs status changes to `::track`. The four saving statuses are `MUSTSAVE`, `FORCESAVE` and their `CORRUPTED*` counterparts; the app downloads the new content (converting first if the returned filetype differs from the current extension) and `putContent`s it.

### Two distinct JWT secrets

Don't conflate them:
- `AppConfig::getDocumentServerSecret()` — the shared secret with Document Server. Verifies the inbound `token` body field and the JWT header (its name comes from `jwtHeader()`) on callbacks, and signs outbound conversion/command requests as `Bearer <jwt>`.
- `AppConfig::getSKey()` — the secret for the app's *own* `doc` hashes. It **returns the Document Server secret** when one is set, and falls back to ownCloud's top-level `secret` from `config.php` otherwise. So changing the Document Server secret invalidates in-flight `doc` links.

### Document keys

Document Server caches a document by `key`. [lib/keymanager.php](lib/keymanager.php) owns the `*PREFIX*onlyoffice_filekey` table (raw SQL, static methods) and [lib/fileutility.php](lib/fileutility.php) `getKey()` mints `<instanceid>_<GUID>` on first use. The invalidation contract:
- [lib/hooks.php](lib/hooks.php) drops the key on `OC_Filesystem::write`, delete, and version rollback — this is what forces Document Server to re-download after an out-of-band change.
- `lock = 1` makes `KeyManager::delete()` skip the row; passing `$unlock = true` deletes anyway. `CallbackController::track` sets the lock around its own `putContent` so the `write` hook above doesn't drop the key mid-session, then clears it and records `fs` (whether that save was a forcesave). A new file version is written only when neither the current nor the previous save was a forcesave — that's what `wasForcesave()` is for.

### Federated co-editing

For a file on a federated share, the key must come from the *owner's* instance. [lib/remoteinstance.php](lib/remoteinstance.php) health-checks remote instances (cached in `*PREFIX*onlyoffice_instance` for `RemoteInstance::$ttl`) and calls their OCS `federation#key` / `federation#keylock` endpoints, which [controller/federationcontroller.php](controller/federationcontroller.php) serves for incoming requests. `FileUtility::getKey($file, true)` is the entry point.

### Version history

ownCloud's version storage has no room for editor metadata, so [lib/fileversions.php](lib/fileversions.php) keeps changes archives (`.zip`), history (`.json`) and author (`_author.json`) blobs alongside the files themselves, at `/<ownerId>/onlyoffice/<fileId>/` via a raw `\OC\Files\View`. Deletions must therefore be mirrored by hand — that's what the user/file/version hooks in `Hooks` are for. [lib/versionmanager.php](lib/versionmanager.php) wraps the optional `files_versions` app (check `$available` before use). History is exposed through `EditorController::history/version/restore`.

### JS layering

The editor runs in an iframe; the file-list page is the parent. Everything hangs off the `OCA.Onlyoffice` global.
- [js/main.js](js/main.js) — file-list integration: context menu, "new" menu, convert, download-as, iframe lifecycle.
- [js/editor.js](js/editor.js) — inside the iframe: builds the DocEditor config and wires `onRequest*` handlers, forwarding to the parent via `window.parent.postMessage`.
- [js/listener.js](js/listener.js) — loaded in the file list **only when the "same tab" setting is on** (and always on public share pages, via [lib/hookhandler.php](lib/hookhandler.php)); receives those postMessages and drives ownCloud dialogs (file picker, share dialog, versions). Same-tab and new-tab modes therefore take different code paths — test both.
- [js/share.js](js/share.js) — extends the share dialog with the app's share attributes in the `onlyoffice` scope, alongside core `permissions.download`. Reshares re-validate against the parent share's attributes to prevent privilege escalation.
- [js/desktop.js](js/desktop.js) — detects the ONLYOFFICE Desktop client user agent.
- [js/web/onlyoffice.js](js/web/onlyoffice.js) — prebuilt bundle for the separate ownCloud Web UI, served verbatim by `WebAssetController` at `/js/onlyoffice.js`. Do not hand-edit; it comes from the ownCloud Web connector project.

### Configuration

[lib/appconfig.php](lib/appconfig.php) is the single gateway to every setting and is large by design: admin-editable app values, read-only system values, the demo-server parameters, group restrictions (`isUserAllowedToUse`), and the format table built from the `document-formats` submodule. Add new settings here rather than reading config directly elsewhere.

Mind the two-argument trap in `AppConfig::getSystemValue($key, $system = false)`: the default reads `$key` **inside** the `onlyoffice` array in `config.php` (the keys are the `getSystemValue()` callers in `AppConfig`), while `$system = true` reads a top-level ownCloud value (`instanceid`, `secret`). Most settings resolve app value → system value → hardcoded default.

`settingsAreSuccessful()` gates the whole app: [lib/cron/editorscheck.php](lib/cron/editorscheck.php) periodically re-checks the connection and, on failure, records a settings error that disables the app's UI and notifies admins ([lib/notifier.php](lib/notifier.php)). [controller/joblistcontroller.php](controller/joblistcontroller.php) registers/unregisters that job from `Application::__construct` based on the current setting.

### Wiring

[appinfo/application.php](appinfo/application.php) does all of it manually — no DI autowiring. Controllers are constructed by hand in `registerService`, mime types are registered, the preview provider and notifier are hooked, JWT `3rdparty` files are `include_once`'d, and `Hooks::connectHooks()` runs. A new controller needs: a `registerService` entry here, a route in [appinfo/routes.php](appinfo/routes.php), and a file under `controller/`.

## Conventions

- **File naming drives autoloading** — there is no composer autoloader, only ownCloud's, which resolves a class's namespace path relative to the app root and to `lib/`, case-insensitively. Two conventions coexist: all-lowercase filenames (`OCA\Onlyoffice\AppConfig` → `lib/appconfig.php`, `OCA\Onlyoffice\Controller\CallbackController` → `controller/callbackcontroller.php` — note controllers sit outside `lib/`), and case-preserving paths (`OCA\Onlyoffice\Panels\Admin\Section` → `lib/Panels/Admin/Section.php`). Follow whichever pattern the sibling files already use; getting it wrong fails only at runtime.
- **Tabs for indentation** in PHP (4-wide), enforced by `ruleset.xml`. Double-quoted strings are the norm in both PHP and JS (a few newer PHP files use single quotes).
- **Every PHP, JS and CSS file carries the full AGPL-3.0 header block** with the current copyright year. Copy it from a neighbouring file of the same type when adding a file.
- Every class, property and method gets a docblock with `@param`/`@return`. Signatures type-hint class and interface parameters only; scalar and return types live in the docblock. Inline `//` narration is rare and should stay that way — match the density of the file you are editing.
- Log with the app context: `$this->logger->error("…", ["app" => $this->appName])`. Log caught exceptions with `$this->logger->logException($e, ["message" => "…", "app" => $this->appName])`.
- `KeyManager` and `RemoteInstance` use hand-written SQL against `\OC::$server->getDatabaseConnection()`, not QueryBuilder; schema changes go in [appinfo/database.xml](appinfo/database.xml).
- `l10n/` holds paired `<locale>.js` (`OC.L10N.register`) and `<locale>.json` files that must stay in sync. New user-facing strings go through `$this->trans->t(...)` in PHP classes, `$l->t(...)` in templates and `t(OCA.Onlyoffice.AppName, ...)` in JS. Add each new string, translated, to every locale pair in the same change (the source string is the key); the localisation team reviews and corrects them later.
- `3rdparty/jwt` is a vendored copy of firebase/php-jwt, loaded by explicit `include_once`; don't reorganise it.
- JS follows `.eslintrc.json`. The file-list code is jQuery- and `OC`/`OCA`-based because ownCloud's classic UI is; keep new code in the style of the file it goes into. JS and CSS are indented with 2 spaces. Each `js/*.js` file is an IIFE that merges its members into `OCA.Onlyoffice` with `_.extend()`; requests use jQuery with `OC.generateUrl()` or `OC.linkToOCS()`.
- PHP file headers start with `@author Ascensio System SIA <integration@onlyoffice.com>` — phpcs (PEAR file comment rules) fails without it.
- Commit subjects follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`); user-visible changes also get a line in the top section of `CHANGELOG.md`.

## Rules

- Don't edit `assets/document-templates` or `assets/document-formats` (git submodules owned by other ONLYOFFICE repos — move the pointer instead) or `js/web/onlyoffice.js` (build output of the ownCloud Web connector).
- Server-side requests to Document Server go through `DocumentService`: its convert/command/healthcheck methods build the internal address and sign with the Docs JWT, and `request()` applies `verify_peer_off` and the timeout. A URL received from Document Server (saved file, changes, conversion result) is passed through `AppConfig::replaceDocumentServerUrlToInternal()` before being fetched. URLs handed to Document Server get the same `StorageUrl` rewrite (`AppConfig::getStorageUrl()`) the existing callers apply.
- The `/download`, `/empty` and `/track` routes are reached by Document Server without a session (`@PublicPage`, `@NoCSRFRequired`). Keep both checks on them: the `doc` hash and, when a Docs secret is set, the Docs JWT. Never put anything in a `doc` payload that grants more than the request needs.
- A new admin setting needs: a key plus getter/setter in `AppConfig`, the field in [templates/settings.php](templates/settings.php) and [js/settings.js](js/settings.js), handling in the matching `SettingsController::save*` action, values passed to the template from [lib/Panels/Admin/Settings.php](lib/Panels/Admin/Settings.php), and a `README.md` entry if it can also be set in `config.php`.
- Nothing that runs in production may depend on the files the `Artifact` workflow strips.

## Coding practices

- Prefer ownCloud's public `OCP\` API. Reach into `\OC\`/`\OC_` internals only where existing code already must (user and filesystem setup in callbacks, raw `View` for version metadata, `TimedJob`, the DB connection), and keep it to the same places.
- Code must run on every ownCloud version in the `info.xml` range: check that an ownCloud API exists in the oldest and still exists in the newest before using it. PHP syntax must stay valid for the lowest version in the `lint-php.yml` matrix.
- Before relying on a Document Server config option, event or command, check in the Docs API documentation which Docs version introduced it and whether older ones ignore it safely. The minimum accepted Docs version is enforced in `DocumentService::checkDocServiceUrl()` and `js/editor.js`.
- Platform services, `AppConfig` and `Crypt` come in through constructors (controllers are wired in `appinfo/application.php`); helpers like `DocumentService` and `FileUtility` are built with `new` from them. Don't add new static helpers or `\OC::$server` lookups in classes that already receive services.
- Every change to the editor config or callbacks has to work for: logged-in users, public links, federated shares, and both same-tab and new-tab modes.
- Error messages shown to users must not leak internal addresses or connection details; log the details with `$this->logger` instead.
