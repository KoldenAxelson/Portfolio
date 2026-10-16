export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function button(className: string, label: string, onClick: (event: MouseEvent) => void): HTMLButtonElement {
  const node = element('button', className);
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', onClick);
  return node;
}
