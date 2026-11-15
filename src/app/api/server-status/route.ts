import { ok, route } from "lib/api";
import { getServerStatus } from "lib/server-status";

export const GET = route(async () => ok(await getServerStatus()));
