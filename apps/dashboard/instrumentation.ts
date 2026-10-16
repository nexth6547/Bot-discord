import { assertDashboardEnvironment } from "./src/lib/environment";

export function register() {
  assertDashboardEnvironment();
}
