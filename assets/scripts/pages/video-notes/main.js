// Entry for video-notes widgets (misc pages built from YouTube transcripts).
// Each widget shortcode marks its root with data-vn-src (its lazy module under
// static/js/<page-slug>/) and data-vn-init (the global that module defines), so
// adding a widget never means touching this file.
// Shares the ML articles' lazy loader rather than keeping a second copy.
import { loadScript, whenVisible } from '../ml/lazy.js';

document.querySelectorAll('[data-vn-src]').forEach((root) => {
  whenVisible(root, () => {
    loadScript(root.dataset.vnSrc, () => {
      const widget = window[root.dataset.vnInit];
      if (widget) widget.init(root);
    });
  });
});
