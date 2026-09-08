/** Layer 5. The poker-grid entry. One file per game, listed in vite.config.ts. */

import gameModule from "../../games/poker-grid/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
