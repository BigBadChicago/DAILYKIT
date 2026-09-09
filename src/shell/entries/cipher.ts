/** Layer 5. The cipher entry. One file per game, listed in vite.config.ts. */

import gameModule from "../../games/cipher/module.js";
import { mountShell } from "../main.js";

mountShell(gameModule);
