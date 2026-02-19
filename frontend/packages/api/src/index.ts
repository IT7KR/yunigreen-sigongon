export {
  APIClient,
  NetworkError,
  APIError,
  type APIClientConfig,
  type FieldRepresentativeRead,
  type FieldRepresentativeCreate,
  type RepresentativeAssignment,
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
  SeasonInfo,
  SeasonCategoryInfo,
  SeasonCategoryPurpose,
  SeasonDocumentInfo,
  SeasonDocumentStatusInfo,
  DiagnosisCase,
  DiagnosisCaseImage,
  VisionResultDetail,
  DiagnosisCaseEstimate,
} from "@sigongon/types";
