"use client";

import AdminLayout from "@/app/(admin)/layout";
import React, { useState, useCallback } from "react";
import { BookOpen, Send } from "lucide-react";
import { EducationMaterial } from "@/components/education/types";
import MaterialLibrary from "@/components/education/MaterialLibrary";
import MaterialForm from "@/components/education/MaterialForm";
import MaterialDetail from "@/components/education/MaterialDetail";
import PatientAssignments from "@/components/education/PatientAssignments";
import AssignMaterialModal from "@/components/education/AssignMaterialModal";

type ActiveTab = "library" | "assignments";
type LibraryView = "list" | "detail";

export default function EducationPage() {
  /* ---- state ---- */
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [libraryView, setLibraryView] = useState<LibraryView>("list");
  const [selectedMaterial, setSelectedMaterial] = useState<EducationMaterial | null>(null);

  /* form slide-out */
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<EducationMaterial | null>(null);

  /* assign modal */
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMaterial, setAssignMaterial] = useState<EducationMaterial | null>(null);

  /* refresh triggers */
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [assignmentRefresh, setAssignmentRefresh] = useState(0);

  /* ---- callbacks ---- */
  const handleSelectMaterial = useCallback((m: EducationMaterial) => {
    setSelectedMaterial(m);
    setLibraryView("detail");
  }, []);

  const handleBackToList = useCallback(() => {
    setLibraryView("list");
    setSelectedMaterial(null);
  }, []);

  const handleNewMaterial = useCallback(() => {
    setEditingMaterial(null);
    setFormOpen(true);
  }, []);

  const handleEditMaterial = useCallback((m: EducationMaterial) => {
    setEditingMaterial(m);
    setFormOpen(true);
  }, []);

  const handleAssignMaterial = useCallback((m: EducationMaterial) => {
    setAssignMaterial(m);
    setAssignModalOpen(true);
  }, []);

  const handleOpenAssignModal = useCallback(() => {
    setAssignMaterial(null);
    setAssignModalOpen(true);
  }, []);

  const handleMaterialSaved = useCallback(() => {
    setLibraryRefresh((k) => k + 1);
  }, []);

  const handleAssigned = useCallback(() => {
    setAssignmentRefresh((k) => k + 1);
  }, []);

  /* ---- responsive tab bar (small screens) ---- */
  const tabBar = (
    <div className="shrink-0 flex border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 lg:hidden">
      <button
        onClick={() => setActiveTab("library")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition relative ${
          activeTab === "library"
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Library
        {activeTab === "library" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
        )}
      </button>
      <button
        onClick={() => setActiveTab("assignments")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition relative ${
          activeTab === "assignments"
            ? "text-green-600 dark:text-green-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
        }`}
      >
        <Send className="w-4 h-4" />
        Assignments
        {activeTab === "assignments" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400" />
        )}
      </button>
    </div>
  );

  /* ---- library panel content ---- */
  const libraryPanel = libraryView === "detail" && selectedMaterial ? (
    <MaterialDetail material={selectedMaterial} onBack={handleBackToList} />
  ) : (
    <MaterialLibrary
      onSelectMaterial={handleSelectMaterial}
      onEditMaterial={handleEditMaterial}
      onNewMaterial={handleNewMaterial}
      onAssignMaterial={handleAssignMaterial}
      refreshKey={libraryRefresh}
    />
  );

  /* ---- assignments panel content ---- */
  const assignmentsPanel = (
    <PatientAssignments
      onAssignNew={handleOpenAssignModal}
      refreshKey={assignmentRefresh}
    />
  );

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Mobile tab bar */}
        {tabBar}

        {/* Content area */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* --- Desktop: two columns --- */}
          {/* Left panel (library) */}
          <div className={`${activeTab === "library" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-[3] min-w-0 bg-white dark:bg-slate-900 lg:border-r border-gray-200 dark:border-slate-700 overflow-hidden`}>
            {libraryPanel}
          </div>

          {/* Right panel (assignments) */}
          <div className={`${activeTab === "assignments" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-[2] min-w-0 bg-white dark:bg-slate-900 overflow-hidden`}>
            {assignmentsPanel}
          </div>
        </div>

        {/* Slide-out form */}
        <MaterialForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          material={editingMaterial}
          onSaved={handleMaterialSaved}
        />

        {/* Assign modal */}
        <AssignMaterialModal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onAssigned={handleAssigned}
          preselectedMaterial={assignMaterial}
        />
      </div>
    </AdminLayout>
  );
}
