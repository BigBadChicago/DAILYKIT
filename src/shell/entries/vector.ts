/** Layer 5. The vector entry. One file per game, listed in vite.config.ts. */

import gameModule from "../../games/vector/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
