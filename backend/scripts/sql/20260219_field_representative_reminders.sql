-- 2026-02-19
-- 현장대리인 자동연동 플래그 + 경력증명서 리마인더 로그 스키마
-- NOTE: 프로젝트 정책상 FK는 추가하지 않습니다.

ALTER TABLE construction_report
ADD COLUMN IF NOT EXISTS auto_link_representative_docs BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS field_representative_career_reminder_log (
  id BIGINT PRIMARY KEY,
  representative_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  reminder_stage VARCHAR(32) NOT NULL,
  target_date DATE NOT NULL,
  remaining_days INTEGER NOT NULL DEFAULT 0,
  in_app_sent BOOLEAN NOT NULL DEFAULT FALSE,
  alimtalk_sent BOOLEAN NOT NULL DEFAULT FALSE,
  alimtalk_error TEXT,
  sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rep_career_reminder_once
  ON field_representative_career_reminder_log (representative_id, reminder_stage, target_date);

CREATE INDEX IF NOT EXISTS idx_field_rep_reminder_rep_id
  ON field_representative_career_reminder_log (representative_id);

CREATE INDEX IF NOT EXISTS idx_field_rep_reminder_org_id
  ON field_representative_career_reminder_log (organization_id);

CREATE INDEX IF NOT EXISTS idx_field_rep_reminder_target_date
  ON field_representative_career_reminder_log (target_date);
