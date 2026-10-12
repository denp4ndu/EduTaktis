-- 0001_initial_schema.sql
-- Base tables for EduTaktis LMS transactional persistence layer

CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_accounts (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    actor_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version_number INT NOT NULL DEFAULT 1,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES user_accounts(user_id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    attendance_session_id VARCHAR(50) PRIMARY KEY,
    academic_year_id VARCHAR(50) NOT NULL,
    semester_id VARCHAR(50) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    course_period_id VARCHAR(50) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL,
    session_date VARCHAR(20) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
    attendance_record_id VARCHAR(50) PRIMARY KEY,
    attendance_session_id VARCHAR(50) NOT NULL REFERENCES attendance_sessions(attendance_session_id),
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
    assessment_id VARCHAR(50) PRIMARY KEY,
    assignment_id VARCHAR(50) NOT NULL,
    activity_id VARCHAR(50) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    max_score INT NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_submissions (
    submission_id VARCHAR(50) PRIMARY KEY,
    assessment_id VARCHAR(50) NOT NULL REFERENCES assessments(assessment_id),
    student_id VARCHAR(50) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL,
    raw_score INT NOT NULL,
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    recipient_id VARCHAR(50) NOT NULL,
    trigger VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    recipient_id VARCHAR(50) PRIMARY KEY,
    preferences_json TEXT NOT NULL,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS guardians (
    guardian_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES user_accounts(user_id),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS guardian_student_relationships (
    relationship_id VARCHAR(50) PRIMARY KEY,
    guardian_id VARCHAR(50) NOT NULL REFERENCES guardians(guardian_id),
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS message_threads (
    thread_id VARCHAR(50) PRIMARY KEY,
    institution_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    message_id VARCHAR(50) PRIMARY KEY,
    thread_id VARCHAR(50) NOT NULL REFERENCES message_threads(thread_id),
    sender_id VARCHAR(50) NOT NULL,
    recipient_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS guidance_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    counselor_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS guidance_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL REFERENCES guidance_cases(case_id),
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS intervention_plans (
    plan_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL REFERENCES guidance_cases(case_id),
    details TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS follow_ups (
    follow_up_id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL REFERENCES intervention_plans(plan_id),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS behavior_events (
    event_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS discipline_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS disciplinary_actions (
    action_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL REFERENCES discipline_cases(case_id),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS security_audit_events (
    id VARCHAR(50) PRIMARY KEY,
    institution_id VARCHAR(50),
    actor_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT NOT NULL,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    publication_id VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_progress (
    progress_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    publication_id VARCHAR(50) NOT NULL,
    activity_id VARCHAR(50) NOT NULL,
    progress_percent INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS class_enrollments (
    enrollment_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS academic_years (
    academic_year_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS semesters (
    semester_id VARCHAR(50) PRIMARY KEY,
    academic_year_id VARCHAR(50) NOT NULL REFERENCES academic_years(academic_year_id),
    code VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS academic_calendars (
    calendar_id VARCHAR(50) PRIMARY KEY,
    semester_id VARCHAR(50) NOT NULL REFERENCES semesters(semester_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS course_periods (
    course_period_id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL,
    academic_year_id VARCHAR(50) NOT NULL REFERENCES academic_years(academic_year_id),
    semester_id VARCHAR(50) NOT NULL REFERENCES semesters(semester_id),
    teacher_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(100) NOT NULL
);
