export {
  APIClient,
  NetworkError,
  APIError,
  type APIClientConfig,
} from "./client";

// Re-export types for convenience
export type {
  APIResponse,
  PaginatedResponse,
  LoginResponse,
  ProjectListItem,
  ProjectDetail,
  SiteVisitDetail,
  DiagnosisDetail,
  EstimateDetail,
} from "@sigongon/types";
