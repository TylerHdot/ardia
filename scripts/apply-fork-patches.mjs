import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

function edit(relPath, transform) {
  const fullPath = resolve(root, relPath);
  const before = readFileSync(fullPath, "utf8");
  const after = transform(before);
  if (after !== before) {
    writeFileSync(fullPath, after, "utf8");
    console.log(`patched ${relPath}`);
  } else {
    console.log(`unchanged ${relPath}`);
  }
}

function replaceOnce(text, target, replacement, label, alreadyNeedle) {
  if (alreadyNeedle && text.includes(alreadyNeedle)) return text;
  if (!text.includes(target)) {
    throw new Error(`missing target for ${label}`);
  }
  return text.replace(target, replacement);
}

edit("packages/ardiacore/ios/ArdiaActivation.mm", (src) =>
  replaceOnce(
    src,
    `bool Allow(NSString *what) {
  if (!Background() && (NSApp.isActive || UserEvent())) return true;
  NSArray<NSString *> *stack = NSThread.callStackSymbols;
  if (Background() || FromChromium(stack)) {
    Log([@"blocked " stringByAppendingString:what], stack);
    return false;
  }
  return true;
}`,
    `bool Allow(NSString *what) {
  NSRunningApplication *me = NSRunningApplication.currentApplication;
  bool frontmost = me.isActive || [NSWorkspace.sharedWorkspace.frontmostApplication isEqual:me];
  if (!Background() && (NSApp.isActive || frontmost || UserEvent())) return true;
  NSArray<NSString *> *stack = NSThread.callStackSymbols;
  if (Background() || FromChromium(stack)) {
    Log([@"blocked " stringByAppendingString:what], stack);
    return false;
  }
  return true;
}`,
    "ArdiaActivation.mm Allow()",
    "bool frontmost = me.isActive",
  ),
);

edit("packages/ardiacore/ios/ArdiaHoverProbe.mm", (src) => {
  let out = replaceOnce(
    src,
    "if (check.reason == HoverReason::halfActive) return trigger == HoverTrigger::click && check.key != FocusWindowKind::popup;",
    "if (check.reason == HoverReason::halfActive) return check.key != FocusWindowKind::popup;",
    "ArdiaHoverProbe.mm halfActive",
    "if (check.reason == HoverReason::halfActive) return check.key != FocusWindowKind::popup;",
  );
  out = replaceOnce(
    out,
    "return check.reason == HoverReason::notKeyOrMain && check.activation.appActive && Unseen(check.key) && !OtherArdiaWindowActive(window);",
    "return check.reason == HoverReason::notKeyOrMain && check.overPage && check.key != FocusWindowKind::popup && !OtherArdiaWindowActive(window);",
    "ArdiaHoverProbe.mm notKeyOrMain",
    "return check.reason == HoverReason::notKeyOrMain && check.overPage && check.key != FocusWindowKind::popup && !OtherArdiaWindowActive(window);",
  );
  out = replaceOnce(
    out,
    "constexpr double kMoveCheckEvery = 2;",
    "constexpr double kMoveCheckEvery = 0.25;",
    "ArdiaHoverProbe.mm kMoveCheckEvery",
    "constexpr double kMoveCheckEvery = 0.25;",
  );
  out = replaceOnce(
    out,
    "if (trigger == HoverTrigger::move && (gPendingReason != check.reason || gPendingWindow != window)) {",
    "if (trigger == HoverTrigger::move && check.reason != HoverReason::halfActive && (gPendingReason != check.reason || gPendingWindow != window)) {",
    "ArdiaHoverProbe.mm pending check",
    "if (trigger == HoverTrigger::move && check.reason != HoverReason::halfActive && (gPendingReason != check.reason || gPendingWindow != window)) {",
  );
  return out;
});

