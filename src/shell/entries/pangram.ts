/** Layer 5. The pangram entry. One file per game, listed in vite.config.ts. It
 *  mounts the module's default export, the v3 module the shell reads. */

import gameModule from "../../games/pangram/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
