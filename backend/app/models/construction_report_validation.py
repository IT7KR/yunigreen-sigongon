"""Validation logic for ConstructionReport models."""
from typing import Optional
from app.models.construction_report import ReportType, ConstructionReport


class ConstructionReportValidationError(Exception):
    """Custom exception for construction report validation errors."""
    pass


def validate_completion_report_prerequisites(
    project_id: str,
    session  # SQLModel Session
) -> None:
    """
    Validate that a completion report can be created for the given project.

    Business Rule:
    - A completion report (준공계) can only be created if a start report (착공계)
      exists and is approved for the project.

    Args:
        project_id: The project ID to validate
        session: Database session

    Raises:
        ConstructionReportValidationError: If prerequisites are not met
    """
    from app.models.construction_report import ReportStatus

    # Check if start report exists and is approved
    start_report = session.query(ConstructionReport).filter(
        ConstructionReport.project_id == project_id,
        ConstructionReport.report_type == ReportType.START
    ).first()

    if not start_report:
        raise ConstructionReportValidationError(
            "Cannot create completion report: No start report exists for this project"
        )

    if start_report.status != ReportStatus.APPROVED:
        raise ConstructionReportValidationError(
            f"Cannot create completion report: Start report status is '{start_report.status}', "
            f"must be 'approved'"
        )


def validate_start_report_uniqueness(
    project_id: str,
    session  # SQLModel Session
) -> None:
    """
    Validate that only one start report exists per project.

    Args:
        project_id: The project ID to validate
        session: Database session

    Raises:
        ConstructionReportValidationError: If a start report already exists
    """
    existing_start_report = session.query(ConstructionReport).filter(
        ConstructionReport.project_id == project_id,
        ConstructionReport.report_type == ReportType.START
    ).first()

    if existing_start_report:
        raise ConstructionReportValidationError(
            "Cannot create start report: A start report already exists for this project"
        )


def validate_report_fields_by_type(
    report_type: ReportType,
    construction_name: Optional[str],
    start_date: Optional[str],
    actual_end_date: Optional[str],
    final_amount: Optional[float]
) -> None:
    """
    Validate that required fields are present based on report type.

    Args:
        report_type: Type of report (start or completion)
        construction_name: Construction name (required for start report)
        start_date: Start date (required for start report)
        actual_end_date: Actual end date (required for completion report)
        final_amount: Final amount (required for completion report)

    Raises:
        ConstructionReportValidationError: If required fields are missing
    """
    if report_type == ReportType.START:
        if not construction_name:
            raise ConstructionReportValidationError(
                "construction_name is required for start reports"
            )
        if not start_date:
            raise ConstructionReportValidationError(
                "start_date is required for start reports"
            )

    elif report_type == ReportType.COMPLETION:
        if not actual_end_date:
            raise ConstructionReportValidationError(
                "actual_end_date is required for completion reports"
            )
        if not final_amount:
            raise ConstructionReportValidationError(
                "final_amount is required for completion reports"
            )


def generate_report_number(
    report_type: ReportType,
    project_id: str,
    created_at
) -> str:
    """
    Generate a unique report number.

    Format:
    - Start Report: SCR-YYYYMMDD-{project_id[:8]}
    - Completion Report: CCR-YYYYMMDD-{project_id[:8]}

    Args:
        report_type: Type of report
        project_id: Project UUID
        created_at: Creation datetime

    Returns:
        Generated report number
    """
    prefix = "SCR" if report_type == ReportType.START else "CCR"
    date_str = created_at.strftime("%Y%m%d")
    project_short = str(project_id)[:8].upper()

    return f"{prefix}-{date_str}-{project_short}"
