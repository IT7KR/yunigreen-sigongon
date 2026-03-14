export interface LegalSubsection {
  title: string;
  content: string[];
}

export interface LegalSection {
  id: string;           // anchor ID e.g. "article-1"
  title: string;        // e.g. "제1조 (목적)"
  content: string[];    // body paragraphs array
  subsections?: LegalSubsection[];
}

export interface LegalDocument {
  version: number;
  effectiveDate: string;
  title: string;
  subtitle?: string;
  sections: LegalSection[];
}
