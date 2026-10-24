# Amber phone sample version

Separate test version at http://192.168.1.148:8476/ on the ROG's LAN. Both phones must use the same Wi-Fi. Open in Safari/Chrome; no native install or main-version promotion.

This uses the real existing multiplayer backend and accounts, with the new shared UI. It does not seed or mutate accounts/tables on launch. Sign in to the same account to return to an existing table, or deliberately create a separate sample game in the UI. Real scoring actions save real progress: this is not a fake backend. No paid voice proxy, provider key, push, service worker or fictional lab profile is enabled. Only validated public phone-test fields enter the client build. The original 8475 workbench keeps its fictional offline profile.

Start: `./preview/Start-Preview.ps1 -PublicConfig <absolute-public-only-env-file>`.
Build: set YAHTZ_PREVIEW_CONFIG to that same file, then `node node_modules/vite/bin/vite.js build --config preview/vite.config.js`.

UUID fallback uses cryptographic getRandomValues before app dependencies, for LAN HTTP browsers. This test origin has separate local storage from native apps; cloud membership belongs to the signed-in account. Existing native apps are not changed. Camera/Bluetooth/native integrations are outside this browser sample.
