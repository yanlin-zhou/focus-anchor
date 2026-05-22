# focus-anchor

Stay anchored on what matters most.

## MVP

Focus Anchor is a local-first Chrome New Tab extension. It shows the top 3 things to do today, keeps larger work contexts collapsed by default, and stores data locally.

## Install and Usage

For clear installation, first-run configuration, daily usage, data reset, and troubleshooting steps, read:

- [Focus Anchor 安装和使用指南](docs/install-and-usage.md)

## Development

Run tests:

```bash
npm test
```

Run syntax checks:

```bash
npm run check
```

Load locally in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select this repository folder.
5. Open a new tab.

## Manual Verification

After loading the extension locally:

- Open a new tab and confirm the Top 3 Today Items appear above collapsed Focus Lane cards.
- Confirm Backlog is collapsed by default.
- Click a Top 3 `Done` action and confirm the completion reward motion plays without shifting the layout.
- Open another new tab and confirm local state persists.
