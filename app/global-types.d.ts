/**
 * Global type declarations
 *
 * This file re-declares standard DOM types that are shadowed by @cloudflare/workers-types
 * The workers-types package defines its own versions (e.g., WorkerLocation instead of Location)
 * which breaks client-side component type checking.
 */

// Restore standard DOM types for client components
interface HTMLElement {
  classList: DOMTokenList;
  style: CSSStyleDeclaration;
}

interface HTMLInputElement extends HTMLElement {
  value: string;
  checked: boolean;
  indeterminate?: boolean;
}

interface HTMLTextAreaElement extends HTMLElement {
  value: string;
}

interface HTMLSelectElement extends HTMLElement {
  value: string;
  form: HTMLFormElement | null;
}

interface HTMLFormElement extends HTMLElement {
  requestSubmit?: () => void;
  submit(): void;
}

interface DataTransfer {
  files: FileList;
}

interface HTMLDivElement extends HTMLElement {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

interface HTMLTableCellElement extends HTMLElement {
  colSpan: number;
  rowSpan: number;
  headers?: string;
}

interface HTMLTableCaptionElement extends HTMLElement {
  align?: string;
}

interface EventTarget {
  value?: string;
  form?: HTMLFormElement | null;
  files?: FileList;
}

// Restore window and document globals
declare const window: Window & typeof globalThis & {
  matchMedia(query: string): MediaQueryList;
  location: Location;
};
declare const document: Document & {
  activeElement: Element | null;
  documentElement: HTMLElement;
  querySelector(selectors: string): Element | null;
  querySelectorAll(selectors: string): NodeListOf<Element>;
};

// Restore standard Location interface (not WorkerLocation)
interface Location {
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  origin: string;
  assign(url: string | URL): void;
  replace(url: string | URL): void;
  reload(): void;
}
interface MediaQueryListEvent extends Event {
  matches: boolean;
  media: string;
}

// Playwright types for e2e tests
interface ViewportSize {
  width: number;
  height: number;
}

// Extend Element interface for Playwright
interface Element {
  tagName: string;
}

// Extend Page interface for Playwright
interface Page {
  viewport: ViewportSize | null;
  setViewportSize(viewport: ViewportSize): Promise<void>;
}

