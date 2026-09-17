/**
 * The single point of coupling between the harness and the engine's share
 * composer. If the engine's exported name differs, this file is the only edit.
 */

import { composeShareText, type GrammarFault, type ShareText } from "../../src/engine/share-grammar.js";

export interface AssembledShare {
  readonly text: string;
  /** The grammar fault the case had, or null. A faulted case renders the
   *  repaired string the player would actually receive. */
  readonly fault: GrammarFault | null;
}

export function assembleShareString(share: ShareText, options: { readonly url: string }): AssembledShare {
  const composed = composeShareText(share, options.url);
  return { text: composed.text, fault: composed.fault };
}
