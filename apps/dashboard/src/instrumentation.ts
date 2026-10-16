import { assertDashboardEnvironment } from "./lib/environment";

export function register() {
  assertDashboardEnvironment();
}
