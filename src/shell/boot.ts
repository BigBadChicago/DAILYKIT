/**
 * Layer 5. Manifest fetching and puzzle production. Charter decision 3 and 10.
 *
 * The shell fetches and the game parses. Everything network shaped lives here,
 * so offline behaviour, the past horizon fallback, and the lookahead prefetch
 * are one file rather than a habit repeated in five games.
 */

import type { AnyGameModule, OpaquePuzzle } from "../contract/game-module.js";
import { isErr } from "../core/result.js";
import { seedFor } from "../core/seed.js";
import type { PuzzleNumber } from "../core/types.js";

interface ChunkPointer {
  readonly from: number;
  readonly to: number;
  readonly url: string;
}

interface ManifestIndex {
  readonly horizon: number;
  readonly chunks: readonly ChunkPointer[];
}

export type PuzzleLoad =
  | { readonly kind: "ok"; readonly puzzle: OpaquePuzzle; readonly rated: boolean }
  /** Inside the horizon but the manifest could not be read. Never falls back to
   *  generation: a generated board would be a different board from the one every
   *  other player is on, which is worse than an honest message. */
  | { readonly kind: "unavailable"; readonly detail: string };

export type FetchJson = (url: string) => Promise<unknown>;

export const browserFetchJson: FetchJson = async (url) => {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return (await response.json()) as unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIndex(value: unknown): ManifestIndex | null {
  if (!isRecord(value) || !Number.isInteger(value["horizon"]) || !Array.isArray(value["chunks"])) {
    return null;
  }
  const chunks: ChunkPointer[] = [];
  for (const raw of value["chunks"]) {
    if (!isRecord(raw)) return null;
    if (!Number.isInteger(raw["from"]) || !Number.isInteger(raw["to"])) return null;
    if (typeof raw["url"] !== "string") return null;
    chunks.push({ from: raw["from"] as number, to: raw["to"] as number, url: raw["url"] });
  }
  return { horizon: value["horizon"] as number, chunks };
}

function boardFrom(value: unknown, puzzleNumber: PuzzleNumber): unknown | null {
  if (!isRecord(value) || !Array.isArray(value["boards"])) return null;
  for (const raw of value["boards"] as readonly unknown[]) {
    if (isRecord(raw) && raw["number"] === puzzleNumber) return raw;
  }
  return null;
}

/**
 * One instance per session. Holds the index and the chunks already fetched, so
 * opening the archive does not refetch the month the player is already in.
 */
export class PuzzleSource {
  private index: ManifestIndex | null = null;

  private indexFailed = false;

  private readonly chunks = new Map<string, unknown>();

  constructor(
    private readonly game: AnyGameModule,
    private readonly fetchJson: FetchJson = browserFetchJson,
  ) {}

  async load(puzzleNumber: PuzzleNumber): Promise<PuzzleLoad> {
    const index = await this.loadIndex();

    /* No index at all is not the same as past the horizon. Generating here
       would serve a private board on a day the manifest has an opinion about. */
    if (index === null) {
      return { kind: "unavailable", detail: "The puzzle list could not be loaded." };
    }

    if (puzzleNumber > index.horizon) return this.generate(puzzleNumber);

    const pointer = index.chunks.find(
      (chunk) => puzzleNumber >= chunk.from && puzzleNumber <= chunk.to,
    );
    if (pointer === undefined) {
      return { kind: "unavailable", detail: `No puzzle is published for day ${puzzleNumber}.` };
    }

    let chunk = this.chunks.get(pointer.url);
    if (chunk === undefined) {
      try {
        chunk = await this.fetchJson(pointer.url);
      } catch {
        return { kind: "unavailable", detail: "Today's puzzle is not available offline yet." };
      }
      this.chunks.set(pointer.url, chunk);
    }

    const raw = boardFrom(chunk, puzzleNumber);
    if (raw === null) {
      return { kind: "unavailable", detail: `No puzzle is published for day ${puzzleNumber}.` };
    }

    const parsed = this.game.parsePuzzle(puzzleNumber, raw);
    if (isErr(parsed)) {
      return { kind: "unavailable", detail: `The puzzle for day ${puzzleNumber} is unreadable.` };
    }
    return { kind: "ok", puzzle: parsed.value, rated: true };
  }

  /** Requirement 6.3.1. Reproducible from the seed, so every client past the
   *  horizon still gets the same board, but with no stored optimum it is
   *  unrated in the end screen and in the share block. Resolution 3. */
  private generate(puzzleNumber: PuzzleNumber): PuzzleLoad {
    const seed = seedFor(this.game.identity.id, puzzleNumber);
    const generated = this.game.generatePuzzle(puzzleNumber, seed);
    if (isErr(generated)) {
      return { kind: "unavailable", detail: "This puzzle could not be produced." };
    }
    return { kind: "ok", puzzle: generated.value, rated: false };
  }

  /**
   * Charter decision 3. Warms the chunk holding today plus the lookahead so a
   * player who opens the tab today and returns tomorrow with no connection
   * still has a board. Failures are silent by design.
   */
  async prefetch(puzzleNumber: PuzzleNumber): Promise<void> {
    const index = await this.loadIndex();
    if (index === null) return;
    const ahead = puzzleNumber + this.game.manifest.lookaheadDays;
    for (const pointer of index.chunks) {
      const overlaps = ahead >= pointer.from && puzzleNumber <= pointer.to;
      if (!overlaps || this.chunks.has(pointer.url)) continue;
      try {
        this.chunks.set(pointer.url, await this.fetchJson(pointer.url));
      } catch {
        /* Prefetch is best effort. The real load reports its own failure. */
      }
    }
  }

  private async loadIndex(): Promise<ManifestIndex | null> {
    if (this.index !== null || this.indexFailed) return this.index;
    try {
      this.index = parseIndex(await this.fetchJson(this.game.manifest.indexUrl));
    } catch {
      this.index = null;
    }
    if (this.index === null) this.indexFailed = true;
    return this.index;
  }
}
