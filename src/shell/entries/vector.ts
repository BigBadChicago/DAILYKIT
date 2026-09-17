/** Layer 5. The vector entry. One file per game, listed in vite.config.ts. It
 *  mounts the v3 view of the module, which is the only contract the shell reads. */

import { vectorV3 } from "../../games/vector/module.js";
import { mountShell } from "../main.js";

mountShell(vectorV3);
