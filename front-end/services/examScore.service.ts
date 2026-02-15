/**
 * Exam Score Service - API calls for exam scores
 */

import api from './api.service';

// ============================================
// Types
// ============================================

export interface ExamSetting {
    id: number;
    course_id: string;
    exam_type: 'midterm' | 'final';
    component: 'lab' | 'lecture';
    max_score: number;
    is_visible: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    scores?: ExamScore[];
}

export interface Student {
    id: number;
    student_id: string;
    full_name: string;
}

export interface ExamScore {
    id: number;
    exam_setting_id: number;
    student_id: number;
    score: number | null;
    comment?: string;
    graded_by?: number;
    graded_at?: string;
    student?: Student;
    grader?: {
        id: number;
        full_name: string;
    };
}

export interface ExamScoresResponse {
    settings: ExamSetting[];
    students: Student[];
}

export interface ExamScoreStats {
    id: number;
    exam_type: 'midterm' | 'final';
    component: 'lab' | 'lecture';
    max_score: number;
    is_visible: boolean;
    stats: {
        count: number;
        avg: number;
        max: number;
        min: number;
    };
}

export interface BulkScoreItem {
    student_id: string;
    score: number | string | null;
}

export interface BulkSaveResult {
    message: string;
    success: { student_id: string; score: number | null }[];
    errors: { student_id: string; error: string }[];
}

// ============================================
// API Functions
// ============================================

/**
 * Get exam settings for a course
 */
export const getExamSettings = async (courseId: string): Promise<ExamSetting[]> => {
    const response = await api.get(`/courses/${courseId}/exam-settings`);
    return response.data as ExamSetting[];
};

/**
 * Update exam setting
 */
export const updateExamSetting = async (
    courseId: string, 
    settingId: number, 
    data: Partial<Pick<ExamSetting, 'max_score' | 'is_visible' | 'is_active'>>
): Promise<ExamSetting> => {
    const response = await api.put(`/courses/${courseId}/exam-settings/${settingId}`, data);
    return response.data as ExamSetting;
};

/**
 * Get exam scores for a course
 */
export const getExamScores = async (
    courseId: string, 
    params?: { exam_type?: string; component?: string; section_id?: number }
): Promise<ExamScoresResponse> => {
    const queryParams: Record<string, string> = {};
    if (params?.exam_type) queryParams.exam_type = params.exam_type;
    if (params?.component) queryParams.component = params.component;
    if (params?.section_id) queryParams.section_id = String(params.section_id);
    const response = await api.get(`/courses/${courseId}/exam-scores`, { params: Object.keys(queryParams).length > 0 ? queryParams : undefined });
    return response.data as ExamScoresResponse;
};

/**
 * Save single exam score
 */
export const saveExamScore = async (
    courseId: string,
    data: {
        exam_setting_id: number;
        student_id: number;
        score: number | null;
        comment?: string;
    }
): Promise<ExamScore> => {
    const response = await api.post(`/courses/${courseId}/exam-scores`, data);
    return response.data as ExamScore;
};

/**
 * Bulk save exam scores (from Excel paste)
 */
export const bulkSaveExamScores = async (
    courseId: string,
    data: {
        exam_setting_id: number;
        scores: BulkScoreItem[];
    }
): Promise<BulkSaveResult> => {
    const response = await api.post(`/courses/${courseId}/exam-scores/bulk`, data);
    return response.data as BulkSaveResult;
};

/**
 * Delete exam score
 */
export const deleteExamScore = async (courseId: string, scoreId: number): Promise<void> => {
    await api.delete(`/courses/${courseId}/exam-scores/${scoreId}`);
};

/**
 * Get exam score statistics
 */
export const getExamScoreStats = async (courseId: string): Promise<ExamScoreStats[]> => {
    const response = await api.get(`/courses/${courseId}/exam-scores/stats`);
    return response.data as ExamScoreStats[];
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get exam type label in Thai
 */
export const getExamTypeLabel = (examType: 'midterm' | 'final'): string => {
    return examType === 'midterm' ? 'กลางภาค' : 'ปลายภาค';
};

/**
 * Get component label in Thai
 */
export const getComponentLabel = (component: 'lab' | 'lecture'): string => {
    return component === 'lab' ? 'ปฏิบัติการ (Lab)' : 'บรรยาย (Lec)';
};

/**
 * Get full exam name
 */
export const getExamName = (examType: 'midterm' | 'final', component: 'lab' | 'lecture'): string => {
    return `สอบ${getExamTypeLabel(examType)} - ${getComponentLabel(component)}`;
};

/**
 * Parse Excel/CSV data to score items
 * Expected format: "student_id\tscore" per line
 */
export const parseExcelData = (data: string): BulkScoreItem[] => {
    const lines = data.trim().split('\n');
    const items: BulkScoreItem[] = [];

    for (const line of lines) {
        const parts = line.trim().split(/\t|,/);
        if (parts.length >= 2) {
            const student_id = parts[0].trim();
            const scoreStr = parts[1].trim();
            const score = scoreStr === '' ? null : parseFloat(scoreStr);
            
            if (student_id) {
                items.push({ 
                    student_id, 
                    score: isNaN(score as number) ? null : score 
                });
            }
        }
    }

    return items;
};

export default {
    getExamSettings,
    updateExamSetting,
    getExamScores,
    saveExamScore,
    bulkSaveExamScores,
    deleteExamScore,
    getExamScoreStats,
    getExamTypeLabel,
    getComponentLabel,
    getExamName,
    parseExcelData,
};
