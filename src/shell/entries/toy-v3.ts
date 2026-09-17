/** Layer 5. The toy-v3 entry, the contract fixture. Listed in vite.config.ts
 *  and excluded from production by the allow list. */

import gameModule from "../../games/toy-v3/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
