"use client";

import { getEnv } from "@/utils/env";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface PatientDeletionFlowProps {
  patientId: string;
  patientName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PatientDeletionFlow({
  patientId,
  patientName,
  onSuccess,
  onCancel,
}: PatientDeletionFlowProps) {
  const [step, setStep] = useState(1);
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStep1Continue = () => setStep(2);
  const handleStep2Proceed = () => setStep(3);
  
  const handleFinalDelete = async () => {
    if (confirmText !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}`, {
        method: "DELETE",
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to delete patient:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md" onClose={onCancel}>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                ⚠️ Delete Patient Record
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                This patient record contains demographics, insurance, appointments, encounters, and clinical data.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep1Continue}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                ⚠️ Permanent Action
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-700 space-y-2">
                <p>Deleting this patient may affect medical records, billing, and audit logs.</p>
                <p className="font-semibold text-red-600">This action cannot be undone.</p>
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">I understand the consequences</span>
              </label>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStep2Proceed}
                  disabled={!understood}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                🔐 Final Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Please type <strong>DELETE</strong> to permanently remove this patient.
              </p>
              
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalDelete}
                  disabled={confirmText !== "DELETE" || isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}