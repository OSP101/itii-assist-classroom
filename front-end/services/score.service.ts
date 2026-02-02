/**
 * Score Service - API calls for scores
 */

import api from './api.service';
import type { Assignment, AssignmentSubItem } from './assignment.service';

export interface Student {
    id: number;
    student_id: string;
    full_name: string;
    email: string;
    is_active: number;
}

export interface ScoreEntry {
    score_id?: number;
    score: number | null;
    max_score: number;
    graded_by?: {
        id: number;
        display_name: string;
    };
    graded_at?: string;
}

export interface SubItemScoreData {
    sub_item_id: number;
    sub_item_name: string;
    max_score: number;
    score: number | null;
    score_id: number | null;
    graded_by?: {
        id: number;
        display_name: string;
    } | null;
    graded_at?: string | null;
}

// Attendance detail for multi-session attendance
export interface AttendanceDetail {
    session_id: number;
    session_title: string;
    start_time: string;
    status: 'present' | 'late' | 'leave' | 'absent';
    attended: boolean;
}

export interface StudentScore {
    student: Student;
    score?: number | null;
    score_id?: number;
    max_score?: number;
    comment?: string;
    status?: 'pending' | 'graded';
    graded_by?: {
        id: number;
        display_name: string;
    };
    graded_at?: string;
    sub_item_scores?: SubItemScoreData[];
    // Attendance info (if assignment is linked to attendance session)
    attendance_status?: 'present' | 'late' | 'leave' | 'absent' | 'partial' | null;
    can_score?: boolean;
    // Multi-session attendance info
    attendance_details?: AttendanceDetail[];
    attendance_condition?: 'and' | 'or' | null;
    attended_count?: number;
    total_count?: number;
}

export interface ScoresData {
    assignment: Assignment & {
        attendance_condition?: 'and' | 'or';
        linked_sessions_count?: number;
    };
    student_scores: StudentScore[];
}

// Simplified score entries from existing scores
export interface ExistingScore {
    student_id: number;
    score: number | null;
}

export interface Group {
    id: number;
    name: string;
    members: Student[];
}

export interface ScoreEditRequest {
    id: number;
    score_id: number;
    old_score: number;
    new_score: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_by: number;
    reviewed_by?: number;
    reviewed_at?: string;
    review_comment?: string;
    created_at: string;
    score?: {
        assignment: Assignment;
        student: Student;
    };
    requester?: {
        id: number;
        display_name: string;
    };
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

const scoreService = {
    /**
     * Get scores for an assignment
     */
    async getScores(assignmentId: number): Promise<ScoresData | null> {
        const response = await api.get<ScoresData>(`/scores?assignment_id=${assignmentId}`);
        return response.data || null;
    },

    /**
     * Submit single score
     */
    async submitScore(data: {
        assignment_id: number;
        student_id: number;
        score: number;
        comment?: string;
        sub_item_id?: number;
    }): Promise<boolean> {
        const response = await api.post<unknown>('/scores', data);
        return response.success;
    },

    /**
     * Submit bulk scores
     */
    async submitBulkScores(data: {
        assignment_id: number;
        scores: {
            student_id: number;
            score: number;
            comment?: string;
        }[];
    }): Promise<boolean> {
        const response = await api.post<unknown>('/scores/bulk', data);
        return response.success;
    },

    /**
     * Submit group score
     */
    async submitGroupScore(data: {
        assignment_id: number;
        group_id: number;
        score: number;
        comment?: string;
        sub_item_id?: number;
    }): Promise<boolean> {
        console.log('submitGroupScore called with:', data);
        const response = await api.post<unknown>('/scores/group', data);
        console.log('submitGroupScore response:', response);
        return response.success;
    },

    /**
     * Search students
     */
    async searchStudents(courseId: string, query?: string): Promise<Student[]> {
        let url = `/scores/students/search?course_id=${courseId}`;
        if (query) {
            url += `&query=${encodeURIComponent(query)}`;
        }
        console.log('[scoreService] searchStudents URL:', url);
        const response = await api.get<Student[]>(url);
        console.log('[scoreService] searchStudents response:', response);
        return response.data || [];
    },

    /**
     * Get groups for assignment
     */
    async getGroupsForAssignment(assignmentId: number): Promise<Group[]> {
        const response = await api.get<Group[]>(`/scores/groups?assignment_id=${assignmentId}`);
        return response.data || [];
    },

    /**
     * Request score edit
     */
    async requestScoreEdit(data: {
        score_id: number;
        new_score: number;
        reason: string;
    }): Promise<boolean> {
        const response = await api.post<unknown>('/scores/edit-request', data);
        return response.success;
    },

    /**
     * Get pending edit requests
     */
    async getPendingEditRequests(courseId?: string): Promise<ScoreEditRequest[]> {
        let url = '/scores/edit-requests';
        if (courseId) {
            url += `?course_id=${courseId}`;
        }
        const response = await api.get<ScoreEditRequest[]>(url);
        return response.data || [];
    },

    /**
     * Review edit request
     */
    async reviewEditRequest(id: number, data: {
        status: 'approved' | 'rejected';
        review_comment?: string;
    }): Promise<boolean> {
        const response = await api.put<unknown>(`/scores/edit-requests/${id}`, data);
        return response.success;
    },

    /**
     * Get student scores summary
     */
    async getStudentScoresSummary(courseId: number, studentId?: number): Promise<Assignment[]> {
        let url = `/scores/summary?course_id=${courseId}`;
        if (studentId) {
            url += `&student_id=${studentId}`;
        }
        const response = await api.get<Assignment[]>(url);
        return response.data || [];
    },

    /**
     * Get score summary matrix (students x assignments)
     */
    async getScoreSummaryMatrix(
        courseId: string,
        options?: {
            sectionId?: number;
            assignmentType?: 'individual' | 'assignment' | 'group';
        }
    ): Promise<ScoreSummaryMatrix | null> {
        let url = `/scores/matrix?course_id=${courseId}`;
        if (options?.sectionId) {
            url += `&section_id=${options.sectionId}`;
        }
        if (options?.assignmentType) {
            url += `&assignment_type=${options.assignmentType}`;
        }
        const response = await api.get<ScoreSummaryMatrix>(url);
        return response.data || null;
    },
};

// Types for Score Summary Matrix
export interface ScoreSummaryMatrixStudent {
    student_id: string;
    full_name: string;
    section_number: number;
    bonus_score: number;
    scores: {
        [key: string]: {
            score: number | null;
            max_score: number;
            sub_item_name?: string;
            graded_by?: string | null;
            graded_at?: string | null;
            updated_at?: string | null;
        };
    };
    total_score: number;
    total_max_score: number;
    scored_count: number;
    total_items: number;
}

export interface ScoreSummaryMatrixAssignment {
    id: number;
    title: string;
    short_title: string;
    max_score: number;
    assignment_type: string;
    subItems: {
        id: number;
        name: string;
        max_score: number;
    }[];
}

export interface ScoreSummaryMatrix {
    sections: { id: number; section_number: number }[];
    assignments: ScoreSummaryMatrixAssignment[];
    students: ScoreSummaryMatrixStudent[];
    averages: { [key: string]: string | null };
    summary: {
        total_students: number;
        total_assignments: number;
    };
}

export default scoreService;