edit("apps/browser/macos/Ardia-macOS/Info.plist", (src) => {
  let out = replaceOnce(
    src,
    "https://github.com/mantrakp04/ardia/issues/new?body=%s",
    "https://github.com/TylerHdot/ardia/issues/new?body=%s",
    "Info.plist ACFeedbackURL",
    "https://github.com/TylerHdot/ardia/issues/new?body=%s",
  );
  out = replaceOnce(
    out,
    "<string>https://ardia.dev/release-notes</string>",
    "<string>https://github.com/TylerHdot/ardia/releases</string>",
    "Info.plist ACReleaseNotesURL",
    "<string>https://github.com/TylerHdot/ardia/releases</string>",
  );
  out = replaceOnce(
    out,
    "<string>https://ardia.dev/appcast.xml</string>",
    "<string>https://github.com/TylerHdot/ardia/releases/latest/download/appcast.xml</string>",
    "Info.plist SUFeedURL",
    "<string>https://github.com/TylerHdot/ardia/releases/latest/download/appcast.xml</string>",
  );
  out = replaceOnce(
    out,
    "<string>gi1pBCemmSVpHM36dT5BJPPTcKC98QwS19mztCTyd4s=</string>",
    "<string>NcYJAACPoBOXH8PBGzngYAU2Lu765tekNGU2RAdG+ds=</string>",
    "Info.plist SUPublicEDKey",
    "<string>NcYJAACPoBOXH8PBGzngYAU2Lu765tekNGU2RAdG+ds=</string>",
  );
  return out;
});

edit("packages/shell/ios/AppUpdater.swift", (src) => {
  let out = replaceOnce(
    src,
    '"https://github.com/mantrakp04/ardia/releases/latest/download/appcast.xml"',
    '"https://github.com/TylerHdot/ardia/releases/latest/download/appcast.xml"',
    "AppUpdater.swift feedOverride",
    '"https://github.com/TylerHdot/ardia/releases/latest/download/appcast.xml"',
  );
  out = replaceOnce(
    out,
    'let repository = "https://github.com/mantrakp04/ardia"',
    'let repository = "https://github.com/TylerHdot/ardia"',
    "AppUpdater.swift repository",
    'let repository = "https://github.com/TylerHdot/ardia"',
  );
  return out;
});

edit("scripts/lib/releases.sh", (src) => {
  let out = replaceOnce(
    src,
    'REPO="mantrakp04/ardia"',
    'REPO="mantrakp04/ardia"\nREPO="${ARDIA_RELEASE_REPO:-TylerHdot/ardia}"',
    "releases.sh REPO",
    'REPO="${ARDIA_RELEASE_REPO:-TylerHdot/ardia}"',
  );
  out = replaceOnce(
    out,
    'RELEASE_NOTES_URL="https://ardia.dev/release-notes"',
    'RELEASE_NOTES_URL="https://github.com/$REPO/releases"',
    "releases.sh RELEASE_NOTES_URL",
    'RELEASE_NOTES_URL="https://github.com/$REPO/releases"',
  );
  out = replaceOnce(
    out,
    'tag="$(gh release view -R "$REPO" --json tagName -q .tagName)"',
    'tag="$(gh release view -R "$REPO" --json tagName -q .tagName 2>/dev/null)" || return 1',
    "releases.sh latest_stable_tag",
    'tag="$(gh release view -R "$REPO" --json tagName -q .tagName 2>/dev/null)" || return 1',
  );
  return out;
});

edit("scripts/release/lib.sh", (src) =>
  replaceOnce(
    src,
    `sign_as() {
  local identity="$1" attempt
  shift
  for attempt in 1 2 3 4 5; do
    codesign --force --timestamp --sign "$identity" "$@" && return 0
    echo "    signing failed (attempt $attempt), likely no timestamp from Apple; retrying" >&2
    sleep 5
  done
  die "couldn't sign \${*: -1}"
}`,
    `sign_as() {
  local identity="$1" attempt args=()
  shift
  if [ "$identity" = "-" ]; then
    while [ $# -gt 0 ]; do
      case "$1" in
        --options) shift 2 ;;
        --preserve-metadata=*) shift ;;
        *) args+=("$1"); shift ;;
      esac
    done
    codesign --force --sign - "\${args[@]}"
    return 0
  fi
  for attempt in 1 2 3 4 5; do
    codesign --force --timestamp --sign "$identity" "$@" && return 0
    echo "    signing failed (attempt $attempt), likely no timestamp from Apple; retrying" >&2
    sleep 5
  done
  die "couldn't sign \${*: -1}"
}`,
    "release/lib.sh sign_as()",
    'if [ "$identity" = "-" ]; then',
  ),
);

