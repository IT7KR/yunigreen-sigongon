# 스토리보드 Mock API 계약서 (페이지 흐름 기준)

## 공통 규칙

- 응답 형태: `{ success, data, error }` 또는 `PaginatedResponse`
- 상태 값은 UI 상태머신 기준으로 최소화(상세 코드는 내부용)
- 파일 업로드는 mock에서 `storage_path`만 반환

## 1) Auth

- `POST /auth/login`
  - req: `{ email, password }`
  - res: `LoginResponse`
- `GET /auth/me`
  - res: `{ id, email, name, role, organization? }`

## 2) Projects

- `GET /projects`
  - query: `page, per_page, status, search`
  - res: `PaginatedResponse<ProjectListItem>`
- `GET /projects/:id`
  - res: `ProjectDetail` + 문서/계약/견적 상태 요약 필드(스토리보드용 확장)
- `POST /projects`
  - req: `{ name, address, client_name?, client_phone?, notes? }`
  - res: `{ id, name, status }`

## 3) Site Visits / Photos

- `GET /projects/:id/site-visits`
  - res: `SiteVisitDetail[]`
- `POST /projects/:id/site-visits`
  - req: `{ visit_type, visited_at, notes? }`
  - res: `{ id, visit_type, visited_at }`
- `POST /site-visits/:visitId/photos`
  - req: `multipart(file, photo_type, caption?)`
  - res: `{ id, storage_path, photo_type }`

## 4) Diagnosis (AI)

- `POST /site-visits/:visitId/diagnose`
  - req: `{ additional_notes?, photo_ids? }`
  - res: `{ diagnosis_id, status, message }`
- `GET /diagnoses/:id`
  - res: `DiagnosisDetail` (status: `pending|processing|completed|failed`)

## 5) Estimates

- `POST /projects/:projectId/estimates`
  - req: `{ diagnosis_id?, include_confirmed_only? }`
  - res: `{ id, version, status, total_amount, lines[] }`
- `GET /estimates/:id`
  - res: `EstimateDetail`
- `POST /estimates/:id/issue`
  - res: `{ id, status, issued_at, message }`
- `PATCH /estimates/:id/lines/:lineId`
  - req: `{ quantity?, unit_price_snapshot?, description? }`
  - res: `{ id, quantity, unit_price_snapshot, amount }`
- `POST /estimates/:id/lines`
  - req: `{ description, specification?, unit, quantity, unit_price_snapshot }`
  - res: `{ id, description, amount }`
- `DELETE /estimates/:id/lines/:lineId`
  - res: `{ message }`

## 6) Contracts (공사도급)

- `GET /projects/:id/contracts`
  - res: `ContractDetail[]`
- `GET /contracts/:id`
  - res: `ContractDetail`
- `POST /projects/:id/contracts`
  - req: `{ estimate_id, start_date?, expected_end_date?, notes? }`
  - res: `{ id, contract_number, status }`
- `POST /contracts/:id/send`
  - res: `{ id, status, sent_at, signature_url }`
- `POST /contracts/:id/sign`
  - req: `{ signature_data, signer_type }`
  - res: `{ id, status, signed_at }`

## 7) Labor (일용직 근로계약)

- `GET /projects/:id/labor-contracts`
  - res: `LaborContractListItem[]`
- `POST /projects/:id/labor-contracts`
  - req: `{ worker_name, worker_phone?, work_date, work_type?, daily_rate, hours_worked? }`
  - res: `{ id, worker_name, status }`
- `POST /labor-contracts/:id/send`
  - res: `{ id, status, signature_url }`
- `POST /labor-contracts/:id/sign`
  - req: `{ signature_data }`
  - res: `{ id, status, signed_at }`
- `GET /projects/:id/labor-contracts/summary`
  - res: `{ total_workers, total_amount, by_status, by_work_type }`

## 8) Paystubs (지급명세서)

- `GET /workers/:id/paystubs`
  - res: `[{ id, status, issued_at, amount, project_name }]`
- `GET /workers/:id/paystubs/:paystubId`
  - res: `{ id, items[], amount, received_at? }`
- `POST /workers/:id/paystubs/:paystubId/ack`
  - res: `{ id, received_at }`

## 9) Workers (서류/프로필)

- `GET /workers/:id/profile`
  - res: `{ name, phone, bank_account, address, real_address, documents[] }`
- `PATCH /workers/:id/profile`
  - req: profile fields
  - res: profile
- `POST /workers/:id/documents`
  - req: multipart
  - res: `{ id, doc_type, storage_path }`

## 10) Warranty

- `GET /projects/:id/warranty`
  - res: `{ project_id, warranty_expires_at, days_remaining, is_expired, as_requests[] }`
- `POST /projects/:id/warranty/as-requests`
  - req: `{ description, photos? }`
  - res: `{ id, status, message }`

## 11) Tax Invoice (Popbill)

- `GET /projects/:id/tax-invoice`
  - res: `{ status, issued_at?, failed_reason? }`
- `POST /projects/:id/tax-invoice`
  - res: `{ status, message }`

## 12) Billing (Toss)

- `GET /billing/subscription`
  - res: `{ plan, seat_count, status, trial_ends_at?, next_billing_at? }`
- `POST /billing/checkout`
  - res: `{ checkout_url }`
- `PATCH /billing/seats`
  - req: `{ seat_count }`
  - res: `{ seat_count, message }`

## 13) Tenants (최고관리자)

- `GET /sa/tenants`
  - res: `PaginatedResponse<{ id, name, status, seats, trial_ends_at }>`
- `POST /sa/tenants`
  - req: tenant fields
  - res: `{ id, message }`
- `PATCH /sa/tenants/:id/status`
  - req: `{ status }`
  - res: `{ id, status }`

## 14) Pricebooks (최고관리자)

- `GET /pricebooks/revisions`
  - res: `[{ id, version_label, status, effective_from, item_count }]`
- `POST /pricebooks/revisions`
  - req: multipart PDF
  - res: `{ id, version_label, status, processing_status, staging_items_count, message }`
- `GET /pricebooks/revisions/:id/staging`
  - res: `PaginatedResponse<StagingItem>`
- `POST /pricebooks/staging/:id/review`
  - req: `{ action, corrected_*? }`
  - res: `{ id, status }`
- `POST /pricebooks/revisions/:id/staging/bulk-review`
  - req: `{ staging_ids, action, review_note? }`
  - res: `{ updated_count, message }`
- `POST /pricebooks/revisions/:id/promote`
  - res: `{ promoted_count, message }`

## 15) Notifications (모바일)

- `GET /notifications`
  - res: `[{ id, title, body, link, is_read, created_at }]`
- `POST /notifications/:id/read`
  - res: `{ id, is_read }`
