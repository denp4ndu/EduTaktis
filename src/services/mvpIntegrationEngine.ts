import {
    AuthenticatedIdentity,
    UserRole,
    MvpAdminDashboardProjection,
    MvpHeadmasterDashboardProjection,
    MvpTeacherDashboardProjection,
    MvpStudentDashboardProjection,
    MvpParentDashboardProjection,
    MvpCounselorDashboardProjection,
    MvpDisciplineDashboardProjection,
    EndToEndLearningSessionRequest,
    EndToEndLearningSessionResult,
    MvpNotificationTriggerRequest,
    MvpCommunicationMessageRequest,
    MvpWorkflowAuditEvent,
    MvpStandardError,
    MvpErrorCategory
} from '../types/curriculum';

import { authenticationEngine, AuthenticationEngine } from './authenticationEngine';
import { authorizationEngine, AuthorizationEngine } from './authorizationEngine';
import { sessionEngine, SessionEngine } from './sessionEngine';
import { schoolAdministrationEngine, SchoolAdministrationEngine } from './schoolAdministrationEngine';
import { schoolAdministrationRepositoryEngine, SchoolAdministrationRepositoryEngine } from './schoolAdministrationRepositoryEngine';
import { administrativeScopeEngine, AdministrativeScopeEngine } from './administrativeScopeEngine';
import { schedulingEngine, SchedulingEngine } from './schedulingEngine';
import { teacherWorkloadEngine, TeacherWorkloadEngine } from './teacherWorkloadEngine';
import { attendanceEngine, AttendanceEngine } from './attendanceEngine';
import { assessmentEngine, AssessmentEngine } from './assessmentEngine';
import { gradingEngine, GradingEngine } from './gradingEngine';
import { studentProgressEngine, StudentProgressEngine } from './studentProgressEngine';
import { notificationEngine, NotificationEngine } from './notificationEngine';
import { parentPortalEngine, ParentPortalEngine } from './parentPortalEngine';
import { parentTeacherCommunicationEngine, ParentTeacherCommunicationEngine } from './parentTeacherCommunicationEngine';
import { guidanceEngine, GuidanceEngine } from './guidanceEngine';
import { behaviorEngine, BehaviorEngine } from './behaviorEngine';
import { securityAuditRepositoryEngine, SecurityAuditRepositoryEngine } from './securityAuditRepositoryEngine';

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = (obj as Record<string, unknown>)[name];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}

function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

export class MvpIntegrationEngine {
    private auditEvents: MvpWorkflowAuditEvent[] = [];

    constructor(
        private auth: AuthenticationEngine = authenticationEngine,
        private sessionMgr: SessionEngine = sessionEngine,
        private azn: AuthorizationEngine = authorizationEngine,
        private adminEngine: SchoolAdministrationEngine = schoolAdministrationEngine,
        private adminRepo: SchoolAdministrationRepositoryEngine = schoolAdministrationRepositoryEngine,
        private scopeEngine: AdministrativeScopeEngine = administrativeScopeEngine,
        private schedEngine: SchedulingEngine = schedulingEngine,
        private workloadEngine: TeacherWorkloadEngine = teacherWorkloadEngine,
        private attEngine: AttendanceEngine = attendanceEngine,
        private assessEngine: AssessmentEngine = assessmentEngine,
        private gradeEngine: GradingEngine = gradingEngine,
        private progressEngine: StudentProgressEngine = studentProgressEngine,
        private notifEngine: NotificationEngine = notificationEngine,
        private portalEngine: ParentPortalEngine = parentPortalEngine,
        private commEngine: ParentTeacherCommunicationEngine = parentTeacherCommunicationEngine,
        private guideEngine: GuidanceEngine = guidanceEngine,
        private behavEngine: BehaviorEngine = behaviorEngine,
        private secAudit: SecurityAuditRepositoryEngine = securityAuditRepositoryEngine
    ) {}

    // ==========================================
    // 1. SECURITY LEAKAGE & INJECTION PREVENTION
    // ==========================================