edit("scripts/release.sh", (src) => {
  let out = replaceOnce(
    src,
    '  [ -n "$provisioning_profile" ] || die "--phase sign exports the ad hoc archive --phase build made: set RELEASE_PROVISIONING_PROFILE"',
    '  [ "${ADHOC_SIGN:-0}" = 1 ] || [ -n "$provisioning_profile" ] || die "--phase sign exports the ad hoc archive --phase build made: set RELEASE_PROVISIONING_PROFILE"',
    "release.sh provisioning_profile",
    '[ "${ADHOC_SIGN:-0}" = 1 ] || [ -n "$provisioning_profile" ]',
  );
  out = replaceOnce(
    out,
    `  [ "$rc" = 1 ] || [ -n "$engine_release" ] \\
    || die "packages/ardiacore/prebuilt-engines.tsv lists no published engine for this engine key (\${engine_tree:0:12}): publish it with scripts/publish-engine.sh, commit the table line, then release"
  case "$engine_release" in engine-*) engine_tag="$engine_release" ;; *) engine_tag="v$engine_release" ;; esac
  [ -n "$engine_release" ] \\
    && engine_source="$REPO_URL/releases/download/$engine_tag/ArdiaCore-\${engine_tree:0:12}-source.tar.xz"

  identity_name="Developer ID Application"
  identity="$(security find-identity -v -p codesigning | awk -v n="$identity_name" 'index($0, n) { print $2; exit }')"
  [ -n "$identity" ] || die "no $identity_name identity"
  load_notary_auth
  notarize=0
  if xcrun notarytool history "\${notary_auth[@]}" >/dev/null 2>&1; then
    notarize=1
  elif [ "\${ALLOW_UNNOTARIZED:-0}" = 1 ]; then
    echo "warning: no notarytool credentials; the build won't be notarized" >&2
  else
    echo "error: notarytool credentials are missing or invalid (scripts/.notary.env or the '\${NOTARY_PROFILE:-ardia}' profile):" >&2
    xcrun notarytool history "\${notary_auth[@]}" 2>&1 | head -2 >&2
    exit 1
  fi`,
    `  [ "$rc" = 1 ] || [ "\${ADHOC_SIGN:-0}" = 1 ] || [ -n "$engine_release" ] \\
    || die "packages/ardiacore/prebuilt-engines.tsv lists no published engine for this engine key (\${engine_tree:0:12}): publish it with scripts/publish-engine.sh, commit the table line, then release"
  case "$engine_release" in engine-*) engine_tag="$engine_release" ;; *) engine_tag="v$engine_release" ;; esac
  [ -n "$engine_release" ] \\
    && engine_source="https://github.com/mantrakp04/ardia/releases/download/$engine_tag/ArdiaCore-\${engine_tree:0:12}-source.tar.xz"

  if [ "\${ADHOC_SIGN:-0}" = 1 ]; then
    identity="-"
    notarize=0
  else
    identity_name="Developer ID Application"
    identity="$(security find-identity -v -p codesigning | awk -v n="$identity_name" 'index($0, n) { print $2; exit }')"
    [ -n "$identity" ] || die "no $identity_name identity"
    load_notary_auth
    notarize=0
    if xcrun notarytool history "\${notary_auth[@]}" >/dev/null 2>&1; then
      notarize=1
    elif [ "\${ALLOW_UNNOTARIZED:-0}" = 1 ]; then
      echo "warning: no notarytool credentials; the build won't be notarized" >&2
    else
      echo "error: notarytool credentials are missing or invalid (scripts/.notary.env or the '\${NOTARY_PROFILE:-ardia}' profile):" >&2
      xcrun notarytool history "\${notary_auth[@]}" 2>&1 | head -2 >&2
      exit 1
    fi
  fi`,
    "release.sh signing block",
    'if [ "${ADHOC_SIGN:-0}" = 1 ]; then',
  );
  return out;
});

