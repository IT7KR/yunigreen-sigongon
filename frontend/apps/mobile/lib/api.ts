import { createApiBinding } from "@sigongon/platform";
import { mockApiClient } from "./mocks/mockApi";

export const { api } = createApiBinding({
  mockClient: mockApiClient,
  loginPath: "/login",
});
