// Current product entry point. Historical two-player DOM is isolated in test fixtures.
import { Capacitor } from '@capacitor/core';
import './native.css';
import { isRecoveryUrl } from './multiplayer/recovery.js';
if (Capacitor.isNativePlatform()) document.documentElement.dataset.native = '';
const params = new URLSearchParams(location.search);
const boot = isRecoveryUrl(new URL(location.href)) ? import('./multiplayer/recovery-page.js') : params.has('studio') && !Capacitor.isNativePlatform() ? import('./studio/entry.js') : params.has('camera-lab') ? import('./dice/camera-lab.js') : params.has('dice-lab') ? import('./dice/lab.js') : import('./prototype.js');
boot.catch(() => { document.body.textContent = 'The game could not load. Please refresh to try again.'; })
  .finally(() => { delete document.documentElement.dataset.booting; });
