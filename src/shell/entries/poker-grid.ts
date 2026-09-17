/** Layer 5. The poker-grid entry. One file per game, listed in vite.config.ts. It
 *  mounts the v3 view of the module, which is the only contract the shell reads. */

import { pokerGridV3 } from "../../games/poker-grid/module.js";
import { mountShell } from "../main.js";

mountShell(pokerGridV3);
