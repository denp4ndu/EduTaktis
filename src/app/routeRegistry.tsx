import React from 'react';
import { RouteDefinition, NavigationItem, AuthenticatedIdentity, UserRole } from '../types/curriculum';
import { frontendAuthorizationAdapter } from '../services/frontendAuthorizationAdapter';

// Dynamic domain component imports
import { Login } from '../components/Login';
import { AccountSecurity } from '../components/AccountSecurity';
import { SessionManagement } from '../components/SessionManagement';
import { UserAccessManagement } from '../components/UserAccessManagement';
import { StudentLearningDashboardComponent as StudentLearningDashboard } from '../components/StudentLearningDashboard';
import { StudentClassEnrollment } from '../components/StudentClassEnrollment';
import { StudentAttendance } from '../components/StudentAttendance';
import { StudentGradebook } from '../components/StudentGradebook';
import { StudentReportCard } from '../components/StudentReportCard';
import { StudentAcademicTranscript } from '../components/StudentAcademicTranscript';
import { StudentAcademicCalendar } from '../components/StudentAcademicCalendar';
import { StudentBehaviorWorkspace } from '../components/StudentBehaviorWorkspace';
import { StudentGuidanceWorkspace } from '../components/StudentGuidanceWorkspace';
import { TeacherClassRoster } from '../components/TeacherClassRoster';
import { TeacherCoursePeriod } from '../components/TeacherCoursePeriod';
import { TeacherAttendanceManagement } from '../components/TeacherAttendanceManagement';
import { TeacherGradebook } from '../components/TeacherGradebook';
import { TeacherReportCard } from '../components/TeacherReportCard';
import { TeacherAcademicTranscript } from '../components/TeacherAcademicTranscript';
import { TeacherBehaviorManagement } from '../components/TeacherBehaviorManagement';
import { TeacherGuidanceMonitoring } from '../components/TeacherGuidanceMonitoring';
import { TeacherParentCommunication } from '../components/TeacherParentCommunication';
import { ParentPortalWorkspace } from '../components/ParentPortalWorkspace';
import { ParentTeacherCommunication } from '../components/ParentTeacherCommunication';
import { CounselorGuidanceDashboard } from '../components/CounselorGuidanceDashboard';
import { GuidanceCaseManagement } from '../components/GuidanceCaseManagement';
import { BehaviorAnalyticsMonitoring } from '../components/BehaviorAnalyticsMonitoring';
import { AcademicCalendarManagement } from '../components/AcademicCalendarManagement';
import { NotificationCenter } from '../components/NotificationCenter';
import { AdministrativeDashboard } from '../components/admin/AdministrativeDashboard';
import { TeacherScheduleManagement } from '../components/TeacherScheduleManagement';
import { StudentTimetable } from '../components/StudentTimetable';
import { ClassTimetable } from '../components/ClassTimetable';
import { RoomScheduleManagement } from '../components/RoomScheduleManagement';
import { TeacherWorkloadDashboard } from '../components/TeacherWorkloadDashboard';
import { ScheduleConflictMonitor } from '../components/ScheduleConflictMonitor';

