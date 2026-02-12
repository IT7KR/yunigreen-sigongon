__all__ = [
    "DiagnosisService",
    "EstimationService",
    "HwpxTemplateEngine",
    "RAGService",
    "HarnessService",
]


def __getattr__(name: str):
    if name == "DiagnosisService":
        from app.services.diagnosis import DiagnosisService

        return DiagnosisService
    if name == "EstimationService":
        from app.services.estimation import EstimationService

        return EstimationService
    if name == "HwpxTemplateEngine":
        from app.services.hwpx_template_engine import HwpxTemplateEngine

        return HwpxTemplateEngine
    if name == "RAGService":
        from app.services.rag import RAGService

        return RAGService
    if name == "HarnessService":
        from app.services.harness import HarnessService

        return HarnessService
    raise AttributeError(f"module 'app.services' has no attribute '{name}'")
