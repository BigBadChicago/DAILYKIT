/**
 * Layer 2. Element creation and idempotent patching. Section 4, Layer 2.1.
 *
 * Every setter here skips a write whose value is already in place. A write to
 * className or textContent invalidates layout even when the new value equals
 * the old one, and chrome re renders on every state mutation because of
 * requirement 3.3.4.
 */

export type Child = Node | string | number | false | null | undefined;

export interface ElProps {
  readonly class?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string | number | boolean | null>>;
  readonly style?: Readonly<Record<string, string>>;
  readonly on?: Readonly<Record<string, EventListener>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElProps,
  children?: readonly Child[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    if (props.class !== undefined) node.className = props.class;
    if (props.text !== undefined) node.textContent = props.text;
    if (props.attrs) {
      for (const key of Object.keys(props.attrs)) setAttr(node, key, props.attrs[key] ?? null);
    }
    if (props.style) {
      for (const key of Object.keys(props.style)) node.style.setProperty(key, props.style[key]!);
    }
    if (props.on) {
      for (const type of Object.keys(props.on)) node.addEventListener(type, props.on[type]!);
    }
  }
  if (children) append(node, children);
  return node;
}

export function append(host: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    host.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
  }
}

export function setText(node: Node, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

export function setAttr(
  node: Element,
  name: string,
  value: string | number | boolean | null,
): void {
  // Absent and false both mean remove, so a caller can pass a boolean directly.
  if (value === null || value === false) {
    if (node.hasAttribute(name)) node.removeAttribute(name);
    return;
  }
  const next = value === true ? "" : String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

export function setClass(node: Element, name: string, present: boolean): void {
  if (node.classList.contains(name) !== present) node.classList.toggle(name, present);
}

export function clear(host: Node): void {
  while (host.firstChild) host.removeChild(host.firstChild);
}

/** Returns the remover, so a view's unmount is one call per listener. */
export function on<T extends EventTarget>(
  target: T,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/**
 * Keyed reconcile over direct children. Nodes are matched by data-key, so a
 * reordered list keeps its DOM nodes and therefore keeps focus and any running
 * transition.
 */
export function patchKeyed<T>(
  host: HTMLElement,
  items: readonly T[],
  keyOf: (item: T, index: number) => string,
  create: (item: T, index: number) => HTMLElement,
  update?: (node: HTMLElement, item: T, index: number) => void,
): void {
  const existing = new Map<string, HTMLElement>();
  for (const child of Array.from(host.children)) {
    const key = (child as HTMLElement).dataset["key"];
    if (key !== undefined) existing.set(key, child as HTMLElement);
    else host.removeChild(child);
  }
  let cursor: Node | null = host.firstChild;
  items.forEach((item, index) => {
    const key = keyOf(item, index);
    let node = existing.get(key);
    if (node === undefined) {
      node = create(item, index);
      node.dataset["key"] = key;
    } else {
      existing.delete(key);
    }
    if (update) update(node, item, index);
    if (cursor === node) cursor = node.nextSibling;
    else host.insertBefore(node, cursor);
  });
  for (const stale of existing.values()) host.removeChild(stale);
}