edit("scripts/release/export-sign.sh", (src) => {
  let out = replaceOnce(
    src,
    'if [ -n "$provisioning_profile" ]; then',
    `if [ "$identity" = "-" ]; then
  echo "==> Export (ad hoc)"
  rm -rf "$app"
  mkdir -p "$(dirname "$app")"
  ditto "$archive/Products/Applications/Ardia.app" "$app"
elif [ -n "$provisioning_profile" ]; then`,
    "export-sign.sh adhoc export",
    'if [ "$identity" = "-" ]; then\n  echo "==> Export (ad hoc)"',
  );
  out = replaceOnce(
    out,
    `[ -d "$app/Contents/Frameworks/hermes.framework" ] \\
  && sign_as "$identity" --preserve-metadata=identifier,entitlements,flags,runtime "$app/Contents/Frameworks/hermes.framework"
sign_as "$identity" --preserve-metadata=entitlements,requirements,flags,runtime "$app"`,
    `if [ "$identity" = "-" ]; then
  while IFS= read -r -d '' code; do
    sign_as "-" "$code"
  done < <(find "$app/Contents" -depth -not -path "*/Chromium Framework.framework/*" -not -name "Chromium Framework.framework" \\
    \\( -type d \\( -name "*.xpc" -o -name "*.app" -o -name "*.appex" -o -name "*.framework" -o -name "*.plugin" \\) \\
    -o -type f \\( -name "*.dylib" -o -path "*.framework/Versions/*/Autoupdate" \\) \\) -print0)
  sign_as "-" "$app"
else
  [ -d "$app/Contents/Frameworks/hermes.framework" ] \\
    && sign_as "$identity" --preserve-metadata=identifier,entitlements,flags,runtime "$app/Contents/Frameworks/hermes.framework"
  sign_as "$identity" --preserve-metadata=entitlements,requirements,flags,runtime "$app"
fi`,
    "export-sign.sh adhoc final signing",
    'sign_as "-" "$app"',
  );
  return out;
});

edit("scripts/release/verify.sh", (src) => {
  let out = replaceOnce(
    src,
    '[ -f "$app/Contents/embedded.provisionprofile" ] || die "no Developer ID provisioning profile (keychain groups need it)"',
    'if [ "${ADHOC_SIGN:-0}" != 1 ]; then\n  [ -f "$app/Contents/embedded.provisionprofile" ] || die "no Developer ID provisioning profile (keychain groups need it)"\nfi',
    "verify.sh embedded.provisionprofile",
    'if [ "${ADHOC_SIGN:-0}" != 1 ]; then\n  [ -f "$app/Contents/embedded.provisionprofile" ]',
  );
  out = replaceOnce(
    out,
    `designated="$(codesign -d -r- "$app" 2>&1 | sed -n 's/^designated => //p')"
[[ "$designated" == *'identifier "com.ardia.browser"'* && "$designated" == *"subject.OU] = U5L5T3NGVV"* ]] \\
  || die "designated requirement: $designated"
app_ents="$(entitlements "$app")"
for group in webauthn unexportable-keys secure-payment-confirmation; do
  [[ "$app_ents" == *"U5L5T3NGVV.com.ardia.browser.$group"* ]] || die "the app lacks the keychain group …$group"
done
if grants_browser_passkeys "$app/Contents/embedded.provisionprofile"; then
  [[ "$app_ents" == *web-browser.public-key-credential* ]] || die "the profile grants browser passkeys but the app isn't signed with them"
else
  [[ "$app_ents" != *web-browser.public-key-credential* ]] || die "the app is signed with com.apple.developer.web-browser.public-key-credential, which its profile doesn't grant"
fi`,
    `if [ "\${ADHOC_SIGN:-0}" != 1 ]; then
  designated="$(codesign -d -r- "$app" 2>&1 | sed -n 's/^designated => //p')"
  [[ "$designated" == *'identifier "com.ardia.browser"'* && "$designated" == *"subject.OU] = U5L5T3NGVV"* ]] \\
    || die "designated requirement: $designated"
  app_ents="$(entitlements "$app")"
  for group in webauthn unexportable-keys secure-payment-confirmation; do
    [[ "$app_ents" == *"U5L5T3NGVV.com.ardia.browser.$group"* ]] || die "the app lacks the keychain group …$group"
  done
  if grants_browser_passkeys "$app/Contents/embedded.provisionprofile"; then
    [[ "$app_ents" == *web-browser.public-key-credential* ]] || die "the profile grants browser passkeys but the app isn't signed with them"
  else
    [[ "$app_ents" != *web-browser.public-key-credential* ]] || die "the app is signed with com.apple.developer.web-browser.public-key-credential, which its profile doesn't grant"
  fi
fi`,
    "verify.sh designated/entitlements",
    'if [ "${ADHOC_SIGN:-0}" != 1 ]; then\n  designated=',
  );
  out = replaceOnce(
    out,
    `while IFS= read -r -d '' code; do
  details="$(codesign -dvv "$code" 2>&1)"
  [[ "$details" == *"TeamIdentifier=U5L5T3NGVV"* && "$details" == *"Authority=Developer ID Application"* \\
    && "$details" == *"Timestamp="* ]] || die "$code isn't Developer ID-signed with a timestamp"
  [[ "$(entitlements "$code")" != *get-task-allow* ]] || die "$code has get-task-allow"
done < <(find "$app" \\( -name "*.app" -o -name "*.framework" -o -name "*.dylib" -o -name "*.xpc" -o -name "*.plugin" \\
  -o -path "*/Helpers/*" -type f -perm -u+x -o -path "*/MacOS/*" -type f \\) -print0)`,
    `if [ "\${ADHOC_SIGN:-0}" != 1 ]; then
  while IFS= read -r -d '' code; do
    details="$(codesign -dvv "$code" 2>&1)"
    [[ "$details" == *"TeamIdentifier=U5L5T3NGVV"* && "$details" == *"Authority=Developer ID Application"* \\
      && "$details" == *"Timestamp="* ]] || die "$code isn't Developer ID-signed with a timestamp"
    [[ "$(entitlements "$code")" != *get-task-allow* ]] || die "$code has get-task-allow"
  done < <(find "$app" \\( -name "*.app" -o -name "*.framework" -o -name "*.dylib" -o -name "*.xpc" -o -name "*.plugin" \\
    -o -path "*/Helpers/*" -type f -perm -u+x -o -path "*/MacOS/*" -type f \\) -print0)
fi`,
    "verify.sh TeamIdentifier loop",
    'if [ "${ADHOC_SIGN:-0}" != 1 ]; then\n  while IFS= read -r',
  );
  return out;
});

