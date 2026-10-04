#!/usr/bin/env bash
# ============================================================================
#  TEMp theme installer for 3x-ui
#  Installs/switches custom user-subscription theme pages into:
#      /etc/3x-ui/templates/my-theme/index.html
#
#  Usage:
#      bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh)              # interactive
#      bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh) modern      # direct
#      bash install.sh list                                                                          # list only
#
#  The first install also drops a `temp` command into /usr/local/bin, so from then on
#  you just type  temp  (or  temp speed  /  temp list) — no need to paste the
#  curl command again every time you want to switch theme.
#
#  Adding a new page later: create  pages/<name>/index.html  in the repo.
#  It automatically appears in the menu of this script — no script change needed.
# ============================================================================
set -euo pipefail

REPO="amir12120/TEMp"
BRANCH="main"
# Paths are overridable so the flow can be rehearsed outside a real panel.
BASE_RAW="${TEMP_BASE_RAW:-https://raw.githubusercontent.com/${REPO}/${BRANCH}}"
TARGET_DIR="${TEMP_TARGET_DIR:-/etc/3x-ui/templates/my-theme}"
TARGET_FILE="${TARGET_DIR}/index.html"
PAGES_INDEX="pages.txt"
BIN_PATH="${TEMP_BIN_PATH:-/usr/local/bin/temp}"
STATE_DIR="${TEMP_STATE_DIR:-/var/lib/temp-theme}"
STATE_FILE="${STATE_DIR}/active"

# ---------- helpers ---------------------------------------------------------
C_G="\033[1;32m"; C_Y="\033[1;33m"; C_R="\033[1;31m"; C_B="\033[1;36m"; C_0="\033[0m"
say()  { printf "%b\n" "${C_B}::${C_0} $*"; }
ok()   { printf "%b\n" "${C_G} ✔${C_0} $*"; }
warn() { printf "%b\n" "${C_Y} !${C_0} $*"; }
die()  { printf "%b\n" "${C_R} ✘ $*${C_0}"; exit 1; }

need_root() {
  [[ "${FAKE_ROOT:-0}" == "1" ]] || [ "$(id -u)" -eq 0 ] || die "Run as root (sudo bash ...). Target: ${TARGET_FILE}"
}

fetch() {  # fetch <repo-relative-path> -> stdout ; returns nonzero on HTTP error
  local path="$1" tmp
  tmp="$(mktemp)" || die "mktemp failed"
  local code curl_status=0
  code="$(curl -fsSL -o "$tmp" -w '%{http_code}' "${BASE_RAW}/${path}" 2>/dev/null)" || curl_status=$?
  if [ "$curl_status" -ne 0 ] || [ "$code" != "200" ]; then
    rm -f "$tmp"
    [ -n "$code" ] || code="000"
    printf 'GET %s failed (HTTP %s)\n' "$path" "$code" >&2
    return 1
  fi
  printf '%s' "$tmp"
}

# ---------- page list -------------------------------------------------------
# pages.txt lists one theme name per line (e.g. "modern"). Fallback: scan the
# GitHub API tree if pages.txt is missing (repo may lag behind).
list_pages() {
  local tmp
  if tmp="$(fetch "${PAGES_INDEX}" 2>/dev/null)" && [ -s "$tmp" ]; then
    grep -v '^[[:space:]]*$' "$tmp" | grep -v '^#' | tr -d '\r'
    rm -f "$tmp"
    return 0
  fi
  rm -f "${tmp:-}"
  warn "pages.txt not found; discovering pages via GitHub API..."
  local api="https://api.github.com/repos/${REPO}/contents/pages"
  curl -fsSL "$api" 2>/dev/null | grep -o '"name": *"[^"]*"' | sed 's/.*"name": *"\(.*\)"/\1/'
}

# ---------- active theme ----------------------------------------------------
active_page() {  # name of the theme currently on disk, empty when unknown
  [ -f "$STATE_FILE" ] || return 0
  local name
  name="$(tr -d '\r\n' < "$STATE_FILE" 2>/dev/null || true)"
  [[ "$name" =~ ^[A-Za-z0-9_-]+$ ]] && printf '%s' "$name"
}

remember_page() {  # record what we just installed so the menu can mark it
  mkdir -p "$STATE_DIR" 2>/dev/null || return 0
  printf '%s\n' "$1" > "$STATE_FILE" 2>/dev/null || warn "Could not record the active theme."
}