export const ROUTE_REGISTRY: RouteDefinition[] = [
    {
        path: '/login',
        label: 'Masuk Akun',
        requiredAuthentication: false,
        component: Login
    },
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        requiredAuthentication: true,
        component: (props: any) => {
            const role = props.identity?.role as UserRole;
            switch (role) {
                case 'HEADMASTER':
                case 'ADMIN':
                    return <AdministrativeDashboard {...props} />;
                case 'TEACHER':
                    return <TeacherClassRoster {...props} />;
                case 'PARENT':
                case 'LEGAL_GUARDIAN':
                case 'AUTHORIZED_CAREGIVER':
                    return <ParentPortalWorkspace {...props} />;
                case 'COUNSELOR':
                    return <CounselorGuidanceDashboard {...props} />;
                case 'DISCIPLINE_OFFICER':
                    return <BehaviorAnalyticsMonitoring {...props} />;
                case 'STUDENT':
                default:
                    return <StudentLearningDashboard studentId={props.identity?.actor_id || props.identity?.user_id || 'STU-001'} {...props} />;
            }
        }
    },
    {
        path: '/courses',
        label: 'Mata Pelajaran & Kelas',
        icon: 'courses',
        requiredAuthentication: true,
        requiredPermissions: ['course:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER'
                ? <TeacherCoursePeriod {...props} />
                : <StudentClassEnrollment {...props} />;
        }
    },
    {
        path: '/attendance',
        label: 'Presensi & Kehadiran',
        icon: 'attendance',
        requiredAuthentication: true,
        requiredPermissions: ['attendance:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER'
                ? <TeacherAttendanceManagement {...props} />
                : <StudentAttendance {...props} />;
        }
    },
    {
        path: '/grades',
        label: 'Buku Nilai & Penilaian',
        icon: 'grades',
        requiredAuthentication: true,
        requiredPermissions: ['grade:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER'
                ? <TeacherGradebook {...props} />
                : <StudentGradebook {...props} />;
        }
    },
    {
        path: '/report-cards',
        label: 'Rapor Akademik',
        icon: 'report_cards',
        requiredAuthentication: true,
        requiredPermissions: ['report_card:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER' || props.identity?.role === 'HEADMASTER' || props.identity?.role === 'ADMIN'
                ? <TeacherReportCard {...props} />
                : <StudentReportCard {...props} />;
        }
    },
    {
        path: '/transcripts',
        label: 'Transkrip Akademik',
        icon: 'transcripts',
        requiredAuthentication: true,
        requiredPermissions: ['transcript:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER' || props.identity?.role === 'HEADMASTER' || props.identity?.role === 'ADMIN'
                ? <TeacherAcademicTranscript {...props} />
                : <StudentAcademicTranscript {...props} />;
        }
    },
    {
        path: '/calendar',
        label: 'Kalender Akademik',
        icon: 'calendar',
        requiredAuthentication: true,
        component: (props: any) => {
            return props.identity?.role === 'ADMIN' || props.identity?.role === 'HEADMASTER'
                ? <AcademicCalendarManagement {...props} />
                : <StudentAcademicCalendar {...props} />;
        }
    },
    {
        path: '/behavior',
        label: 'Perilaku & Disiplin',
        icon: 'behavior',
        requiredAuthentication: true,
        requiredPermissions: ['behavior:read'],
        component: (props: any) => {
            if (props.identity?.role === 'DISCIPLINE_OFFICER') {
                return <BehaviorAnalyticsMonitoring {...props} />;
            }
            return props.identity?.role === 'TEACHER'
                ? <TeacherBehaviorManagement {...props} />
                : <StudentBehaviorWorkspace {...props} />;
        }
    },
    {
        path: '/guidance',
        label: 'Bimbingan Konseling',
        icon: 'guidance',
        requiredAuthentication: true,
        requiredPermissions: ['guidance:read'],
        component: (props: any) => {
            if (props.identity?.role === 'COUNSELOR') {
                return <GuidanceCaseManagement {...props} />;
            }
            return props.identity?.role === 'TEACHER'
                ? <TeacherGuidanceMonitoring {...props} />
                : <StudentGuidanceWorkspace {...props} />;
        }
    },
    {
        path: '/parent-portal',
        label: 'Portal Orang Tua / Wali',
        icon: 'users',
        requiredAuthentication: true,
        requiredRoles: ['PARENT', 'LEGAL_GUARDIAN', 'AUTHORIZED_CAREGIVER', 'ADMIN', 'HEADMASTER'],
        requiredPermissions: ['guardian:read'],
        component: ParentPortalWorkspace
    },
    {
        path: '/communication',
        label: 'Komunikasi Guru - Wali',
        icon: 'communication',
        requiredAuthentication: true,
        requiredPermissions: ['communication:read'],
        component: (props: any) => {
            return props.identity?.role === 'TEACHER'
                ? <TeacherParentCommunication {...props} />
                : <ParentTeacherCommunication {...props} />;
        }
    },
    {
        path: '/notifications',
        label: 'Notifikasi',
        icon: 'notifications',
        requiredAuthentication: true,
        requiredPermissions: ['notification:read'],
        component: NotificationCenter
    },
    {
        path: '/security',
        label: 'Keamanan Akun',
        icon: 'settings',
        requiredAuthentication: true,
        component: AccountSecurity
    },
    {
        path: '/sessions',
        label: 'Sesi Aktif',
        icon: 'settings',
        requiredAuthentication: true,
        requiredPermissions: ['session:read'],
        component: SessionManagement
    },
    {
        path: '/users',
        label: 'Kelola Pengguna',
        icon: 'users',
        requiredAuthentication: true,
        requiredRoles: ['ADMIN'],
        requiredPermissions: ['user:read'],
        component: UserAccessManagement
    },
    {
        path: '/schedule',
        label: 'Jadwal & Timetable',
        icon: 'calendar',
        requiredAuthentication: true,
        component: (props: any) => {
            const role = props.identity?.role as UserRole;
            switch (role) {
                case 'STUDENT':
                    return <StudentTimetable {...props} />;
                case 'TEACHER':
                    return <TeacherScheduleManagement {...props} />;
                default:
                    return <ClassTimetable {...props} />;
            }
        }
    },
    {
        path: '/schedule/workload',
        label: 'Beban Mengajar',
        icon: 'dashboard',
        requiredAuthentication: true,
        requiredRoles: ['TEACHER', 'ADMIN', 'HEADMASTER'],
        component: TeacherWorkloadDashboard
    },
    {
        path: '/schedule/rooms',
        label: 'Jadwal Ruangan',
        icon: 'calendar',
        requiredAuthentication: true,
        requiredRoles: ['ADMIN', 'HEADMASTER'],
        component: RoomScheduleManagement
    },
    {
        path: '/schedule/conflicts',
        label: 'Monitor Tabrakan Jadwal',
        icon: 'settings',
        requiredAuthentication: true,
        requiredRoles: ['ADMIN', 'HEADMASTER'],
        component: ScheduleConflictMonitor
    },
    // PHASE 42 WORKSPACE ROUTES
    {
        path: '/admin',
        label: 'Admin Workspace',
        icon: 'settings',
        requiredAuthentication: true,
        requiredRoles: ['ADMIN'],
        component: AdministrativeDashboard
    },
    {
        path: '/headmaster',
        label: 'Kepala Sekolah',
        icon: 'dashboard',
        requiredAuthentication: true,
        requiredRoles: ['HEADMASTER', 'ADMIN'],
        component: AdministrativeDashboard
    },
    {
        path: '/teacher',
        label: 'Ruang Guru',
        icon: 'courses',
        requiredAuthentication: true,
        requiredRoles: ['TEACHER', 'ADMIN', 'HEADMASTER'],
        component: TeacherClassRoster
    },
    {
        path: '/student',
        label: 'Ruang Siswa',
        icon: 'courses',
        requiredAuthentication: true,
        requiredRoles: ['STUDENT', 'ADMIN', 'HEADMASTER'],
        component: (props: any) => (
            <StudentLearningDashboard 
                studentId={props.identity?.actor_id || props.identity?.user_id || 'STU-001'} 
                {...props} 
            />
        )
    },
    {
        path: '/counselor',
        label: 'Bimbingan Konseling',
        icon: 'guidance',
        requiredAuthentication: true,
        requiredRoles: ['COUNSELOR', 'ADMIN', 'HEADMASTER'],
        component: CounselorGuidanceDashboard
    },
    {
        path: '/discipline',
        label: 'Ketertiban & Disiplin',
        icon: 'behavior',
        requiredAuthentication: true,
        requiredRoles: ['DISCIPLINE_OFFICER', 'ADMIN', 'HEADMASTER'],
        component: BehaviorAnalyticsMonitoring
    },
    {
        path: '/scheduling',
        label: 'Manajemen Jadwal',
        icon: 'calendar',
        requiredAuthentication: true,
        component: (props: any) => {
            const role = props.identity?.role as UserRole;
            switch (role) {
                case 'STUDENT':
                    return <StudentTimetable {...props} />;
                case 'TEACHER':
                    return <TeacherScheduleManagement {...props} />;
                default:
                    return <ClassTimetable {...props} />;
            }
        }
    }
];

export function findRouteByPath(path: string): RouteDefinition | undefined {
    return ROUTE_REGISTRY.find(r => r.path === path);
}

/**
 * Dynamically derives accessible navigation items based strictly on authoritative role & permissions
 */
export function getNavigationForIdentity(identity: AuthenticatedIdentity | null): NavigationItem[] {
    if (!identity) {
        return [];
    }

    const items: NavigationItem[] = [];

    for (const route of ROUTE_REGISTRY) {
        if (!route.icon || route.path === '/login' || route.path === '/security') {
            continue;
        }

        // Role restriction check
        if (route.requiredRoles && !route.requiredRoles.includes(identity.role)) {
            continue;
        }

        // Permission restriction check delegating to Phase 38 AuthorizationEngine
        if (route.requiredPermissions && route.requiredPermissions.length > 0) {
            const hasAllPerms = route.requiredPermissions.every(perm => 
                frontendAuthorizationAdapter.checkPermission(identity.role, perm)
            );
            if (!hasAllPerms) {
                continue;
            }
        }

        items.push({
            id: route.path.replace('/', ''),
            path: route.path,
            label: route.label,
            icon: route.icon,
            category: route.category
        });
    }

    return items;
}
