# Modusign Electronic Contract Integration

This document summarizes the Modusign (모두싸인) electronic contract integration for the SigongOn admin app.

## Overview

The integration adds electronic signature functionality using the Modusign service for formal construction contracts (공사도급계약). Users can now request electronic signatures from clients via email, track signature status, and download signed documents.

## Changes Made

### 1. Type Definitions (`/frontend/packages/types/src/index.ts`)

Added new types for Modusign integration:

```typescript
export type SignatureMethod = "self" | "modusign"
export type ModusignStatus = "pending" | "sent" | "viewed" | "signed" | "rejected" | "expired"

export interface ModusignRequest {
  id: string
  contract_id: string
  document_id: string
  status: ModusignStatus
  signer_name: string
  signer_email: string
  signer_phone?: string
  sent_at: string
  signed_at?: string
  expired_at?: string
  document_url?: string
}
```

### 2. API Client Methods (`/frontend/packages/api/src/client.ts`)

Added four new methods to the APIClient class:

- `requestModusign(contractId, data)` - Request electronic signature
- `getModusignStatus(contractId)` - Get current signature status
- `cancelModusign(contractId)` - Cancel signature request
- `downloadSignedDocument(contractId)` - Download signed document

### 3. Mock API Implementation (`/frontend/apps/admin/lib/mocks/mockApi.ts`)

Implemented mock versions of all Modusign methods for development and testing:

- Mock requests are stored in `modusignRequestsById` map
- Simulates the full signature workflow (sent, viewed, signed states)
- Returns realistic mock data for testing

### 4. ModusignModal Component (`/frontend/apps/admin/components/ModusignModal.tsx`)

Created a new modal component with the following features:

**Request Form:**
- Signer name input (required)
- Email input with validation (required)
- Phone number input (optional)
- Send electronic signature request

**Status Display:**
- Visual status indicators with icons and colors
- Detailed request information (signer, email, phone, dates)
- Status-specific messages and guidance
- Action buttons based on status

**Workflow States:**
- `pending` - Initial state
- `sent` - Email sent to signer
- `viewed` - Signer opened the document
- `signed` - Signature completed (can download)
- `rejected` - Signer rejected the contract
- `expired` - Request expired

**Features:**
- Auto-loads existing request status on open
- Inline error handling
- Loading states for async operations
- Cancel request functionality
- Download signed document when completed

### 5. Contracts Page Update (`/frontend/apps/admin/app/projects/[id]/contracts/page.tsx`)

Updated the contracts page with:

- Import of Stamp icon and ModusignModal component
- New state for modal visibility and selected contract
- "모두싸인 전자서명" button next to "서명 요청" for draft contracts
- Modal integration with contract refresh on success

## User Flow

1. **Request Signature:**
   - User clicks "모두싸인 전자서명" button on a draft contract
   - Modal opens with form to enter signer information
   - User fills in name, email (and optionally phone)
   - Click "전자서명 요청" to send

2. **Track Status:**
   - Modal automatically shows existing request status when reopened
   - Status updates as signer progresses through workflow
   - Visual indicators show current state

3. **Download Signed Document:**
   - Once status is "signed", download button appears
   - User can download the signed PDF document

4. **Cancel Request:**
   - For "sent" or "viewed" status, user can cancel the request
   - Confirmation dialog prevents accidental cancellation

## API Endpoints

The following API endpoints should be implemented in the backend:

```
POST   /contracts/:contractId/modusign/request
GET    /contracts/:contractId/modusign/status
POST   /contracts/:contractId/modusign/cancel
GET    /contracts/:contractId/modusign/download
```

## UI/UX Design

- Uses existing @sigongon/ui components (Modal, Input, Button, Badge)
- Consistent with SigongOn design system
- Korean language throughout
- Color-coded status indicators
- Clear error messages
- Loading states for better UX

## Testing

Mock API is fully functional for testing all workflows:
- Create electronic signature request
- Check status updates
- Cancel requests
- Download signed documents

## Future Enhancements

Potential improvements for future iterations:

1. Real-time status updates (webhooks or polling)
2. Bulk signature requests for multiple contracts
3. Signature reminder emails
4. Signature history/audit log
5. Custom email templates
6. Support for multiple signers
7. Document expiration customization

## Related Files

### Modified Files:
- `/frontend/packages/types/src/index.ts`
- `/frontend/packages/api/src/client.ts`
- `/frontend/apps/admin/lib/mocks/mockApi.ts`
- `/frontend/apps/admin/app/projects/[id]/contracts/page.tsx`

### New Files:
- `/frontend/apps/admin/components/ModusignModal.tsx`

## Notes

- All UI text is in Korean as per project requirements
- Follows existing code patterns and conventions
- Uses @sigongon/ui component library
- Mock API simulates realistic workflows for development
- Ready for backend integration
