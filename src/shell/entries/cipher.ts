/** Layer 5. The cipher entry. One file per game, listed in vite.config.ts. It
 *  mounts the v3 view of the module, which is the only contract the shell reads. */

import { cipherV3 } from "../../games/cipher/module.js";
import { mountShell } from "../main.js";

mountShell(cipherV3);
