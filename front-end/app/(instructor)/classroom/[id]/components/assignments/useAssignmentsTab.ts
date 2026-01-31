"use client";

import { useState, useMemo, useCallback } from "react";
import { addToast } from "@heroui/toast";
import assignmentService from "@/services/assignment.service";
import { useSocket } from "@/contexts/SocketContext";
import type { AssignmentType } from "../types";
import type { AssignmentTabType, ViewMode } from "./config";

interface UseAssignmentsTabProps {
    assignments: AssignmentType[];
    setAssignments: React.Dispatch<React.SetStateAction<AssignmentType[]>>;
    onAssignmentDeleted?: () => void;
}

export interface UseAssignmentsTabReturn {
    // State
    searchQuery: string;
    activeTab: AssignmentTabType;
    viewMode: ViewMode;
    isDeleteModalOpen: boolean;
    deleteTarget: AssignmentType | null;
    isDeleting: boolean;
    // Computed
    labAssignments: AssignmentType[];
    homeworkAssignments: AssignmentType[];
    groupAssignments: AssignmentType[];
    currentAssignments: AssignmentType[];
    // Actions
    setSearchQuery: (query: string) => void;
    setActiveTab: (tab: AssignmentTabType) => void;
    setViewMode: (mode: ViewMode) => void;
    openDeleteModal: (assignment: AssignmentType) => void;
    closeDeleteModal: () => void;
    confirmDeleteAssignment: () => Promise<void>;
    handleDeleteAssignment: (assignment: AssignmentType) => void;
    clearSearch: () => void;
}

/**
 * Custom hook for AssignmentsTab state and logic
 * Handles search, filtering, tab switching, view mode, and delete operations
 */
export function useAssignmentsTab({
    assignments,
    setAssignments,
    onAssignmentDeleted,
}: UseAssignmentsTabProps): UseAssignmentsTabReturn {
    const { emitDataUpdate } = useSocket();
    
    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<AssignmentTabType>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    
    // Delete modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AssignmentType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Separate assignments by type
    const labAssignments = useMemo(() => 
        assignments.filter(a => a.assignment_type === "individual"),
        [assignments]
    );
    
    const homeworkAssignments = useMemo(() => 
        assignments.filter(a => a.assignment_type === "assignment"),
        [assignments]
    );
    
    const groupAssignments = useMemo(() => 
        assignments.filter(a => a.assignment_type === "permanent_group" || a.assignment_type === "weekly_group"),
        [assignments]
    );

    // Get current tab assignments with search filter
    const currentAssignments = useMemo(() => {
        let list = assignments;
        if (activeTab === "lab") list = labAssignments;
        if (activeTab === "assignment") list = homeworkAssignments;
        if (activeTab === "group") list = groupAssignments;

        if (searchQuery) {
            list = list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    }, [assignments, activeTab, searchQuery, labAssignments, homeworkAssignments, groupAssignments]);

    // Delete modal actions
    const openDeleteModal = useCallback((assignment: AssignmentType) => {
        setDeleteTarget(assignment);
        setIsDeleteModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    }, []);

    const confirmDeleteAssignment = useCallback(async () => {
        if (!deleteTarget) return;
        
        setIsDeleting(true);
        try {
            await assignmentService.deleteAssignment(deleteTarget.id);
            setAssignments(prev => prev.filter(a => a.id !== deleteTarget.id));
            addToast({
                title: "สำเร็จ",
                description: "ลบงานเรียบร้อยแล้ว",
                color: "success",
            });
            
            // Emit real-time update
            emitDataUpdate("assignment", "delete", deleteTarget.id);
            
            // Callback to refresh overview data
            console.log("📊 Calling onAssignmentDeleted callback");
            onAssignmentDeleted?.();
            
            closeDeleteModal();
        } catch (error) {
            addToast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถลบงานได้",
                color: "danger",
            });
        } finally {
            setIsDeleting(false);
        }
    }, [deleteTarget, setAssignments, emitDataUpdate, onAssignmentDeleted, closeDeleteModal]);

    const handleDeleteAssignment = useCallback((assignment: AssignmentType) => {
        openDeleteModal(assignment);
    }, [openDeleteModal]);

    const clearSearch = useCallback(() => {
        setSearchQuery("");
    }, []);

    return {
        // State
        searchQuery,
        activeTab,
        viewMode,
        isDeleteModalOpen,
        deleteTarget,
        isDeleting,
        // Computed
        labAssignments,
        homeworkAssignments,
        groupAssignments,
        currentAssignments,
        // Actions
        setSearchQuery,
        setActiveTab,
        setViewMode,
        openDeleteModal,
        closeDeleteModal,
        confirmDeleteAssignment,
        handleDeleteAssignment,
        clearSearch,
    };
}
