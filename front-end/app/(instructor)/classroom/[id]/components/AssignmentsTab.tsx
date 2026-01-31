"use client";

import type { AssignmentType } from "./types";
import { useAssignmentsTab, AssignmentsTabView } from "./assignments";

interface AssignmentsTabProps {
    assignments: AssignmentType[];
    setAssignments: React.Dispatch<React.SetStateAction<AssignmentType[]>>;
    isLoading: boolean;
    expandedAssignments: number[];
    setExpandedAssignments: React.Dispatch<React.SetStateAction<number[]>>;
    onOpenCreateModal: () => void;
    onOpenEditModal: (assignment: AssignmentType) => void;
    onOpenScoreModal: (assignment: AssignmentType) => void;
    onOpenBonusScoreModal?: () => void;
    onAssignmentDeleted?: () => void;
}

/**
 * AssignmentsTab Container Component
 * 
 * This is a container component that:
 * 1. Uses the useAssignmentsTab hook to manage all state and business logic
 * 2. Passes data and handlers to the memoized AssignmentsTabView component
 * 
 * Benefits:
 * - Separation of concerns (logic vs presentation)
 * - Easier testing (can test hook and view separately)
 * - Reduced re-renders through React.memo in AssignmentsTabView
 */
export default function AssignmentsTab({
    assignments,
    setAssignments,
    isLoading,
    expandedAssignments,
    setExpandedAssignments,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenScoreModal,
    onOpenBonusScoreModal,
    onAssignmentDeleted,
}: AssignmentsTabProps) {
    const {
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
        closeDeleteModal,
        confirmDeleteAssignment,
        handleDeleteAssignment,
        clearSearch,
    } = useAssignmentsTab({ 
        assignments, 
        setAssignments, 
        onAssignmentDeleted 
    });

    return (
        <AssignmentsTabView
            assignments={assignments}
            isLoading={isLoading}
            searchQuery={searchQuery}
            activeTab={activeTab}
            viewMode={viewMode}
            isDeleteModalOpen={isDeleteModalOpen}
            deleteTarget={deleteTarget}
            isDeleting={isDeleting}
            labAssignments={labAssignments}
            homeworkAssignments={homeworkAssignments}
            groupAssignments={groupAssignments}
            currentAssignments={currentAssignments}
            onSetSearchQuery={setSearchQuery}
            onSetActiveTab={setActiveTab}
            onSetViewMode={setViewMode}
            onCloseDeleteModal={closeDeleteModal}
            onConfirmDelete={confirmDeleteAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onClearSearch={clearSearch}
            onOpenCreateModal={onOpenCreateModal}
            onOpenEditModal={onOpenEditModal}
            onOpenScoreModal={onOpenScoreModal}
            onOpenBonusScoreModal={onOpenBonusScoreModal}
        />
    );
}
