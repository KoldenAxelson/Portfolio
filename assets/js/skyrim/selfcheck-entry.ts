// Separate entry point so the self-check never rides along in the page bundle.
import { runSelfCheck } from './selfcheck';

function start(): void {
  const mount = document.querySelector<HTMLElement>('[data-selfcheck]');
  if (mount) runSelfCheck(mount);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
