declare namespace DailyKit {
  interface IconSpec { glyph: string; label: string; onClick?: () => void }
  function Header(o: { title: string; fit?: 'tight' | 'tighter' | 'wrap'; left?: IconSpec[]; right?: IconSpec[] }): HTMLElement;
  function Countdown(o: { targetAt: () => number; now?: () => number; label?: string; onElapsed?: () => void }): { element: HTMLElement; start(): void; stop(): void; refresh(): void };
  function formatDuration(ms: number): string;
  function HelpPanel(c: { headline: string; steps: string[]; example: { lines: string[]; caption: string } }): HTMLElement;
  function GridCursor(o: { host: HTMLElement; rows: number; cols: number; onActivate?: (index: number) => void }): { move(r: number, c: number): void; get(): [number, number] };
  function PokerGridBoard(o: { cards: ({ rank: number; suit: 0 | 1 | 2 | 3 } | null)[]; selected?: number[]; onSelect?: (i: number) => void }): HTMLElement;
  function VectorBoard(o: { rows: ({ clue: number } | { blank: true; dir?: 0 | 1 | 2 | 3; filled?: boolean; lit?: boolean; target?: boolean })[][]; hue?: number }): HTMLElement;
  function CipherBoard(o: { history: { code: number[]; feedback: string }[]; slots: (number | null)[]; palette: number[] }): HTMLElement;
  function RotateLockBoard(o: { cells: { glyph?: string; kind?: 'empty' | 'route' | 'start' | 'lock' | 'open' | 'mark' | 'mark-taken' | 'fault' }[]; tray: { length: number; dir: 0 | 1 | 2 | 3; selected?: boolean }[]; status?: string; moves?: string; description?: string }): HTMLElement;
  function DifferenceRelayBoard(o: { order: number[]; marks: (number | null)[]; selected?: number | null; runs?: number[]; status?: string; runsLabel?: string }): HTMLElement;
  type IconName = 'home' | 'help' | 'stats' | 'archive' | 'theme-system' | 'theme-light' | 'theme-dark' | 'close';
  function Icon(name: IconName): SVGSVGElement;
  const ICON_LABEL: Record<IconName, string>;
  type GameId = 'poker-grid' | 'vector' | 'cipher' | 'rotate-lock' | 'difference-relay' | 'turn-table' | 'ring-balance' | 'order-of-operations';
  interface GameSpec { id: GameId; name: string; token: string; live: boolean; rule: string; motif: string }
  const GAMES: GameSpec[];
  function GameIcon(id: GameId): SVGSVGElement;
  function GameLogo(id: GameId, size?: 'md' | 'lg'): HTMLElement;
  function GameButton(id: GameId, opts?: { label?: string; onClick?: () => void }): HTMLButtonElement;
  const TIERS: string[];
  function TierBadge(tier: 0 | 1 | 2 | 3 | 4, label?: string): HTMLElement;
}