# ---------- the `temp` command ---------------------------------------------
# Installed on first run so later switches are just `temp` + a menu. It always
# re-fetches the installer, so a theme added to the repo shows up without
# touching this file; a cached copy keeps it working when GitHub is unreachable.
install_command() {
  local dir tmpbin
  dir="$(dirname "$BIN_PATH")"
  mkdir -p "$dir" 2>/dev/null || true
  [ -w "$dir" ] || return 0   # not fatal: the page itself is already installed
  tmpbin="${BIN_PATH}.new.$$"

  cat > "$tmpbin" <<'LAUNCHER' || { rm -f "$tmpbin"; return 0; }
#!/usr/bin/env bash
# temp — switch the 3x-ui subscription theme. Installed by TEMp/install.sh.
set -uo pipefail

RAW_URL="${TEMP_LAUNCHER_URL:-__RAW__}"
CACHE_DIR="${TEMP_LAUNCHER_CACHE_DIR:-__STATE_DIR__}"
CACHED="${CACHE_DIR}/install.sh"
TARGET_DIR="__TARGET_DIR__"

# Check what we actually need — write access to the theme folder — rather than
# the uid, so this also works under sudo, in containers, or as a non-root user
# who has been granted access.
if ! mkdir -p "$TARGET_DIR" 2>/dev/null || [ ! -w "$TARGET_DIR" ]; then
  printf 'temp needs write access to %s — try:\n  sudo temp %s\n' \
    "$TARGET_DIR" "$*" >&2
  exit 1
fi

mkdir -p "$CACHE_DIR" 2>/dev/null || true
tmp="$(mktemp)" || exit 1
trap 'rm -f "$tmp"' EXIT

script=""
if curl -fsSL -o "$tmp" "$RAW_URL" 2>/dev/null && [ -s "$tmp" ]; then
  script="$tmp"
  cp -f "$tmp" "$CACHED" 2>/dev/null || true   # keep a copy for offline runs
elif [ -s "$CACHED" ]; then
  script="$CACHED"
  printf ':: GitHub unreachable — using the cached installer.\n' >&2
else
  printf ':: Could not download the installer and no cached copy exists.\n' >&2
  exit 1
fi

bash "$script" "$@"
LAUNCHER

  # substitute the placeholders (quoted heredoc above kept them literal)
  sed -i \
    -e "s|__RAW__|${BASE_RAW}/install.sh|g" \
    -e "s|__STATE_DIR__|${STATE_DIR}|g" \
    -e "s|__TARGET_DIR__|${TARGET_DIR}|g" \
    "$tmpbin"
  chmod 755 "$tmpbin" 2>/dev/null || true
  # atomic replace, so refreshing the launcher never truncates a `temp`
  # that happens to be running right now
  mv -f "$tmpbin" "$BIN_PATH" 2>/dev/null || rm -f "$tmpbin"
}

# ---------- install ---------------------------------------------------------
install_page() {
  local page="$1" tmp
  [[ "$page" =~ ^[A-Za-z0-9_-]+$ ]] || die "Invalid page name: ${page}"

  say "Fetching page '${page}' from ${REPO}..."
  tmp="$(fetch "pages/${page}/index.html")" || die "Could not download page '${page}'."

  need_root
  mkdir -p "$TARGET_DIR"

  if [ -f "$TARGET_FILE" ]; then
    local backup="${TARGET_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    cp -a "$TARGET_FILE" "$backup"
    warn "Existing index.html found — backed up to: ${backup}"
  fi

  # atomic replace: move new file into place, fix ownership/permissions
  mv -f "$tmp" "${TARGET_FILE}.new"
  chown root:root "${TARGET_FILE}.new" 2>/dev/null || true
  chmod 644 "${TARGET_FILE}.new"
  mv -f "${TARGET_FILE}.new" "$TARGET_FILE"

  remember_page "$page"
  ok "Installed '${page}' -> ${TARGET_FILE}"
  say "Restarting 3x-ui panel to apply the new theme..."
  if command -v x-ui >/dev/null 2>&1; then
    x-ui restart >/dev/null 2>&1 && ok "3x-ui restarted" || warn "Could not restart 3x-ui automatically — run: x-ui restart"
  elif systemctl list-unit-files 2>/dev/null | grep -q '^x-ui'; then
    systemctl restart x-ui && ok "3x-ui restarted (systemctl)" || warn "systemctl restart x-ui failed"
  else
    warn "3x-ui service not found — restart the panel manually."
  fi
  echo
  ok "Done. Open the panel subscription page to see the new theme."
  if [ -x "$BIN_PATH" ]; then
    echo
    say "From now on, switch themes any time with:"
    printf "     ${C_G}%s${C_0}   (or: %s <page>)\n" "$BIN_PATH" "$BIN_PATH"
  fi
}

# ---------- main ------------------------------------------------------------
main() {
  local pages pick
  pages="$(list_pages)" || true
  [ -n "${pages:-}" ] || die "No pages found in repo (${REPO})."

  if [ "${1:-}" = "list" ]; then
    echo "$pages"
    exit 0
  fi

  if [ -n "${1:-}" ]; then
    pick="$1"
    echo "$pages" | grep -qx "$pick" || warn "'${pick}' not in page list — trying anyway."
  else
    echo
    printf "%b\n" "${C_B}==============================================${C_0}"
    printf "%b\n" "${C_G}   TEMp theme installer for 3x-ui${C_0}"
    printf "%b\n" "${C_B}==============================================${C_0}"
    echo
    say "Available pages:"
    local i=0 names=() active
    active="$(active_page)"
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      names+=("$p"); i=$((i+1))
      if [ -n "$active" ] && [ "$p" = "$active" ]; then
        printf "  ${C_G}%d)${C_0} %s ${C_Y}* active${C_0}\n" "$i" "$p"
      else
        printf "  ${C_G}%d)${C_0} %s\n" "$i" "$p"
      fi
    done <<< "$pages"
    echo
    printf "%s" "Select page number [1-${#names[@]}]: "
    read -r n
    case "$n" in
      ''|*[!0-9]*) die "Invalid choice." ;;
    esac
    [ "$n" -ge 1 ] && [ "$n" -le "${#names[@]}" ] || die "Out of range."
    pick="${names[$((n-1))]}"
  fi

  # Create the `temp` command before installing, so the confirmation at the end
  # of install_page can point the user at it.
  install_command
  install_page "$pick"
}

main "$@"
