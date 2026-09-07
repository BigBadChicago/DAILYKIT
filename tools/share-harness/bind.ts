/**
 * The single point of coupling between the harness and engine/share.ts. If the
 * engine's exported name differs, this file is the only edit.
 */

export { assembleShareString } from "../../src/engine/share.js";
