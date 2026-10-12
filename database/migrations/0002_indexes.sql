-- 0002_indexes.sql
-- Optimizing lookup structures on search indexes and foreign key references

CREATE INDEX IF NOT EXISTS idx_user_accounts_actor_id ON user_accounts(actor_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_student ON attendance_records(attendance_session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_assess_student ON student_submissions(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_guardian_student ON guardian_student_relationships(guardian_id, student_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_guidance_cases_student_counselor ON guidance_cases(student_id, counselor_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_student ON behavior_events(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_cases_student ON discipline_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_events_inst_actor ON security_audit_events(institution_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_session_activity ON student_progress(session_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_class ON class_enrollments(student_id, class_id);
