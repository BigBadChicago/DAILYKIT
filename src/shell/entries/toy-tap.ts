/** Layer 5. The toy-tap entry. One file per game, listed in vite.config.ts. */

import gameModule from "../../games/toy-tap/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
