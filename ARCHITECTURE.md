# Technical Design Document (TDD): Yunigreen SaaS

## 1. Project Overview

### Goal
Yunigreen SaaS is a comprehensive platform designed to streamline leak diagnosis and construction management for Yunigreen. It automates the complex process of site diagnosis, cost estimation, and contract management.

### Target Users
- **Field Technicians:** Use the Mobile Web/App for on-site diagnosis, photo uploads, and material listing.
- **Admins/Managers:** Use the Web Dashboard for project oversight, estimate approval, and labor management.

### Key Value Proposition
- **Automated AI Diagnosis:** Leveraging Gemini 3.0 Flash to analyze leak photos and provide professional opinions.
- **Instant Accurate Estimation:** Deterministic cost calculation based on digitized standard price books.
- **Integrated Management:** Seamless flow from diagnosis to contract signing and operational logging.

---

## 2. System Architecture

### Technology Stack
- **Frontend:** Next.js 15 (React 19, TypeScript, Tailwind CSS)
  - Responsive design optimized for both mobile (technicians) and desktop (admins).
- **Backend:** Python FastAPI
  - Asynchronous processing, Pydantic for data validation, SQLModel for ORM.
- **Database:** PostgreSQL with `pgvector` extension
  - Stores relational project data and vector embeddings for RAG.
- **AI Engine:** Google Gemini 3.0 Flash
  - Used for image analysis and generating structured JSON outputs.
- **Infrastructure:** Docker Compose
  - Containerized services for easy deployment and local development.

---

## 3. Core Data Strategy (The Hybrid Approach)

To ensure both mathematical precision and intelligent information retrieval, Yunigreen uses a hybrid data strategy.

### A. Estimation (Relational Database)
- **Source:** 'Comprehensive Estimation Info' (종합적산정보) PDFs.
- **Method:** Tables are extracted from PDFs and stored in structured SQL tables.
- **Logic:** `Total Cost = Σ (Quantity * Unit Price)`. All math is performed deterministically in the backend.
- **Versioning:** `PricebookRevision` system (e.g., '2025-H1') allows projects to maintain pricing consistency even when master price books are updated.

### B. Construction Guidelines (RAG - Retrieval-Augmented Generation)
- **Source:** Unstructured text, specs, and safety commentary in PDFs.
- **Method:** Content is chunked, converted into embeddings, and stored in `pgvector`.
- **Usage:** Provides context-aware construction methods and warnings (e.g., "Add 5% labor cost for 10th floor+").

---

## 4. Detailed Workflows

### Step 1: Site Visit & Diagnosis
1. Technician uploads site photos via the mobile interface.
2. Backend sends photos to **Gemini 3.0 Flash**.
3. AI returns a structured JSON containing:
   - Leak Opinion (Cause and location)
   - Suggested Material List (Standardized names)

### Step 2: Estimation
1. System maps the AI-suggested materials to the `MaterialItem` in the database.
2. A draft estimate is generated using current `PricebookRevision` rates.
3. Manager reviews and edits the quantities or items in the dashboard.

### Step 3: Contract
1. Finalized estimate is converted into a digital contract.
2. Parties sign via an integrated electronic signature module.

### Step 4: Operations & Logging
1. **Labor Management:** Daily logs for labor contracts and attendance.
2. **Photo Logs:** Systematic storage of "Before," "During," and "After" construction photos for quality assurance.

---

## 5. Database Schema (High-Level)

- **`User`:** Auth and role management (Tech, Admin).
- **`Project`:** Master entity for a specific construction site.
- **`Pricebook`:** Master catalog of material and labor categories.
- **`PricebookRevision`:** Temporal snapshot of prices (e.g., 2025 Standard Prices).
- **`MaterialItem`:** Specific items with unit prices linked to a revision.
- **`Estimate`:** Linked to a Project, contains multiple LineItems.
- **`Contract`:** Legal entity linked to an Estimate.

---

## 6. Directory Structure

```text
/
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/        # API Endpoints
│   │   ├── core/       # Config, security
│   │   ├── models/     # SQLModel definitions
│   │   ├── services/   # Business logic (AI, RAG)
│   │   └── main.py
│   └── Dockerfile
├── frontend/           # Next.js application
│   ├── app/            # App Router pages
│   ├── components/     # UI Components
│   ├── lib/            # Utilities & API clients
│   └── Dockerfile
├── data/               # PDF source files for processing
└── docker-compose.yml  # Orchestration
```
