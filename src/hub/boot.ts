/** Layer 5. The hub's entry point. Separate from hub.ts so a test can mount the
 *  hub into a fixture element without a document that has an #app. */

import { bootHub } from "./hub.js";

bootHub();
