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
#  Adding a new page later: create  pages/<name>/index.html  in the repo.
#  It automatically appears in the menu of this script — no script change needed.
# ============================================================================
set -euo pipefail

REPO="amir12120/TEMp"
BRANCH="main"
BASE_RAW="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
TARGET_DIR="/etc/3x-ui/templates/my-theme"
TARGET_FILE="${TARGET_DIR}/index.html"
PAGES_INDEX="pages.txt"

# ---------- helpers ---------------------------------------------------------
C_G="\033[1;32m"; C_Y="\033[1;33m"; C_R="\033[1;31m"; C_B="\033[1;36m"; C_0="\033[0m"
say()  { printf "%b\n" "${C_B}::${C_0} $*"; }
ok()   { printf "%b\n" "${C_G} ✔${C_0} $*"; }
warn() { printf "%b\n" "${C_Y} !${C_0} $*"; }
die()  { printf "%b\n" "${C_R} ✘ $*${C_0}"; exit 1; }

need_root() {
  [[ "${FAKE_ROOT:-0}" == "1" ]] || [ "$(id -u)" -eq 0 ] || die "Run as root (sudo bash ...). Target: ${TARGET_FILE}"
}

fetch() {  # fetch <repo-relative-path> -> stdout ; dies on HTTP error
  local path="$1" tmp
  tmp="$(mktemp)" || die "mktemp failed"
  local code
  code="$(curl -fsSL -o "$tmp" -w '%{http_code}' "${BASE_RAW}/${path}" 2>/dev/null || echo 000)"
  if [ "$code" != "200" ]; then rm -f "$tmp"; die "GET ${path} failed (HTTP ${code})"; fi
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
  warn "pages.txt not found; discovering pages via GitHub API..."
  local api="https://api.github.com/repos/${REPO}/contents/pages"
  curl -fsSL "$api" 2>/dev/null | grep -o '"name": *"[^"]*"' | sed 's/.*"name": *"\(.*\)"/\1/'
}

# ---------- install ---------------------------------------------------------
install_page() {
  local page="$1" tmp
  [[ "$page" =~ ^[A-Za-z0-9_-]+$ ]] || die "Invalid page name: ${page}"

  say "Fetching page '${page}' from ${REPO}..."
  tmp="$(fetch "pages/${page}/index.html")"

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
    local i=0 names=()
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      names+=("$p"); i=$((i+1))
      printf "  ${C_G}%d)${C_0} %s\n" "$i" "$p"
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

  install_page "$pick"
}

main "$@"
