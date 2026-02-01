# ConstructionReport Models Documentation

## Overview

The ConstructionReport models manage two types of official construction reports in the Korean construction workflow:

1. **착공계 (Start Report)** - Filed when construction begins
2. **준공계 (Completion Report)** - Filed when construction is completed

## Models

### Enums

#### ReportType
```python
class ReportType(str, Enum):
    START = "start"          # 착공계
    COMPLETION = "completion"  # 준공계
```

#### ReportStatus
```python
class ReportStatus(str, Enum):
    DRAFT = "draft"          # Initial state, editable
    SUBMITTED = "submitted"  # Submitted for approval
    APPROVED = "approved"    # Approved by authority
    REJECTED = "rejected"    # Rejected, needs revision
```

### Database Models

#### ConstructionReport (table=True)

Main model for both start and completion reports.

**Common Fields:**
- `id`: UUID primary key
- `project_id`: Foreign key to project
- `report_type`: ReportType enum
- `report_number`: Auto-generated unique identifier
- `status`: ReportStatus enum
- `notes`: Optional notes

**착공계 (Start Report) Fields:**
- `construction_name`: 공사명 (Construction name)
- `site_address`: 현장주소 (Site address)
- `start_date`: 착공일 (Construction start date)
- `expected_end_date`: 예정 준공일 (Expected completion date)
- `supervisor_name`: 현장 책임자 (Site supervisor name)
- `supervisor_phone`: Supervisor phone number

**준공계 (Completion Report) Fields:**
- `actual_end_date`: 실제 준공일 (Actual completion date)
- `final_amount`: 최종 공사금액 (Final construction amount)
- `defect_warranty_period`: 하자보수 기간 (Defect warranty period in months)

**Timestamps:**
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `submitted_at`: Submission timestamp
- `approved_at`: Approval timestamp

**Audit Fields:**
- `created_by`: User who created the report
- `approved_by`: User who approved the report

### Schemas

#### ConstructionReportCreate
Used when creating a new report (either start or completion).

**Required:**
- `project_id`
- `report_type`

**Optional (based on report type):**
- For START: `construction_name`, `site_address`, `start_date`, `expected_end_date`, `supervisor_name`, `supervisor_phone`
- For COMPLETION: `actual_end_date`, `final_amount`, `defect_warranty_period`

#### ConstructionReportRead
Used for API responses. Includes all fields from ConstructionReport.

#### ConstructionReportUpdate
Used for updating a report in DRAFT or REJECTED status.

**All fields optional:**
- Common: `notes`
- Start: All start-related fields
- Completion: All completion-related fields

#### ConstructionReportSubmit
Empty schema used for submission endpoint. Transitions report from DRAFT to SUBMITTED.

## Business Rules

### 1. Start Report Prerequisites
- **Only one start report per project**
- Can be created at any time after project creation
- Must include: `construction_name`, `start_date`
- Should include: `site_address`, `expected_end_date`, `supervisor_name`

### 2. Completion Report Prerequisites
- **CRITICAL:** Can only be created if:
  - A start report exists for the project
  - The start report status is APPROVED
- Must include: `actual_end_date`, `final_amount`
- Should include: `defect_warranty_period`

### 3. Status Workflow

```
DRAFT → SUBMITTED → APPROVED
   ↓                    ↑
   → REJECTED ─────────┘
```

**State Transitions:**
- `DRAFT` → `SUBMITTED`: Via submit endpoint
- `SUBMITTED` → `APPROVED`: By authorized user
- `SUBMITTED` → `REJECTED`: By authorized user (with rejection reason in notes)
- `REJECTED` → `SUBMITTED`: After making corrections

**Editing Rules:**
- Can only edit in `DRAFT` or `REJECTED` status
- Cannot edit `APPROVED` reports
- `SUBMITTED` reports can only be approved/rejected

### 4. Report Number Generation

Auto-generated when report is created:

```python
# Start Report Format:
SCR-YYYYMMDD-{project_id[:8]}
# Example: SCR-20260126-A1B2C3D4

# Completion Report Format:
CCR-YYYYMMDD-{project_id[:8]}
# Example: CCR-20260126-A1B2C3D4
```

## API Endpoints (Recommended)

### Create Report
```
POST /api/v1/projects/{project_id}/construction-reports
Body: ConstructionReportCreate
```

