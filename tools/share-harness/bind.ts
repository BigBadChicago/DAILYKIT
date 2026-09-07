/**
 * The single point of coupling between the harness and engine/share.ts. If the
 * engine's exported name differs, this file is the only edit.
 */

import { composeShare } from "../../src/engine/share.js";
import type { ShareBlock } from "../../src/core/types.js";

export function assembleShareString(
	block: ShareBlock,
	options: { readonly url: string },
): string {
	return composeShare(block, { shareUrl: options.url }).text;
}
