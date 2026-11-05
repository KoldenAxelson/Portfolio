// {{< ml/embedding-table >}}: pick a token, see its row number, and watch the
// row get copied out of GPT-2's real embedding table. The rows (and the table
// view that carries them with JS off) are rendered by the shortcode from
// data/ml/embedding-table.json; this file decodes them and drives the buttons.
// The 3D scene is a separate bundle (embedding-table-3d.ts) loaded on demand,
// so without WebGL the buttons, readout and table still work.

import type { SceneHandle, TableRow } from './embedding-table-3d';

type SceneModule = typeof import('./embedding-table-3d');

const PLAY_STEP_MS = 1700;

// Rows arrive as base64 int16 counts of data-step (see build-embedding-table.py).
function decodeRow(base64: string, valueStep: number): Float32Array {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const counts = new Int16Array(bytes.buffer);
  return Float32Array.from(counts, (count) => count * valueStep);
}

const quoted = (token: string): string => `“${token}”`;

// The head comes from the table cell, which Hugo rounds from the full-precision
// values; rounding the decoded int16 copies again would disagree with it.
function describe(row: TableRow, head: string, width: number): string {
  return `${quoted(row.token)} is row ${row.id.toLocaleString('en-US')}. Go to that row and copy it: ${width} numbers, starting ${head}`;
}

async function loadScene(root: HTMLElement, stage: HTMLElement, reducedMotion: boolean): Promise<SceneHandle | null> {
  // Set by partials/ml/assets.html on the ML bundle's script tag.
  const sceneUrl = document.querySelector<HTMLScriptElement>('script[data-et-scene]')?.dataset.etScene;
  const { tower, rows, clip, width } = root.dataset;
  if (!sceneUrl || !tower) return null;
  try {
    const module = (await import(/* @vite-ignore */ sceneUrl)) as SceneModule;
    stage.hidden = false;
    return module.mountScene(stage, { rowCount: Number(rows), columnCount: Number(width), towerUrl: tower, colourClip: Number(clip), reducedMotion });
  } catch {
    // No WebGL, or the bundle failed to load: the table view stays the demo.
    stage.hidden = true;
    return null;
  }
}

export function initEmbeddingTable(root: HTMLElement): void {
  const valueStep = Number(root.dataset.step);
  const width = Number(root.dataset.width);
  const readout = root.querySelector<HTMLElement>('#mli-et-read');
  const stage = root.querySelector<HTMLElement>('#mli-et-stage');
  const tableView = root.querySelector<HTMLDetailsElement>('#mli-et-table');
  const tableRows = Array.from(root.querySelectorAll<HTMLTableRowElement>('tr[data-values]'));
  const picks = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pick]'));
  const playButton = root.querySelector<HTMLButtonElement>('#mli-et-play');
  const clearButton = root.querySelector<HTMLButtonElement>('#mli-et-clear');
  if (!readout || !stage || !tableRows.length) return;

  const rows: TableRow[] = tableRows.map((tr) => ({
    token: tr.dataset.token ?? '',
    id: Number(tr.dataset.id),
    values: decodeRow(tr.dataset.values ?? '', valueStep),
  }));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene: SceneHandle | null = null;
  let playTimer = 0;

  function markPicked(index: number): void {
    picks.forEach((button, i) => {
      button.classList.toggle('is-on', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    tableRows.forEach((tr, i) => tr.classList.toggle('is-on', i === index));
  }

  function pick(index: number): void {
    const row = rows[index];
    if (!row) return;
    markPicked(index);
    readout!.textContent = describe(row, tableRows[index]?.cells[2]?.textContent ?? '', width);
    scene?.show(row);
  }

  function stopPlaying(): void {
    window.clearTimeout(playTimer);
    playTimer = 0;
    if (playButton) playButton.textContent = 'Look up the whole sentence';
  }

  // The sentence's tokens come first in the data (group "sentence").
  const sentenceIndexes = picks.filter((button) => button.dataset.group === 'sentence').map((button) => Number(button.dataset.pick));

  function playSentence(): void {
    if (playTimer) {
      stopPlaying();
      return;
    }
    scene?.clear();
    let next = 0;
    const lookUpNext = (): void => {
      pick(sentenceIndexes[next]);
      next += 1;
      if (next >= sentenceIndexes.length) {
        stopPlaying();
        readout!.textContent = `The sentence is now ${sentenceIndexes.length} rows, one per token, stacked in order. Add each slot's position row and that stack is what the model reads.`;
        return;
      }
      playTimer = window.setTimeout(lookUpNext, reducedMotion ? 0 : PLAY_STEP_MS);
    };
    if (playButton) playButton.textContent = 'Stop';
    lookUpNext();
  }

  const actions = root.querySelector<HTMLElement>('#mli-et-actions');
  if (actions) actions.hidden = false;
  for (const button of picks) {
    button.disabled = false;
    button.addEventListener('click', () => {
      stopPlaying();
      pick(Number(button.dataset.pick));
    });
  }
  if (playButton) {
    playButton.disabled = false;
    playButton.addEventListener('click', playSentence);
  }
  if (clearButton) {
    clearButton.disabled = false;
    clearButton.addEventListener('click', () => {
      stopPlaying();
      scene?.clear();
      markPicked(-1);
      readout.textContent = 'Cleared. Pick a token to look up its row.';
    });
  }

  void loadScene(root, stage, reducedMotion).then((handle) => {
    scene = handle;
    if (!handle) return;
    // The scene now shows the rows, so the table becomes the optional view.
    if (tableView) tableView.open = false;
    pick(1);
  });
}
