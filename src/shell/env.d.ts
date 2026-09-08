/**
 * Layer 5. Ambient declarations for the browser build only.
 *
 * The shipped tsconfig declares no Node types and no vite/client types, per
 * engine decision 7, so the two things a bundler injects are declared here by
 * hand and nowhere else.
 */

declare module "*.css";

interface ImportMetaEnv {
  /** True in dev. Gates the debug date override and state machine strictness. */
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
