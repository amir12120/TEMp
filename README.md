# TEMp — 3x-ui Custom Theme Pages

Custom user-subscription theme pages for the **3x-ui** panel, with a one-line installer
that deploys any page as the panel theme at:

```
/etc/3x-ui/templates/my-theme/index.html
```

## Quick install (on the VPS)

Interactive — shows the list of available pages and lets you pick one:

```bash
bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh)
```

Direct install of a specific page (e.g. `modern`):

```bash
bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh) modern
```

List available pages only:

```bash
bash <(curl -sL https://raw.githubusercontent.com/amir12120/TEMp/main/install.sh) list
```

## What the installer does

1. Fetches the chosen page from `pages/<name>/index.html` in this repo.
2. Creates `/etc/3x-ui/templates/my-theme/` if it does not exist.
3. **Backs up** any existing `index.html` (timestamped `.bak` file) — the previous
   theme is never lost, so switching back is as easy as re-running the installer
   with the old page's name.
4. Atomically replaces `index.html` with the new page.
5. Restarts the 3x-ui panel so the new theme goes live.

## Available pages

| Page    | Description                                    |
|---------|------------------------------------------------|
| `modern`| Modern dark/light subscription & usage panel — bilingual (fa/en), per-config QR codes, real ping test, online/offline presence, Tehran clock, app download section |

## Adding a new page later

1. Create a new folder: `pages/<name>/index.html` (name: letters, digits, `-`, `_`).
2. Add the name on its own line in `pages.txt`.
3. Commit & push. The installer menu picks it up automatically — the script itself
   never needs changing.
4. On the server, run the installer again and choose the new page.

## Repo layout

```
TEMp/
├── install.sh          # the installer/switcher script
├── pages.txt           # list of available page names (one per line)
└── pages/
    └── modern/
        └── index.html  # the page installed as my-theme/index.html
```
