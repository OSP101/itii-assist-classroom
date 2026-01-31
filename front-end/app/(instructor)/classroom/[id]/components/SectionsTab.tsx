"use client";

import { Spinner } from "@heroui/spinner";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { Chip } from "@heroui/chip";
import { Checkbox, CheckboxGroup } from "@heroui/checkbox";
import { Select, SelectItem } from "@heroui/select";
import { Avatar } from "@heroui/avatar";
import { Icon } from "@iconify/react";
import { useSectionsTab, SectionsTabView } from "./sections";

interface SectionsTabProps {
    courseId: string;
}

/**
 * SectionsTab Container Component
 * 
 * This is a container component that:
 * 1. Uses the useSectionsTab hook to manage all state and business logic
 * 2. Passes data and handlers to the memoized SectionsTabView component
 * 3. Renders all modals (Add Section, Add Student, Create Team, etc.)
 * 
 * Benefits:
 * - Separation of concerns (logic vs presentation)
 * - Easier testing (can test hook and view separately)
 * - Reduced re-renders through React.memo in SectionsTabView
 * - Self-contained component - only needs courseId prop
 */
export default function SectionsTab({ courseId }: SectionsTabProps) {
    const hook = useSectionsTab(courseId);
    
    const {
        // Data
        course,
        isLoading,
        isTeamsLoading,
        
        // UI State
        sectionSubTab,
        sectionSearchQuery,
        selectedWeek,
        totalWeeks,
        expandedSections,
        
        // Data Collections
        permanentTeams,
        weeklyTeams,
        sectionStudents,
        studentsList,
        
        // Computed
        totalStudents,
        
        // Modal States
        sectionModal,
        studentModal,
        teamModal,
        editTeamModal,
        deleteModal,
        bulkDeleteModal,
        isSubmitting,
        
        // UI Handlers
        onSubTabChange,
        onSearchQueryChange,
        onWeekChange,
        onToggleSection,
        
        // CRUD Handlers
        handleAddSection,
        handleRemoveSection,
        handleAddStudent,
        handleBulkAddStudents,
        handleRemoveStudent,
        handleCreateTeam,
        handleSaveEditedTeam,
        handleDeleteTeam,
        handleBulkDeleteTeams,
        handleCopyTeamsFromWeek,
        
        // Modal Openers
        openAddStudentModal,
        openDeleteStudentModal,
        openCreateTeamModal,
        openEditTeamModal,
        openDeleteTeamModal,
        openBulkDeleteModal,
        
        // Computed Functions
        getFilteredSectionStudents,
        findStudentTeam,
        getUnassignedStudents,
        getAvailableStudentsForEdit,
        getAllEnrolledStudents,
        
        // Utility
        parseExcelData,
        parseTeamExcelData,
    } = hook;

    // Get enrolled student IDs for filtering
    const getEnrolledStudentIds = () => {
        const enrolledIds = new Set<number>();
        Object.values(sectionStudents).forEach(students => {
            students.forEach(s => enrolledIds.add(s.id));
        });
        return enrolledIds;
    };

    // Get available students (not enrolled)
    const getAvailableStudents = () => {
        const enrolledIds = getEnrolledStudentIds();
        return studentsList.filter(student => !enrolledIds.has(student.id));
    };

    // Filter available students by search query
    const filteredStudents = () => {
        const available = getAvailableStudents();
        if (!studentModal.searchQuery.trim()) return available;
        const query = studentModal.searchQuery.toLowerCase();
        return available.filter(s =>
            s.student_id.toLowerCase().includes(query) ||
            s.full_name.toLowerCase().includes(query)
        );
    };

    // Show loading spinner while fetching initial data
    if (isLoading || !course) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <>
            <SectionsTabView
                // Data
                course={course}
                sectionSubTab={sectionSubTab}
                sectionSearchQuery={sectionSearchQuery}
                totalStudents={totalStudents}
                permanentTeams={permanentTeams}
                weeklyTeams={weeklyTeams}
                selectedWeek={selectedWeek}
                totalWeeks={totalWeeks}
                expandedSections={expandedSections}
                isTeamsLoading={isTeamsLoading}
                sectionStudents={sectionStudents}
                
                // UI Handlers
                onSubTabChange={onSubTabChange}
                onSearchQueryChange={onSearchQueryChange}
                onWeekChange={onWeekChange}
                onToggleSection={onToggleSection}
                onOpenAddSectionModal={() => sectionModal.setIsOpen(true)}
                onOpenAddStudentModal={openAddStudentModal}
                onRemoveSection={handleRemoveSection}
                onOpenDeleteStudentModal={openDeleteStudentModal}
                onOpenCreateTeamModal={openCreateTeamModal}
                onOpenDeleteTeamModal={openDeleteTeamModal}
                onOpenEditTeamModal={openEditTeamModal}
                onCopyTeamsFromWeek={handleCopyTeamsFromWeek}
                onOpenBulkDeleteModal={openBulkDeleteModal}
                
                // Computed Functions
                getFilteredSectionStudents={getFilteredSectionStudents}
                findStudentTeam={findStudentTeam}
            />

            {/* Add Section Modal */}
            <Modal 
                isOpen={sectionModal.isOpen} 
                onClose={sectionModal.reset}
                size="md"
            >
                <ModalContent>
                    <ModalHeader>เพิ่มกลุ่มเรียน</ModalHeader>
                    <ModalBody>
                        <Input
                            label="หมายเลขกลุ่มเรียน"
                            placeholder="เช่น 1, 2, 801"
                            value={sectionModal.sectionNo}
                            onValueChange={sectionModal.setSectionNo}
                            isRequired
                        />
                        <Input
                            label="หมายเหตุ (ถ้ามี)"
                            placeholder="เช่น กลุ่มพิเศษ"
                            value={sectionModal.note}
                            onValueChange={sectionModal.setNote}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={sectionModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleAddSection}
                            isLoading={isSubmitting}
                        >
                            เพิ่มกลุ่มเรียน
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Student Modal */}
            <Modal 
                isOpen={studentModal.isOpen} 
                onClose={studentModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        เพิ่มนักศึกษา - กลุ่มเรียน {course.sections?.find(s => s.id === studentModal.sectionId)?.section_no}
                    </ModalHeader>
                    <ModalBody>
                        <Tabs
                            selectedKey={studentModal.mode}
                            onSelectionChange={(key) => studentModal.setMode(key as "single" | "bulk")}
                            variant="underlined"
                            classNames={{
                                tabList: "gap-4",
                                cursor: "bg-blue-500",
                                tab: "px-0 h-10",
                                tabContent: "group-data-[selected=true]:text-blue-600"
                            }}
                        >
                            <Tab key="single" title="เพิ่มทีละคน">
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder="ค้นหานักศึกษา..."
                                        value={studentModal.searchQuery}
                                        onValueChange={studentModal.setSearchQuery}
                                        startContent={<Icon icon="solar:magnifer-linear" />}
                                    />
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {filteredStudents().map(student => (
                                            <div
                                                key={student.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                                    studentModal.studentId === student.id.toString()
                                                        ? "bg-blue-100 border-2 border-blue-400"
                                                        : "bg-slate-50 hover:bg-slate-100 border-2 border-transparent"
                                                }`}
                                                onClick={() => studentModal.setStudentId(student.id.toString())}
                                            >
                                                <Avatar
                                                    name={student.full_name}
                                                    size="sm"
                                                    className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{student.full_name}</p>
                                                    <p className="text-xs text-slate-500">{student.student_id}</p>
                                                </div>
                                                {studentModal.studentId === student.id.toString() && (
                                                    <Icon icon="solar:check-circle-bold" className="text-blue-500 text-xl" />
                                                )}
                                            </div>
                                        ))}
                                        {filteredStudents().length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                ไม่พบนักศึกษาที่ค้นหา
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tab>
                            <Tab key="bulk" title="เพิ่มหลายคน (Paste)">
                                <div className="space-y-4 pt-4">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-700">
                                            <Icon icon="solar:info-circle-bold" className="inline mr-1" />
                                            วางรหัสนักศึกษา (1 รหัสต่อบรรทัด) จาก Excel หรือ Text
                                        </p>
                                    </div>
                                    <Textarea
                                        label="รหัสนักศึกษา"
                                        placeholder="วางรหัสนักศึกษาที่นี่&#10;65010001&#10;65010002&#10;65010003"
                                        value={studentModal.pasteData}
                                        onValueChange={(value) => {
                                            studentModal.setPasteData(value);
                                            parseExcelData(value);
                                        }}
                                        minRows={5}
                                    />
                                    {studentModal.parsedStudents.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-700">ผลการตรวจสอบ:</p>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {studentModal.parsedStudents.map((result, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center justify-between p-2 rounded text-sm ${
                                                            result.status === "matched"
                                                                ? "bg-green-50 text-green-700"
                                                                : result.status === "already_enrolled"
                                                                    ? "bg-amber-50 text-amber-700"
                                                                    : "bg-red-50 text-red-700"
                                                        }`}
                                                    >
                                                        <span>{result.inputValue}</span>
                                                        <span className="text-xs">
                                                            {result.status === "matched" && result.matchedStudent?.full_name}
                                                            {result.status === "already_enrolled" && "ลงทะเบียนแล้ว"}
                                                            {result.status === "not_found" && "ไม่พบ"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <Chip size="sm" color="success" variant="flat">
                                                    จับคู่สำเร็จ {studentModal.parsedStudents.filter(p => p.status === "matched").length}
                                                </Chip>
                                                <Chip size="sm" color="warning" variant="flat">
                                                    ลงทะเบียนแล้ว {studentModal.parsedStudents.filter(p => p.status === "already_enrolled").length}
                                                </Chip>
                                                <Chip size="sm" color="danger" variant="flat">
                                                    ไม่พบ {studentModal.parsedStudents.filter(p => p.status === "not_found").length}
                                                </Chip>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Tab>
                        </Tabs>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={studentModal.reset}>
                            ยกเลิก
                        </Button>
                        {studentModal.mode === "single" ? (
                            <Button 
                                color="primary" 
                                onPress={handleAddStudent}
                                isLoading={isSubmitting}
                                isDisabled={!studentModal.studentId}
                            >
                                เพิ่มนักศึกษา
                            </Button>
                        ) : (
                            <Button 
                                color="primary" 
                                onPress={handleBulkAddStudents}
                                isLoading={isSubmitting}
                                isDisabled={studentModal.parsedStudents.filter(p => p.status === "matched").length === 0}
                            >
                                เพิ่มนักศึกษา ({studentModal.parsedStudents.filter(p => p.status === "matched").length})
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Create Team Modal */}
            <Modal 
                isOpen={teamModal.isOpen} 
                onClose={teamModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        {teamModal.formationMethod === "random" 
                            ? `สุ่มกลุ่ม${teamModal.type === "permanent" ? "โปรเจกต์" : "รายสัปดาห์"}อัตโนมัติ`
                            : `สร้างกลุ่ม${teamModal.type === "permanent" ? "โปรเจกต์" : "รายสัปดาห์"}`
                        }
                        {teamModal.type === "weekly" && ` - สัปดาห์ที่ ${selectedWeek}`}
                    </ModalHeader>
                    <ModalBody>
                        {teamModal.formationMethod === "random" ? (
                            <div className="space-y-4">
                                <Input
                                    type="number"
                                    label="จำนวนสมาชิกต่อกลุ่ม"
                                    value={teamModal.size.toString()}
                                    onValueChange={(v) => teamModal.setSize(parseInt(v) || 3)}
                                    min={2}
                                    max={10}
                                />
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-sm text-slate-600">
                                        นักศึกษาที่ยังไม่มีกลุ่ม: {getUnassignedStudents(teamModal.type, teamModal.type === "weekly" ? selectedWeek : undefined).length} คน
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        จะสร้างกลุ่มได้ประมาณ: {Math.ceil(getUnassignedStudents(teamModal.type, teamModal.type === "weekly" ? selectedWeek : undefined).length / teamModal.size)} กลุ่ม
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Input
                                    label="ชื่อกลุ่ม"
                                    placeholder="เช่น กลุ่ม 1, Team Alpha"
                                    value={teamModal.name}
                                    onValueChange={teamModal.setName}
                                    isRequired
                                />
                                
                                <Tabs
                                    variant="underlined"
                                    classNames={{
                                        tabList: "gap-4",
                                        cursor: "bg-blue-500",
                                        tab: "px-0 h-10",
                                        tabContent: "group-data-[selected=true]:text-blue-600"
                                    }}
                                >
                                    <Tab key="select" title="เลือกจากรายชื่อ">
                                        <div className="space-y-3 pt-3">
                                            <p className="text-sm text-slate-500">
                                                เลือกสมาชิก ({teamModal.members.length} คนที่เลือก)
                                            </p>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {getUnassignedStudents(teamModal.type, teamModal.type === "weekly" ? selectedWeek : undefined).map(student => (
                                                    <div
                                                        key={student.id}
                                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                            teamModal.members.includes(student.id)
                                                                ? "bg-blue-100 border border-blue-300"
                                                                : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                                                        }`}
                                                        onClick={() => {
                                                            if (teamModal.members.includes(student.id)) {
                                                                teamModal.setMembers(teamModal.members.filter(id => id !== student.id));
                                                            } else {
                                                                teamModal.setMembers([...teamModal.members, student.id]);
                                                            }
                                                        }}
                                                    >
                                                        <Checkbox
                                                            isSelected={teamModal.members.includes(student.id)}
                                                            size="sm"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{student.full_name}</p>
                                                            <p className="text-xs text-slate-500">{student.student_id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Tab>
                                    <Tab key="paste" title="วางรหัส (Paste)">
                                        <div className="space-y-3 pt-3">
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-sm text-amber-700">
                                                    <Icon icon="solar:info-circle-bold" className="inline mr-1" />
                                                    วางรหัสนักศึกษา (1 รหัสต่อบรรทัด)
                                                </p>
                                            </div>
                                            <Textarea
                                                placeholder="วางรหัสนักศึกษาที่นี่"
                                                value={teamModal.pasteData}
                                                onValueChange={(value) => {
                                                    teamModal.setPasteData(value);
                                                    parseTeamExcelData(value);
                                                }}
                                                minRows={4}
                                            />
                                            {teamModal.isParsing && (
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Spinner size="sm" />
                                                    กำลังค้นหา...
                                                </div>
                                            )}
                                            {teamModal.parsedMembers.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2 text-xs">
                                                        <Chip size="sm" color="success" variant="flat">
                                                            พบ {teamModal.parsedMembers.filter(p => p.status === "matched").length}
                                                        </Chip>
                                                        <Chip size="sm" color="warning" variant="flat">
                                                            มีกลุ่มแล้ว {teamModal.parsedMembers.filter(p => p.status === "already_in_team").length}
                                                        </Chip>
                                                        <Chip size="sm" color="danger" variant="flat">
                                                            ไม่พบ {teamModal.parsedMembers.filter(p => p.status === "not_found").length}
                                                        </Chip>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Tab>
                                </Tabs>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={teamModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleCreateTeam}
                            isLoading={isSubmitting}
                            isDisabled={
                                teamModal.formationMethod === "manual" 
                                    ? !teamModal.name.trim() || teamModal.members.length === 0
                                    : getUnassignedStudents(teamModal.type, teamModal.type === "weekly" ? selectedWeek : undefined).length === 0
                            }
                            className={teamModal.type === "permanent" 
                                ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500"
                            }
                        >
                            {teamModal.formationMethod === "random" ? "สุ่มกลุ่ม" : "สร้างกลุ่ม"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Team Modal */}
            <Modal 
                isOpen={editTeamModal.isOpen} 
                onClose={editTeamModal.reset}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>แก้ไขกลุ่ม</ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="ชื่อกลุ่ม"
                                value={editTeamModal.name}
                                onValueChange={editTeamModal.setName}
                                isRequired
                            />
                            <div>
                                <p className="text-sm text-slate-500 mb-2">
                                    สมาชิก ({editTeamModal.members.length} คน)
                                </p>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {getAvailableStudentsForEdit().map(student => (
                                        <div
                                            key={student.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                editTeamModal.members.includes(student.id)
                                                    ? "bg-blue-100 border border-blue-300"
                                                    : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                                            }`}
                                            onClick={() => {
                                                if (editTeamModal.members.includes(student.id)) {
                                                    editTeamModal.setMembers(editTeamModal.members.filter(id => id !== student.id));
                                                } else {
                                                    editTeamModal.setMembers([...editTeamModal.members, student.id]);
                                                }
                                            }}
                                        >
                                            <Checkbox
                                                isSelected={editTeamModal.members.includes(student.id)}
                                                size="sm"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{student.full_name}</p>
                                                <p className="text-xs text-slate-500">{student.student_id}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={editTeamModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="primary" 
                            onPress={handleSaveEditedTeam}
                            isLoading={isSubmitting}
                            isDisabled={!editTeamModal.name.trim() || editTeamModal.members.length === 0}
                        >
                            บันทึก
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal 
                isOpen={deleteModal.isOpen} 
                onClose={deleteModal.reset}
                size="sm"
            >
                <ModalContent>
                    <ModalHeader className="text-red-600">
                        <Icon icon="solar:danger-triangle-bold" className="mr-2" />
                        ยืนยันการลบ
                    </ModalHeader>
                    <ModalBody>
                        {deleteModal.target?.type === "section" && (
                            <p>
                                คุณต้องการลบกลุ่มเรียน <strong>Section {deleteModal.target.sectionNo}</strong> หรือไม่?
                                {(deleteModal.target.sectionStudentCount || 0) > 0 && (
                                    <span className="text-red-600 block mt-2">
                                        ⚠️ มีนักศึกษาในกลุ่มนี้ {deleteModal.target.sectionStudentCount} คน
                                    </span>
                                )}
                            </p>
                        )}
                        {deleteModal.target?.type === "student" && (
                            <p>
                                คุณต้องการนำ <strong>{deleteModal.target.studentName}</strong> ({deleteModal.target.studentCode}) 
                                ออกจากกลุ่มเรียน Section {deleteModal.target.sectionNo} หรือไม่?
                            </p>
                        )}
                        {deleteModal.target?.type === "team" && (
                            <p>
                                คุณต้องการลบกลุ่ม <strong>{deleteModal.target.teamName}</strong> หรือไม่?
                                {(deleteModal.target.teamMembers?.length || 0) > 0 && (
                                    <span className="text-slate-600 block mt-2">
                                        มีสมาชิก {deleteModal.target.teamMembers?.length} คน
                                    </span>
                                )}
                            </p>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={deleteModal.reset}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={() => {
                                if (deleteModal.target?.type === "section") {
                                    // Call confirmRemoveSection from hook
                                    // We need to expose this in the hook
                                } else if (deleteModal.target?.type === "student") {
                                    handleRemoveStudent();
                                } else if (deleteModal.target?.type === "team") {
                                    handleDeleteTeam();
                                }
                            }}
                            isLoading={isSubmitting}
                        >
                            ลบ
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Bulk Delete Teams Modal */}
            <Modal 
                isOpen={bulkDeleteModal.isOpen} 
                onClose={() => bulkDeleteModal.setIsOpen(false)}
                size="sm"
            >
                <ModalContent>
                    <ModalHeader className="text-red-600">
                        <Icon icon="solar:danger-triangle-bold" className="mr-2" />
                        ยืนยันการลบทั้งหมด
                    </ModalHeader>
                    <ModalBody>
                        <p>
                            คุณต้องการลบกลุ่มทั้งหมดในสัปดาห์ที่ {selectedWeek} หรือไม่?
                        </p>
                        <p className="text-slate-600 mt-2">
                            จะลบทั้งหมด {weeklyTeams[selectedWeek]?.length || 0} กลุ่ม
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => bulkDeleteModal.setIsOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={handleBulkDeleteTeams}
                            isLoading={isSubmitting}
                        >
                            ลบทั้งหมด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