edit(".claude/skills/release/scripts/publish.sh", (src) => {
  let out = replaceOnce(
    src,
    `stable_tag="$(latest_stable_tag)"

built="$dist/appcast.built.xml"
[ -f "$built" ] || cp "$feed" "$built"
merged="$feed"
[ "$dry" = 1 ] && merged="$work/appcast.xml"
if download_live_feed "$stable_tag" "$work/live"; then
  appcast merge "$work/live/appcast.xml" "$built" "$version" "$merged"
else
  echo "note: $stable_tag has no appcast.xml yet: $version starts it"
  cp "$built" "$merged"
fi
appcast check-above "$merged" "$version"
if [ "$channel" = stable ]; then
  latest_version="\${stable_tag#v}"
  [ "$version" != "$latest_version" ] && [ "$(printf '%s\\n%s\\n' "$latest_version" "$version" | sort -V | tail -1)" = "$version" ] \\
    || die "$version isn't above the latest stable release ($latest_version): publishing it as latest would move every download and feed backward"
  echo "PASS  $version is above the latest stable release ($latest_version)"
fi`,
    `stable_tag="$(latest_stable_tag || true)"

built="$dist/appcast.built.xml"
[ -f "$built" ] || cp "$feed" "$built"
merged="$feed"
[ "$dry" = 1 ] && merged="$work/appcast.xml"
if [ -n "$stable_tag" ] && download_live_feed "$stable_tag" "$work/live"; then
  appcast merge "$work/live/appcast.xml" "$built" "$version" "$merged"
  appcast check-above "$merged" "$version"
  if [ "$channel" = stable ]; then
    latest_version="\${stable_tag#v}"
    [ "$version" != "$latest_version" ] && [ "$(printf '%s\\n%s\\n' "$latest_version" "$version" | sort -V | tail -1)" = "$version" ] \\
      || die "$version isn't above the latest stable release ($latest_version): publishing it as latest would move every download and feed backward"
    echo "PASS  $version is above the latest stable release ($latest_version)"
  fi
else
  echo "note: \${stable_tag:-this repo} has no appcast.xml yet: $version starts it"
  cp "$built" "$merged"
fi`,
    "publish.sh first release feed",
    'stable_tag="$(latest_stable_tag || true)"',
  );
  out = replaceOnce(
    out,
    '  run gh release upload "$stable_tag" -R "$REPO" --clobber "$merged"',
    '  [ -z "$stable_tag" ] || run gh release upload "$stable_tag" -R "$REPO" --clobber "$merged"',
    "publish.sh nightly upload guard",
    '[ -z "$stable_tag" ] || run gh release upload "$stable_tag"',
  );
  out = replaceOnce(
    out,
    'for url in "$LATEST_DOWNLOAD_URL/appcast.xml" "https://ardia.dev/appcast.xml"; do',
    'for url in "$LATEST_DOWNLOAD_URL/appcast.xml"; do',
    "publish.sh appcast verify urls",
    'for url in "$LATEST_DOWNLOAD_URL/appcast.xml"; do',
  );
  return out;
});

