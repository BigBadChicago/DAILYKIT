/** Layer 5. The rotate-lock entry. One file per game, listed in vite.config.ts. It
 *  mounts the module's default export, the v3 module the shell reads. */

import gameModule from "../../games/rotate-lock/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
