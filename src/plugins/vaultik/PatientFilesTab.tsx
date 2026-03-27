"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useVaultikApi } from "./useVaultikApi";
import type { VaultikFile } from "./types";
import { confirmDialog } from "@/utils/toast";
import { formatDisplayDate } from "@/utils/dateUtils";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  return formatDisplayDate(dateStr) || dateStr;
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/gif": "🖼️",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
};

export default function PatientFilesTab({ patientId }: { patientId: string }) {
  const api = useVaultikApi();
  const [files, setFiles] = useState<VaultikFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.list(patientId);
      setFiles(result?.files || []);
    } catch (e: any) {
      setError(e.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) fetchFiles();
  }, [patientId, fetchFiles]);

  const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".csv", ".xls", ".xlsx", ".txt", ".zip", ".dicom"];

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    // Validate file types
    const invalidFiles = Array.from(fileList).filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return !ALLOWED_EXTENSIONS.includes(ext);
    });
    if (invalidFiles.length > 0) {
      setError(`Unsupported file type(s): ${invalidFiles.map((f) => f.name).join(", ")}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        await api.upload(file, patientId, "documents");
      }
      await fetchFiles();
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    const confirmed = await confirmDialog(`Delete "${fileName}"?`);
    if (!confirmed) return;
    try {
      await api.deleteFile(fileId);
      await fetchFiles();
    } catch (e: any) {
      setError(e.message || "Delete failed");
    }
  };

  const handleDownload = async (file: VaultikFile) => {
    try {
      await api.download(file.id);
    } catch (e: any) {
      setError(e.message || "Download failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Patient Files
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xls,.xlsx,.txt,.zip,.dicom"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleUpload(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <p className="text-sm text-gray-400">
            {uploading
              ? "Uploading..."
              : "Drag & drop files here or click Upload"}
          </p>
        </div>

        {/* File list */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No files uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg shrink-0">
                  {FILE_ICONS[file.contentType] || "📎"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)} · {formatDate(file.createdAt)}
                    {file.category && ` · ${file.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Download"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(file.id, file.originalName)
                    }
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Delete"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-4 text-center">
          Powered by Vaultik
        </p>
      </div>
    </div>
  );
}