### Get Reports for Project
```
GET /api/v1/projects/{project_id}/construction-reports
Query params: ?report_type=start|completion
```

### Get Single Report
```
GET /api/v1/construction-reports/{report_id}
```

### Update Report
```
PATCH /api/v1/construction-reports/{report_id}
Body: ConstructionReportUpdate
```

### Submit Report
```
POST /api/v1/construction-reports/{report_id}/submit
Body: ConstructionReportSubmit
```

### Approve Report
```
POST /api/v1/construction-reports/{report_id}/approve
```

### Reject Report
```
POST /api/v1/construction-reports/{report_id}/reject
Body: { "reason": "..." }
```

## Validation Functions

Located in `construction_report_validation.py`:

### validate_completion_report_prerequisites(project_id, session)
Checks if completion report can be created:
- Start report exists
- Start report is approved

### validate_start_report_uniqueness(project_id, session)
Ensures only one start report per project.

### validate_report_fields_by_type(...)
Validates required fields based on report type.

### generate_report_number(report_type, project_id, created_at)
Generates unique report number.

## Usage Examples

### Creating a Start Report (착공계)

```python
from app.models.construction_report import (
    ConstructionReportCreate,
    ReportType
)
from datetime import date

report_data = ConstructionReportCreate(
    project_id=project_uuid,
    report_type=ReportType.START,
    construction_name="신축 아파트 방수공사",
    site_address="서울시 강남구 테헤란로 123",
    start_date=date(2026, 1, 27),
    expected_end_date=date(2026, 3, 15),
    supervisor_name="김철수",
    supervisor_phone="010-1234-5678",
    notes="1차 착공"
)
```

### Creating a Completion Report (준공계)

```python
from decimal import Decimal

# First, validate prerequisites
validate_completion_report_prerequisites(project_uuid, session)

report_data = ConstructionReportCreate(
    project_id=project_uuid,
    report_type=ReportType.COMPLETION,
    actual_end_date=date(2026, 3, 20),
    final_amount=Decimal("15000000.00"),
    defect_warranty_period=36,  # 3 years in months
    notes="정상 준공"
)
```

### Workflow Example

```python
# 1. Create start report
start_report = create_start_report(project_id, start_data)

# 2. Submit for approval
submit_report(start_report.id)

# 3. Approve
approve_report(start_report.id, approver_user_id)

# 4. Later, create completion report
completion_report = create_completion_report(project_id, completion_data)

# 5. Submit and approve completion
submit_report(completion_report.id)
approve_report(completion_report.id, approver_user_id)
```

## Database Migration

When adding this model to your database, run:

```bash
alembic revision --autogenerate -m "Add construction_report table"
alembic upgrade head
```

## Integration with Project Workflow

The ConstructionReport model integrates with the project lifecycle:

1. **Project Created** → Status: DRAFT
2. **Start Report Created** → Status: DIAGNOSING/ESTIMATING
3. **Start Report Approved** → Status: CONTRACTED
4. **Construction Begins** → Status: IN_PROGRESS
5. **Completion Report Created** → Status: IN_PROGRESS
6. **Completion Report Approved** → Status: COMPLETED
7. **(Optional) After completion + warranty_period** → Status: WARRANTY

## Permission Requirements

### Create Report
- Role: SITE_MANAGER, COMPANY_ADMIN
- Scope: Same organization as project

### Submit Report
- Role: SITE_MANAGER, COMPANY_ADMIN
- Condition: Report status must be DRAFT or REJECTED

### Approve/Reject Report
- Role: COMPANY_ADMIN or SUPER_ADMIN
- Condition: Report status must be SUBMITTED

### View Reports
- Role: Any role associated with the project's organization
- Workers: Can view reports for projects they're assigned to

## Notes

- All date fields use Python's `date` type (not `datetime`)
- `final_amount` uses `Decimal` for precision in financial calculations
- `defect_warranty_period` is stored in months (typically 36 for 3 years)
- The model uses soft validation - fields are optional at DB level but validated at application level based on report_type
- Report numbers are indexed for fast lookups
- Created_by is mandatory (tracks who initiated the report)
- Approved_by is optional (only set when status moves to APPROVED)

## Future Enhancements

Potential additions:
- Attachment support (scan of physical documents)
- Multi-level approval workflow
- Notification system for status changes
- Integration with government reporting systems
- PDF generation from report data
- Digital signature support
