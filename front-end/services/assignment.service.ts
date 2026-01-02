/**
 * Assignment Service - API calls for assignments
 */

import api from './api.service';

export interface AssignmentSubItem {
    id?: number;
    assignment_id?: number;
    name: string;
    max_score: number;
    order_index?: number;
}

export interface Assignment {
    id: number;
    course_id: string; // nanoid format
    name: string;
    description?: string;
    assignment_type: 'individual' | 'permanent_group' | 'weekly_group';
    week_number?: number;
    max_score: number;
    due_date?: string;
    order_index: number;
    is_active: boolean;
    created_by?: number;
    created_at?: string;
    updated_at?: string;
    subItems?: AssignmentSubItem[];
    creator?: {
        id: number;
        display_name: string;
    };
}

export interface CreateAssignmentData {
    course_id: string; // nanoid format
    name: string;
    description?: string;
    assignment_type?: 'individual' | 'permanent_group' | 'weekly_group';
    week_number?: number;
    max_score?: number;
    sub_items?: Omit<AssignmentSubItem, 'id' | 'assignment_id'>[];
    due_date?: string;
}

export interface UpdateAssignmentData {
    name?: string;
    description?: string;
    assignment_type?: 'individual' | 'permanent_group' | 'weekly_group';
    week_number?: number;
    max_score?: number;
    sub_items?: Omit<AssignmentSubItem, 'id' | 'assignment_id'>[];
    due_date?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

const assignmentService = {
    /**
     * Get all assignments for a course
     */
    async getAssignments(courseId: string): Promise<Assignment[]> {
        const response = await api.get<Assignment[]>(`/assignments?course_id=${courseId}`);
        return response.data || [];
    },

    /**
     * Get single assignment
     */
    async getAssignment(id: number): Promise<Assignment | null> {
        const response = await api.get<Assignment>(`/assignments/${id}`);
        return response.data || null;
    },

    /**
     * Create new assignment
     */
    async createAssignment(data: CreateAssignmentData): Promise<Assignment | null> {
        const response = await api.post<Assignment>('/assignments', data);
        return response.data || null;
    },

    /**
     * Update assignment
     */
    async updateAssignment(id: number, data: UpdateAssignmentData): Promise<Assignment | null> {
        const response = await api.put<Assignment>(`/assignments/${id}`, data);
        return response.data || null;
    },

    /**
     * Delete assignment
     */
    async deleteAssignment(id: number): Promise<boolean> {
        const response = await api.delete<null>(`/assignments/${id}`);
        return response.success;
    },

    /**
     * Reorder assignments
     */
    async reorderAssignments(assignments: { id: number; order_index: number }[]): Promise<boolean> {
        const response = await api.put<null>('/assignments/reorder/batch', { assignments });
        return response.success;
    },
};

export default assignmentService;