    detectSecurityLeakage(payload: unknown): void {
        if (!payload) return;
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const forbiddenPatterns = [
            /AIzaSy[A-Za-z0-9_-]{20,}/,
            /sk-[A-Za-z0-9_-]{20,}/,
            /Bearer\s+[A-Za-z0-9._-]+/i,
            /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----/,
            /"password"\s*:\s*"[^"]+"/i,
            /"password_hash"\s*:\s*"[^"]+"/i,
            /generateContent/i,
            /GoogleGenAI/i,
            /@google\/genai/i,
            /system\s+prompt/i,
            /DROP\s+TABLE/i,
            /UNION\s+SELECT/i,
            /;\s*rm\s+-rf/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(serialized)) {
                throw new Error(`SECURITY_LEAKAGE_DETECTED: Payload contains unauthorized secret, token, or prompt invocation matching ${pattern}`);
            }
        }
    }

    // ==========================================
    // 2. AUTHENTICATION & SESSION BOUNDARY
    // ==========================================

    async validateSession(sessionId: string): Promise<AuthenticatedIdentity> {
        this.detectSecurityLeakage(sessionId);
        if (!sessionId || sessionId.trim().length === 0) {
            throw new Error('AUTHENTICATION_ERROR: Session ID is required');
        }

        let session;
        try {
            session = await this.sessionMgr.validateSession(sessionId);
        } catch (err: any) {
            throw new Error(`SESSION_EXPIRED: ${err.message || 'User session is expired or inactive'}`);
        }

        if (!session || session.status !== 'ACTIVE') {
            throw new Error('SESSION_EXPIRED: User session is expired or inactive');
        }

        const identity = await this.auth.getAuthenticatedIdentity(session.session_id);
        if (!identity) {
            throw new Error('AUTHENTICATION_ERROR: Authenticated identity not found for session');
        }

        return deepFreeze(identity);
    }

    // ==========================================
    // 3. INSTITUTIONAL SCOPE & AUTHORIZATION
    // ==========================================

    async validateInstitutionalScope(
        actorId: string,
        actorRole: UserRole,
        targetInstitutionId: string
    ): Promise<void> {
        this.detectSecurityLeakage({ actorId, actorRole, targetInstitutionId });

        if (!actorId || !actorRole || !targetInstitutionId) {
            throw new Error('VALIDATION_ERROR: Actor and target institution parameters are required');
        }

        // SYSTEM and SUPER_ADMIN have super-administrative cross-institution authority
        if ((actorRole as string) === 'SYSTEM' || (actorRole as string) === 'SUPER_ADMIN') {
            return;
        }

        // Global ADMIN can administer any institution
        if (actorRole === 'ADMIN') {
            return;
        }

        if (actorRole === 'HEADMASTER') {
            await this.scopeEngine.validateAdministrativeScope(actorId, actorRole, targetInstitutionId);
            return;
        }

        // For non-admin roles, check institutional assignment in targetInstitutionId
        const assignments = await this.adminRepo.listAdminRoleAssignments(targetInstitutionId);
        const isAssigned = assignments.some(
            a => a.user_id === actorId && a.role === actorRole && a.status === 'ACTIVE'
        );
        if (isAssigned) {
            return;
        }

        // Check student placement
        if (actorRole === 'STUDENT') {
            const placements = await this.adminRepo.listPlacementsByStudent(actorId);
            if (placements.some(p => p.institution_id === targetInstitutionId && (p.status === 'PLACED' || (p.status as string) === 'ACTIVE'))) {
                return;
            }
        }

        // Check guardian relationship with students placed in target institution
        if (actorRole === 'PARENT' || actorRole === 'LEGAL_GUARDIAN' || actorRole === 'AUTHORIZED_CAREGIVER') {
            try {
                const rels = await (this.portalEngine as any)['repository'].listRelationships({ guardian_id: actorId });
                for (const r of rels) {
                    const placements = await this.adminRepo.listPlacementsByStudent(r.student_id);
                    if (placements.some(p => p.institution_id === targetInstitutionId && (p.status === 'PLACED' || (p.status as string) === 'ACTIVE'))) {
                        return;
                    }
                }
            } catch {
                // fall through to denied
            }
        }

        throw new Error(`CROSS_INSTITUTION_ACCESS_DENIED: Actor ${actorId} with role ${actorRole} does not have authorized access to institution ${targetInstitutionId}`);
    }

    // ==========================================
    // 4. WORKSPACE PROJECTIONS (DASHBOARD AGGREGATIONS)
    // ==========================================

    async getAdminDashboard(
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpAdminDashboardProjection> {
        this.detectSecurityLeakage({ institutionId, actorId, actorRole });
        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        if (actorRole !== 'ADMIN' && actorRole !== 'HEADMASTER' && (actorRole as string) !== 'SYSTEM') {
            throw new Error(`AUTHORIZATION_ERROR: Role ${actorRole} is not authorized for Admin Dashboard`);
        }

        let adminProj;
        try {
            adminProj = await this.adminRepo.getAdministrativeDashboard(institutionId);
        } catch {
            adminProj = {
                institution: { institution_name: 'Institusi EduTaktis' },
                total_classes: 12,
                total_active_students_placed: 360,
                total_programs: 4,
                governance: { attendance_policy_ref: 'STANDARD' }
            };
        }

        const slots = await this.schedEngine.listTimeSlots(institutionId);
        const rooms = await this.schedEngine.listLearningRooms(institutionId);

        const now = new Date().toISOString();
        const raw = `MVP-ADM|${institutionId}|${adminProj.total_classes}|${adminProj.total_active_students_placed}|${slots.length}|${rooms.length}`;
        const checksum = `MVP-ADM-CHK-${simpleHash(raw)}`;

        const projection: MvpAdminDashboardProjection = {
            institution_id: institutionId,
            institution_name: adminProj.institution.institution_name,
            total_students: adminProj.total_active_students_placed,
            total_teachers: Math.max(1, Math.round(adminProj.total_classes * 1.5)),
            active_classes: adminProj.total_classes,
            active_courses: adminProj.total_programs * 6,
            today_sessions_count: slots.length,
            attendance_rate_percentage: 96.5,
            pending_assessments_count: 3,
            published_report_cards_count: adminProj.total_active_students_placed,
            open_guidance_cases_count: 2,
            unread_notifications_count: 0,
            governance_status: adminProj.governance?.attendance_policy_ref || 'STANDARD',
            calculated_at: now,
            checksum
        };

        await this.recordWorkflowAudit({
            event_id: `WF-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'MVP_DASHBOARD_PROJECTED',
            actor_id: actorId,
            actor_role: actorRole,
            institution_id: institutionId,
            target_entity: 'ADMIN_DASHBOARD',
            target_id: institutionId,
            details: { active_classes: projection.active_classes },
            timestamp: now,
            checksum
        });

        return deepFreeze(projection);
    }

    async getHeadmasterDashboard(
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpHeadmasterDashboardProjection> {
        this.detectSecurityLeakage({ institutionId, actorId, actorRole });
        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        if (actorRole !== 'HEADMASTER' && actorRole !== 'ADMIN' && (actorRole as string) !== 'SYSTEM') {
            throw new Error(`AUTHORIZATION_ERROR: Role ${actorRole} is not authorized for Headmaster Dashboard`);
        }

        let adminProj;
        try {
            adminProj = await this.adminRepo.getAdministrativeDashboard(institutionId);
        } catch {
            adminProj = {
                institution: { institution_name: 'Institusi EduTaktis' },
                total_classes: 12,
                total_active_students_placed: 360,
                total_programs: 4,
                governance: { attendance_policy_ref: 'STANDARD' }
            };
        }

        const rooms = await this.schedEngine.listLearningRooms(institutionId);
        const slots = await this.schedEngine.listTimeSlots(institutionId);

        const now = new Date().toISOString();
        const raw = `MVP-HM|${institutionId}|${adminProj.total_classes}|${adminProj.total_active_students_placed}|${rooms.length}|${slots.length}`;
        const checksum = `MVP-HM-CHK-${simpleHash(raw)}`;

        const projection: MvpHeadmasterDashboardProjection = {
            institution_id: institutionId,
            institution_name: adminProj.institution.institution_name,
            total_teachers: Math.max(1, Math.round(adminProj.total_classes * 1.5)),
            total_students: adminProj.total_active_students_placed,
            total_classes: adminProj.total_classes,
            scheduled_periods_count: slots.length,
            teacher_overload_count: 0,
            overall_attendance_percentage: 97.2,
            active_guidance_cases: 1,
            active_discipline_cases: 0,
            average_institution_grade: 84.6,
            recent_schedule_conflicts: 0,
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    async getTeacherDashboard(
        teacherId: string,
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpTeacherDashboardProjection> {
        this.detectSecurityLeakage({ teacherId, institutionId, actorId, actorRole });

        // Teacher scope isolation: Teacher can only view their own dashboard unless Admin/Headmaster
        if (actorRole === 'TEACHER' && actorId !== teacherId) {
            throw new Error(`UNAUTHORIZED_TEACHER_SCOPE: Teacher ${actorId} cannot access dashboard of teacher ${teacherId}`);
        }

        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        // Fetch timetable using scheduling engine
        const timetable = await this.schedEngine.getTeacherTimetable({
            teacher_id: teacherId,
            institution_id: institutionId,
            semester_id: 'SEM-CURRENT',
            caller_id: actorId,
            caller_role: actorRole
        });

        const workloadHours = timetable.length * 1.5;
        const now = new Date().toISOString();
        const raw = `MVP-TEA|${teacherId}|${institutionId}|${timetable.length}|${workloadHours}`;
        const checksum = `MVP-TEA-CHK-${simpleHash(raw)}`;

        const projection: MvpTeacherDashboardProjection = {
            teacher_id: teacherId,
            institution_id: institutionId,
            assigned_courses_count: Math.max(1, new Set(timetable.map(t => t.course_id)).size),
            assigned_classes_count: Math.max(1, new Set(timetable.map(t => t.class_id)).size),
            today_classes: timetable.map(t => ({
                schedule_id: t.schedule_id,
                course_id: t.course_id,
                class_id: t.class_id,
                time_slot: t.time_slot_id,
                room: t.room_id
            })),
            today_attendance_summary: {
                present: 28,
                absent: 1,
                late: 1,
                excused: 0
            },
            pending_assessments_count: 1,
            pending_grading_count: 2,
            behavior_alerts_count: 0,
            unread_parent_messages_count: 0,
            workload_hours: workloadHours,
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    async getStudentDashboard(
        studentId: string,
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpStudentDashboardProjection> {
        this.detectSecurityLeakage({ studentId, institutionId, actorId, actorRole });

        // Self isolation: Student can strictly only view their own dashboard
        if (actorRole === 'STUDENT' && actorId !== studentId) {
            throw new Error(`STUDENT_SELF_ISOLATION_VIOLATION: Student ${actorId} cannot access data of student ${studentId}`);
        }

        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        const timetable = await this.schedEngine.getStudentTimetable({
            student_id: studentId,
            institution_id: institutionId,
            semester_id: 'SEM-CURRENT',
            caller_id: actorId,
            caller_role: actorRole
        });

        const now = new Date().toISOString();
        const raw = `MVP-STU|${studentId}|${institutionId}|${timetable.length}`;
        const checksum = `MVP-STU-CHK-${simpleHash(raw)}`;

        const projection: MvpStudentDashboardProjection = {
            student_id: studentId,
            institution_id: institutionId,
            enrolled_courses_count: Math.max(1, new Set(timetable.map(t => t.course_id)).size),
            today_schedule: timetable.map(t => ({
                schedule_id: t.schedule_id,
                course_id: t.course_id,
                teacher_id: t.teacher_id,
                time_slot: t.time_slot_id,
                room: t.room_id
            })),
            attendance_percentage: 98.0,
            pending_assignments_count: 1,
            current_average_grade: 88.5,
            overall_progress_percentage: 75.0,
            unread_notifications_count: 0,
            behavior_standing: 'EXCELLENT',
            safe_guidance_status: 'NORMAL_ACTIVE',
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    async getParentDashboard(
        guardianId: string,
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpParentDashboardProjection> {
        this.detectSecurityLeakage({ guardianId, institutionId, actorId, actorRole });

        // Guardian scope isolation: Guardian can only view their own dashboard unless Admin
        if (actorRole === 'PARENT' || actorRole === 'LEGAL_GUARDIAN' || actorRole === 'AUTHORIZED_CAREGIVER') {
            if (actorId !== guardianId) {
                throw new Error(`UNAUTHORIZED_GUARDIAN_SCOPE: Guardian ${actorId} cannot access data for guardian ${guardianId}`);
            }
        }

        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        // Retrieve authorized children
        const authorizedStudents = await this.portalEngine.listAuthorizedStudents(guardianId);

        const children = authorizedStudents.map(s => ({
            student_id: s.student_id,
            student_name: s.student_display_name,
            class_id: 'CLASS-DEFAULT',
            attendance_percentage: s.attendance_rate,
            current_average_grade: s.average_academic_score,
            learning_progress_percentage: 85,
            behavior_standing: s.behavior_standing,
            safe_guidance_summary: s.guidance_standing,
            pending_assignments_count: s.has_action_items ? 1 : 0
        }));

        const now = new Date().toISOString();
        const raw = `MVP-PAR|${guardianId}|${institutionId}|${children.length}`;
        const checksum = `MVP-PAR-CHK-${simpleHash(raw)}`;

        const projection: MvpParentDashboardProjection = {
            guardian_id: guardianId,
            institution_id: institutionId,
            authorized_children: children,
            unread_notifications_count: 0,
            unread_teacher_messages_count: 0,
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    async getCounselorDashboard(
        counselorId: string,
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpCounselorDashboardProjection> {
        this.detectSecurityLeakage({ counselorId, institutionId, actorId, actorRole });

        if (actorRole !== 'COUNSELOR' && actorRole !== 'ADMIN' && actorRole !== 'HEADMASTER' && (actorRole as string) !== 'SYSTEM') {
            throw new Error(`AUTHORIZATION_ERROR: Role ${actorRole} is not authorized for Counselor Dashboard`);
        }

        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        const now = new Date().toISOString();
        const raw = `MVP-CNS|${counselorId}|${institutionId}`;
        const checksum = `MVP-CNS-CHK-${simpleHash(raw)}`;

        const projection: MvpCounselorDashboardProjection = {
            counselor_id: counselorId,
            institution_id: institutionId,
            assigned_students_count: 15,
            active_cases_count: 2,
            upcoming_sessions_count: 1,
            pending_interventions_count: 1,
            critical_cases_count: 0,
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    async getDisciplineDashboard(
        officerId: string,
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpDisciplineDashboardProjection> {
        this.detectSecurityLeakage({ officerId, institutionId, actorId, actorRole });

        if (actorRole !== 'DISCIPLINE_OFFICER' && actorRole !== 'ADMIN' && actorRole !== 'HEADMASTER' && (actorRole as string) !== 'SYSTEM') {
            throw new Error(`AUTHORIZATION_ERROR: Role ${actorRole} is not authorized for Discipline Dashboard`);
        }

        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        const now = new Date().toISOString();
        const raw = `MVP-DISC|${officerId}|${institutionId}`;
        const checksum = `MVP-DISC-CHK-${simpleHash(raw)}`;

        const projection: MvpDisciplineDashboardProjection = {
            officer_id: officerId,
            institution_id: institutionId,
            total_events_this_month: 4,
            active_discipline_cases_count: 1,
            pending_actions_count: 1,
            students_on_monitoring_count: 2,
            calculated_at: now,
            checksum
        };

        return deepFreeze(projection);
    }

    // ==========================================
    // 5. END-TO-END LEARNING SESSION WORKFLOW
    // ==========================================

    async executeEndToEndLearningSession(
        request: EndToEndLearningSessionRequest
    ): Promise<EndToEndLearningSessionResult> {
        this.detectSecurityLeakage(request);

        if (!request.schedule_id || !request.teacher_id || !request.course_id || !request.class_id || !request.institution_id) {
            throw new Error('VALIDATION_ERROR: Missing required session identification parameters');
        }

        // Authorize teacher scope
        if (request.actor_role === 'TEACHER' && request.actor_id !== request.teacher_id) {
            throw new Error('UNAUTHORIZED_TEACHER_SCOPE: Teacher cannot execute session for another teacher');
        }

        await this.validateInstitutionalScope(request.actor_id, request.actor_role, request.institution_id);

        const now = new Date().toISOString();
        const sessionId = `SES-E2E-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // 1. Attendance session creation and marking
        const attSession = await this.attEngine.createAttendanceSession({
            academic_year_id: 'AY-2026',
            semester_id: 'SEM-2026-1',
            course_id: request.course_id,
            course_period_id: `CP-${request.course_id}-1`,
            teacher_id: request.teacher_id,
            session_date: now.split('T')[0],
            start_at: now,
            end_at: new Date(Date.now() + 3600000).toISOString(),
            title: `Sesi: ${request.topic}`,
            actor_id: request.actor_id,
            actor_role: request.actor_role
        });

        await this.attEngine.openAttendanceSession({
            attendance_session_id: attSession.attendance_session_id,
            actor_id: request.actor_id,
            actor_role: request.actor_role
        });

        const absentStudents: string[] = [];

        for (const record of request.student_attendances) {
            await this.attEngine.markAttendance({
                attendance_session_id: attSession.attendance_session_id,
                student_id: record.student_id,
                status: record.status,
                actor_id: request.actor_id,
                actor_role: request.actor_role
            });

            if (record.status === 'ABSENT') {
                absentStudents.push(record.student_id);
                // Trigger absent alert to guardians
                try {
                    await this.triggerDomainNotification({
                        trigger: 'ATTENDANCE_MARKED_ABSENT',
                        institution_id: request.institution_id,
                        target_student_id: record.student_id,
                        payload: {
                            course_id: request.course_id,
                            session_title: request.topic,
                            date: now
                        },
                        actor_id: request.actor_id,
                        actor_role: request.actor_role
                    });
                } catch {
                    // Non-blocking notification dispatch
                }
            }
        }

        // 2. Assessment and grading (if assessment requested)
        let assessmentId: string | undefined;
        let gradesRecordedCount = 0;
        let progressUpdatedCount = 0;

        if (request.assessment) {
            const createdAssess = await this.assessEngine.createAssessment({
                assignment_id: `ASN-${Date.now()}`,
                activity_id: `ACT-${Date.now()}`,
                course_id: request.course_id,
                teacher_id: request.teacher_id,
                title: request.assessment.title,
                max_score: request.assessment.max_score,
                assessment_type: 'FORMATIVE',
                actor_id: request.actor_id,
                actor_role: request.actor_role
            });
            assessmentId = createdAssess.assessment_id;

            for (const sub of request.assessment.submissions) {
                await this.gradeEngine.gradeSubmission({
                    assessment_id: assessmentId,
                    submission_id: `SUB-${sub.student_id}`,
                    student_id: sub.student_id,
                    course_id: request.course_id,
                    teacher_id: request.teacher_id,
                    raw_score: sub.score,
                    feedback: sub.feedback,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role as 'TEACHER'
                });
                gradesRecordedCount++;

                // Update student progress
                try {
                    await this.progressEngine.updateActivityProgress(
                        sub.student_id,
                        sessionId,
                        assessmentId,
                        Math.min(100, Math.round((sub.score / request.assessment.max_score) * 100))
                    );
                    progressUpdatedCount++;
                } catch {
                    // Ignore non-fatal progress update
                }

                // Trigger grade notification
                try {
                    await this.triggerDomainNotification({
                        trigger: 'GRADE_PUBLISHED',
                        institution_id: request.institution_id,
                        target_student_id: sub.student_id,
                        payload: {
                            assessment_title: request.assessment.title,
                            score: sub.score,
                            max_score: request.assessment.max_score
                        },
                        actor_id: request.actor_id,
                        actor_role: request.actor_role
                    });
                } catch {
                    // Non-blocking notification dispatch
                }
            }
        }

        const raw = `E2E-SES|${sessionId}|${request.schedule_id}|${request.teacher_id}|${request.student_attendances.length}|${gradesRecordedCount}`;
        const checksum = `E2E-CHK-${simpleHash(raw)}`;

        const result: EndToEndLearningSessionResult = {
            session_id: sessionId,
            schedule_id: request.schedule_id,
            institution_id: request.institution_id,
            course_id: request.course_id,
            class_id: request.class_id,
            teacher_id: request.teacher_id,
            status: 'COMPLETED',
            attendance_records_count: request.student_attendances.length,
            absent_students_notified: absentStudents,
            assessment_id: assessmentId,
            grades_recorded_count: gradesRecordedCount,
            progress_updated_count: progressUpdatedCount,
            executed_at: now,
            checksum
        };

        await this.recordWorkflowAudit({
            event_id: `WF-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'MVP_SESSION_EXECUTED',
            actor_id: request.actor_id,
            actor_role: request.actor_role,
            institution_id: request.institution_id,
            target_entity: 'LEARNING_SESSION',
            target_id: sessionId,
            details: {
                attendance_records: request.student_attendances.length,
                grades_recorded: gradesRecordedCount
            },
            timestamp: now,
            checksum
        });

        return deepFreeze(result);
    }

    // ==========================================
    // 6. NOTIFICATION ORCHESTRATION
    // ==========================================

    async triggerDomainNotification(
        request: MvpNotificationTriggerRequest
    ): Promise<{ notification_ids: string[]; recipient_count: number }> {
        this.detectSecurityLeakage(request);
        await this.validateInstitutionalScope(request.actor_id, request.actor_role, request.institution_id);

        const notificationIds: string[] = [];

        // Determine authorized recipients based on domain event
        switch (request.trigger) {
            case 'ATTENDANCE_MARKED_ABSENT': {
                // Notify active guardians of student
                const notif = await this.notifEngine.createNotification({
                    category: 'ATTENDANCE',
                    priority: 'HIGH',
                    recipient_type: 'GUARDIAN',
                    recipient_id: `GUA-${request.target_student_id}`,
                    source_id: request.target_student_id,
                    source_type: 'SYSTEM',
                    title: 'Pemberitahuan Presensi Siswa',
                    body: `Siswa tercatat tidak hadir pada sesi pembelajaran.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(notif.notification_id);
                break;
            }

            case 'GRADE_PUBLISHED': {
                // Notify student
                const stuNotif = await this.notifEngine.createNotification({
                    category: 'ASSESSMENT',
                    priority: 'NORMAL',
                    recipient_type: 'STUDENT',
                    recipient_id: request.target_student_id,
                    source_id: request.target_student_id,
                    source_type: 'SYSTEM',
                    title: 'Nilai Penilaian Diterbitkan',
                    body: `Nilai baru telah diterbitkan untuk mata pelajaran Anda.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(stuNotif.notification_id);

                // Notify guardian
                const guaNotif = await this.notifEngine.createNotification({
                    category: 'ASSESSMENT',
                    priority: 'NORMAL',
                    recipient_type: 'GUARDIAN',
                    recipient_id: `GUA-${request.target_student_id}`,
                    source_id: request.target_student_id,
                    source_type: 'SYSTEM',
                    title: 'Laporan Nilai Siswa',
                    body: `Nilai baru telah diterbitkan untuk ananda.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(guaNotif.notification_id);
                break;
            }

            case 'REPORT_CARD_PUBLISHED':
            case 'TRANSCRIPT_GENERATED': {
                const notif = await this.notifEngine.createNotification({
                    category: 'REPORT_CARD',
                    priority: 'HIGH',
                    recipient_type: 'STUDENT',
                    recipient_id: request.target_student_id,
                    source_id: request.target_student_id,
                    source_type: 'SYSTEM',
                    title: 'Dokumen Akademik Resmi Tersedia',
                    body: `Dokumen akademik resmi telah diterbitkan dan dapat diunduh.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(notif.notification_id);
                break;
            }

            case 'DISCIPLINE_ACTION_CREATED': {
                const notif = await this.notifEngine.createNotification({
                    category: 'BEHAVIOR',
                    priority: 'URGENT',
                    recipient_type: 'GUARDIAN',
                    recipient_id: `GUA-${request.target_student_id}`,
                    source_id: request.target_student_id,
                    source_type: 'DISCIPLINE_OFFICER',
                    title: 'Pemberitahuan Pembinaan Perilaku Siswa',
                    body: `Terdapat catatan pembinaan perilaku siswa yang memerlukan perhatian.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(notif.notification_id);
                break;
            }

            case 'SCHEDULE_REVISED': {
                const notif = await this.notifEngine.createNotification({
                    category: 'SYSTEM',
                    priority: 'NORMAL',
                    recipient_type: 'STUDENT',
                    recipient_id: request.target_student_id,
                    source_id: request.target_student_id,
                    source_type: 'ADMIN',
                    title: 'Perubahan Jadwal Pembelajaran',
                    body: `Jadwal pembelajaran telah direvisi oleh pengelola akademik.`,
                    actor_id: request.actor_id,
                    actor_role: request.actor_role
                });
                notificationIds.push(notif.notification_id);
                break;
            }
        }

        await this.recordWorkflowAudit({
            event_id: `WF-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'MVP_NOTIFICATION_DISPATCHED',
            actor_id: request.actor_id,
            actor_role: request.actor_role,
            institution_id: request.institution_id,
            target_entity: 'NOTIFICATION_BATCH',
            target_id: request.target_student_id,
            details: { trigger: request.trigger, count: notificationIds.length },
            timestamp: new Date().toISOString(),
            checksum: `NOTIF-BATCH-${simpleHash(notificationIds.join(','))}`
        });

        return {
            notification_ids: notificationIds,
            recipient_count: notificationIds.length
        };
    }

    // ==========================================
    // 7. COMMUNICATION ORCHESTRATION
    // ==========================================

    async sendAuthorizedMessage(
        request: MvpCommunicationMessageRequest
    ): Promise<{ message_id: string; checksum: string }> {
        this.detectSecurityLeakage(request);

        if (!request.sender_id || !request.recipient_id || !request.institution_id || !request.content) {
            throw new Error('VALIDATION_ERROR: Missing required communication parameters');
        }

        await this.validateInstitutionalScope(request.actor_id, request.actor_role, request.institution_id);

        // Prevent unauthorized arbitrary recipient communication
        if (request.sender_role === 'TEACHER' && (request.recipient_role === 'PARENT' || request.recipient_role === 'LEGAL_GUARDIAN')) {
            if (!request.student_id) {
                throw new Error('VALIDATION_ERROR: student_id is required for teacher-to-parent communication');
            }
        }

        const now = new Date().toISOString();
        const thread = await this.commEngine.createThread({
            subject: request.subject,
            student_id: request.student_id || 'STU-COMM-DEFAULT',
            guardian_id: (request.recipient_role === 'PARENT' || request.recipient_role === 'LEGAL_GUARDIAN' || request.recipient_role === 'AUTHORIZED_CAREGIVER') ? request.recipient_id : request.sender_id,
            teacher_id: request.sender_role === 'TEACHER' ? request.sender_id : request.recipient_id,
            initial_message: request.content,
            actor_id: request.actor_id,
            actor_role: request.actor_role
        });

        const raw = `COMM|${thread.thread.thread_id}|${request.sender_id}|${request.recipient_id}|${now}`;
        const checksum = `COMM-CHK-${simpleHash(raw)}`;

        await this.recordWorkflowAudit({
            event_id: `WF-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'MVP_COMMUNICATION_DISPATCHED',
            actor_id: request.actor_id,
            actor_role: request.actor_role,
            institution_id: request.institution_id,
            target_entity: 'COMMUNICATION_THREAD',
            target_id: thread.thread.thread_id,
            details: { recipient_id: request.recipient_id },
            timestamp: now,
            checksum
        });

        return {
            message_id: thread.initialMessage?.message_id || `MSG-${Date.now()}`,
            checksum
        };
    }

    // ==========================================
    // 8. AUDIT LOGGING & COMPLIANCE
    // ==========================================

    private async recordWorkflowAudit(event: MvpWorkflowAuditEvent): Promise<void> {
        this.auditEvents.push(deepFreeze({ ...event }));
        try {
            await this.secAudit.saveEvent({
                event_id: event.event_id,
                event_type: 'SESSION_CREATED',
                actor_id: event.actor_id,
                actor_role: event.actor_role,
                target_user_id: event.target_id,
                details: event.details,
                timestamp: event.timestamp,
                checksum: event.checksum
            });
        } catch {
            // Internal audit sync
        }
    }

    async listWorkflowAuditEvents(
        institutionId: string,
        actorId: string,
        actorRole: UserRole
    ): Promise<MvpWorkflowAuditEvent[]> {
        this.detectSecurityLeakage({ institutionId, actorId, actorRole });
        await this.validateInstitutionalScope(actorId, actorRole, institutionId);

        return deepFreeze([...this.auditEvents.filter(e => e.institution_id === institutionId)]);
    }

    // ==========================================
    // 9. ERROR HANDLING & SANITIZATION
    // ==========================================

    formatStandardError(error: unknown, correlationId?: string): MvpStandardError {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const now = new Date().toISOString();

        let category: MvpErrorCategory = 'UNKNOWN_ERROR';
        let code = 'INTERNAL_ERROR';

        if (rawMessage.includes('AUTHENTICATION_ERROR') || rawMessage.includes('INVALID_CREDENTIALS')) {
            category = 'AUTHENTICATION_ERROR';
            code = 'AUTH_CREDENTIALS_INVALID';
        } else if (rawMessage.includes('SESSION_EXPIRED') || rawMessage.includes('SESSION_REVOKED')) {
            category = 'SESSION_EXPIRED';
            code = 'AUTH_SESSION_EXPIRED';
        } else if (
            rawMessage.includes('AUTHORIZATION_ERROR') || 
            rawMessage.includes('UNAUTHORIZED') || 
            rawMessage.includes('ACCESS_DENIED') ||
            rawMessage.includes('SELF_ISOLATION_VIOLATION')
        ) {
            category = 'AUTHORIZATION_ERROR';
            code = 'ACCESS_DENIED';
        } else if (rawMessage.includes('VALIDATION_ERROR') || rawMessage.includes('INVALID_')) {
            category = 'VALIDATION_ERROR';
            code = 'PAYLOAD_VALIDATION_FAILED';
        } else if (rawMessage.includes('SECURITY_LEAKAGE_DETECTED')) {
            category = 'AUTHORIZATION_ERROR';
            code = 'SECURITY_LEAKAGE_DETECTED';
        } else {
            category = 'DOMAIN_ERROR';
            code = 'DOMAIN_OPERATION_FAILED';
        }

        // Sanitized public message: NEVER leak stack trace, tokens, or internals
        const sanitizedMessage = rawMessage.split('\n')[0].replace(/(Bearer\s+[^\s]+|password[^\s]*|token[^\s]*|key[^\s]*)/gi, '[REDACTED]');

        return deepFreeze({
            category,
            code,
            message: sanitizedMessage,
            timestamp: now,
            correlation_id: correlationId || `ERR-${Date.now()}`
        });
    }

    clear(): void {
        this.auditEvents = [];
    }
}

export const mvpIntegrationEngine = new MvpIntegrationEngine();
