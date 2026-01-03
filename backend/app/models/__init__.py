# Models package - Export all models
from app.models.base import BaseModel, TimestampMixin
from app.models.user import Organization, User, UserRole
from app.models.project import Project, ProjectStatus, SiteVisit, VisitType, Photo, PhotoType
from app.models.diagnosis import AIDiagnosis, DiagnosisStatus, AIMaterialSuggestion, MatchMethod
from app.models.pricebook import (
    Pricebook, 
    PricebookRevision, 
    RevisionStatus,
    CatalogItem, 
    ItemType,
    CatalogItemPrice,
    CatalogItemAlias,
    AliasSource
)
from app.models.estimate import Estimate, EstimateStatus, EstimateLine, LineSource
from app.models.contract import Contract, ContractStatus, LaborContract, LaborContractStatus
from app.models.rag import DocumentChunk
from app.models.price_staging import PriceStaging, StagingStatus, ConfidenceLevel

__all__ = [
    # Base
    "BaseModel",
    "TimestampMixin",
    # User
    "Organization",
    "User", 
    "UserRole",
    # Project
    "Project",
    "ProjectStatus",
    "SiteVisit",
    "VisitType",
    "Photo",
    "PhotoType",
    # Diagnosis
    "AIDiagnosis",
    "DiagnosisStatus",
    "AIMaterialSuggestion",
    "MatchMethod",
    # Pricebook
    "Pricebook",
    "PricebookRevision",
    "RevisionStatus",
    "CatalogItem",
    "ItemType",
    "CatalogItemPrice",
    "CatalogItemAlias",
    "AliasSource",
    # Estimate
    "Estimate",
    "EstimateStatus",
    "EstimateLine",
    "LineSource",
    # Contract
    "Contract",
    "ContractStatus",
    "LaborContract",
    "LaborContractStatus",
    # RAG
    "DocumentChunk",
    # Price Staging
    "PriceStaging",
    "StagingStatus",
    "ConfidenceLevel",
]