edit("apps/browser/src/state/telemetry/watch.test.mjs", (src) => {
  const stale = 'const T = Date.parse("2026-11-01T10:00:00Z");';
  return src.includes(stale) ? src.replace(stale, "const T = Math.floor(Date.now() / DAY) * DAY;") : src;
});

edit(".github/workflows/release.yml", (src) => {
  let out = src.replaceAll("runs-on: xcode-27", "runs-on: macos-15");
  out = replaceOnce(
    out,
    "          pbx=apps/browser/macos/Ardia.xcodeproj/project.pbxproj",
    "          git checkout -- apps/browser/macos/Podfile.lock\n          pbx=apps/browser/macos/Ardia.xcodeproj/project.pbxproj",
    "release.yml Tree is clean Podfile.lock",
    "git checkout -- apps/browser/macos/Podfile.lock",
  );
  out = replaceOnce(
    out,
    "        run: .github/release/signing.sh setup",
    `        run: |
          if [ -n "\${MACOS_CERTIFICATE_P12:-}" ]; then
            .github/release/signing.sh setup
          else
            [ -n "\${SPARKLE_ED_PRIVATE_KEY:-}" ] || { echo "::error::missing SPARKLE_ED_PRIVATE_KEY"; exit 1; }
            sparkle="$RUNNER_TEMP/sparkle-key"
            (umask 077 && printf '%s' "$SPARKLE_ED_PRIVATE_KEY" > "$sparkle")
            {
              echo "SPARKLE_KEY_FILE=$sparkle"
              echo "ADHOC_SIGN=1"
            } >> "$GITHUB_ENV"
          fi`,
    "release.yml Signing step",
    'echo "ADHOC_SIGN=1"',
  );
  out = replaceOnce(
    out,
    '          rm -rf "$secrets"',
    '          rm -rf "$secrets" "$RUNNER_TEMP/sparkle-key"',
    "release.yml Remove signing",
    'rm -rf "$secrets" "$RUNNER_TEMP/sparkle-key"',
  );
  out = replaceOnce(
    out,
    `          git tag "v$VERSION" "$GITHUB_SHA"
          git push origin "refs/tags/v$VERSION"`,
    `          git tag -f "v$VERSION" "$GITHUB_SHA"
          git push -f origin "refs/tags/v$VERSION"`,
    "release.yml Tag step",
    'git tag -f "v$VERSION" "$GITHUB_SHA"',
  );
  for (const job of ["linux", "windows"]) {
    const header = `  ${job}:\n`;
    if (out.includes(header) && !out.includes(`${header}    if:`)) {
      out = out.replace(header, `${header}    if: false\n`);
    }
  }
  if (!/  publish:\n    needs: \[[^\]]+\]\n    if:/.test(out)) {
    out = out.replace(
      /  publish:\n    needs: \[[^\]]+\]\n/,
      (m) => `${m}    if: \${{ !cancelled() && needs.checks.result == 'success' && needs.sign.result == 'success' }}\n`,
    );
  }
  return out;
});
