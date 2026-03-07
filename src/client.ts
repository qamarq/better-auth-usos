import type { BetterAuthClientPlugin } from "better-auth/client";

import type { usosAuth } from "./index";

export function usosAuthClient() {
  return {
    id: "usos-auth",
    $InferServerPlugin: {} as ReturnType<typeof usosAuth>,
  } satisfies BetterAuthClientPlugin;
}
