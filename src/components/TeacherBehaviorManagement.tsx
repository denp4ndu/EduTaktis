import React, { useState, useEffect } from 'react';
import { 
    StudentBehaviorEvent, 
    BehaviorCategory, 
    BehaviorSeverity, 
    DisciplineCase, 
    GuidanceIntervention 
} from '../types/curriculum';
import { behaviorEngine } from '../services/behaviorEngine';

interface TeacherBehaviorManagementProps {
    teacherId: string;
    courseId: string;
    coursePeriodId: string;
    semesterId: string;
    academicYearId: string;
    enrolledStudentIds?: string[];
}

export const TeacherBehaviorManagement: React.FC<TeacherBehaviorManagementProps> = ({
    teacherId,
    courseId,
    coursePeriodId,
    semesterId,
    academicYearId,
    enrolledStudentIds = []
}) => {
    const [events, setEvents] = useState<StudentBehaviorEvent[]>([]);
    const [cases, setCases] = useState<DisciplineCase[]>([]);
    const [interventions, setInterventions] = useState<GuidanceIntervention[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state for recording new event
    const [showEventModal, setShowEventModal] = useState<boolean>(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string>(enrolledStudentIds[0] || '');
    const [category, setCategory] = useState<BehaviorCategory>('POSITIVE_BEHAVIOR');
    const [severity, setSeverity] = useState<BehaviorSeverity>('LOW');
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    // Review Modal State
    const [reviewingEvent, setReviewingEvent] = useState<StudentBehaviorEvent | null>(null);
    const [reviewerNotes, setReviewerNotes] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [teacherId, courseId, coursePeriodId, semesterId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [evts, caseList, intervList] = await Promise.all([
                behaviorEngine.listBehaviorEvents({
                    course_id: courseId,
                    course_period_id: coursePeriodId,
                    semester_id: semesterId
                }),
                behaviorEngine.listDisciplineCases({ semester_id: semesterId }),
                behaviorEngine.listInterventions({ semester_id: semesterId })
            ]);

            setEvents(evts);
            setCases(caseList);
            setInterventions(intervList);
        } catch (err: any) {
            setError(err.message || 'Failed to load behavior management data');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await behaviorEngine.recordBehaviorEvent({
                student_id: selectedStudentId,
                academic_year_id: academicYearId,
                semester_id: semesterId,
                course_id: courseId,
                course_period_id: coursePeriodId,
                category,
                severity,
                title,
                description,
                event_date: new Date().toISOString(),
                reporter_id: teacherId,
                reporter_role: 'TEACHER'
            });

            setSuccessMsg('Behavior record created successfully.');
            setShowEventModal(false);
            setTitle('');
            setDescription('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to record behavior event');
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewingEvent) return;

        try {
            setError(null);
            await behaviorEngine.reviewBehaviorEvent({
                event_id: reviewingEvent.event_id,
                reviewer_id: teacherId,
                reviewer_role: 'TEACHER',
                reviewer_notes: reviewerNotes,
                new_status: 'REVIEWED'
            });

            setSuccessMsg('Event reviewed successfully.');
            setReviewingEvent(null);
            setReviewerNotes('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to review event');
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-slate-800 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Teacher Behavior & Discipline Management</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Course: <span className="font-mono text-indigo-400 font-semibold">{courseId}</span> • Period: <span className="font-mono text-cyan-400">{coursePeriodId}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowEventModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
                >
                    + Log Student Behavior
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-sm flex justify-between items-center">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Event List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Recorded Course Conduct & Commendations</h3>
                {events.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                        No behavior entries recorded for this course period yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((evt) => (
                            <div 
                                key={evt.event_id}
                                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-indigo-300 font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/50">
                                            {evt.student_id}
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                            evt.category.startsWith('POSITIVE') || evt.category === 'ACHIEVEMENT' || evt.category === 'PARTICIPATION'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : evt.category === 'WARNING'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {evt.category.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(evt.event_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="font-semibold text-slate-100">{evt.title}</div>
                                    <div className="text-sm text-slate-300">{evt.description}</div>
                                    {evt.reviewer_notes && (
                                        <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 mt-2">
                                            <span className="font-semibold text-indigo-300">Review Note:</span> {evt.reviewer_notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                            v{evt.version_number} • {evt.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                                            {evt.checksum}
                                        </span>
                                    </div>
                                    {evt.status === 'RECORDED' && (
                                        <button
                                            onClick={() => {
                                                setReviewingEvent(evt);
                                                setReviewerNotes(evt.reviewer_notes || '');
                                            }}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition"
                                        >
                                            Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for Recording Event */}
            {showEventModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Log Student Conduct / Commendation</h3>
                            <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleRecordEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Student</label>
                                {enrolledStudentIds.length > 0 ? (
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                        required
                                    >
                                        {enrolledStudentIds.map(sid => (
                                            <option key={sid} value={sid}>{sid}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={selectedStudentId}
                                        onChange={(e) => setSelectedStudentId(e.target.value)}
                                        placeholder="Enter Student ID"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                        required
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as BehaviorCategory)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    >
                                        <option value="POSITIVE_BEHAVIOR">Positive Behavior</option>
                                        <option value="ACHIEVEMENT">Achievement</option>
                                        <option value="PARTICIPATION">Participation</option>
                                        <option value="WARNING">Warning</option>
                                        <option value="MINOR_VIOLATION">Minor Violation</option>
                                        <option value="MAJOR_VIOLATION">Major Violation</option>
                                        <option value="ATTENDANCE_RELATED">Attendance Related</option>
                                        <option value="ACADEMIC_CONDUCT">Academic Conduct</option>
                                        <option value="SOCIAL_CONDUCT">Social Conduct</option>
                                        <option value="SAFETY_RELATED">Safety Related</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Severity</label>
                                    <select
                                        value={severity}
                                        onChange={(e) => setSeverity(e.target.value as BehaviorSeverity)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    >
                                        <option value="INFO">Info</option>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Excellent collaboration on lab assignment"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide detailed context..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEventModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                                >
                                    Record Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Reviewing Event */}
            {reviewingEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Review Behavior Event</h3>
                            <button onClick={() => setReviewingEvent(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1">
                                <div className="text-xs text-indigo-400 font-semibold">{reviewingEvent.category} • Student: {reviewingEvent.student_id}</div>
                                <div className="font-semibold text-white">{reviewingEvent.title}</div>
                                <div className="text-xs text-slate-300">{reviewingEvent.description}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Teacher Review Notes</label>
                                <textarea
                                    value={reviewerNotes}
                                    onChange={(e) => setReviewerNotes(e.target.value)}
                                    placeholder="Add evaluation, follow-up actions taken or counseling advice given..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewingEvent(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
                                >
                                    Complete Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
