import { createApiBinding } from "@sigongcore/platform";
import { mockApiClient } from "./mocks/mockApi";

export const { api } = createApiBinding({
  mockClient: mockApiClient,
  loginPath: "/login",
});
