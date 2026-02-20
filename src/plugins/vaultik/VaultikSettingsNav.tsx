"use client";

import React, { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { VaultikConfig } from "./types";

const DEFAULT_CONFIG: VaultikConfig = {
  storage_mode: "files-service",
  max_file_size_mb: 50,
  allowed_content_types: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  retention_days: 0,
  custom_s3: {},
};

export default function VaultikSettingsNav() {
  const [config, setConfig] = useState<VaultikConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/app-installations/vaultik");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.config) {
          setConfig({ ...DEFAULT_CONFIG, ...json.data.config });
        }
      }
    } catch (e) {
      console.error("Failed to load Vaultik config:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth("/api/app-installations/vaultik/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateCustomS3 = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      custom_s3: { ...prev.custom_s3, [field]: value },
    }));
  };

  const hasCustomS3 =
    config.custom_s3?.endpoint && config.custom_s3?.access_key && config.custom_s3?.secret_key;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        Loading Vaultik settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Vaultik Storage Settings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure file storage for your practice
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Storage Mode */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Storage Mode
        </h3>
        <div className="flex gap-3">
          <label
            className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              config.storage_mode === "files-service"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <input
              type="radio"
              name="storage_mode"
              value="files-service"
              checked={config.storage_mode === "files-service"}
              onChange={() =>
                setConfig((prev) => ({ ...prev, storage_mode: "files-service" }))
              }
              className="text-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Vaultik Cloud
              </p>
              <p className="text-xs text-gray-400">
                S3-compatible cloud storage
              </p>
            </div>
          </label>
          <label
            className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              config.storage_mode === "local"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <input
              type="radio"
              name="storage_mode"
              value="local"
              checked={config.storage_mode === "local"}
              onChange={() =>
                setConfig((prev) => ({ ...prev, storage_mode: "local" }))
              }
              className="text-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Local Storage
              </p>
              <p className="text-xs text-gray-400">
                Server filesystem
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom S3 (only shown for files-service mode) */}
      {config.storage_mode === "files-service" && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Custom S3 Configuration
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            {hasCustomS3
              ? "Using your custom S3 storage"
              : "Using platform default storage. Configure below to use your own S3."}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                S3 Endpoint URL
              </label>
              <input
                type="text"
                value={config.custom_s3?.endpoint || ""}
                onChange={(e) => updateCustomS3("endpoint", e.target.value)}
                placeholder="https://s3.amazonaws.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={config.custom_s3?.region || ""}
                  onChange={(e) => updateCustomS3("region", e.target.value)}
                  placeholder="us-east-1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Bucket
                </label>
                <input
                  type="text"
                  value={config.custom_s3?.bucket || ""}
                  onChange={(e) => updateCustomS3("bucket", e.target.value)}
                  placeholder="my-practice-files"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Access Key
              </label>
              <input
                type="password"
                value={config.custom_s3?.access_key || ""}
                onChange={(e) => updateCustomS3("access_key", e.target.value)}
                placeholder="AKIA..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Secret Key
              </label>
              <input
                type="password"
                value={config.custom_s3?.secret_key || ""}
                onChange={(e) => updateCustomS3("secret_key", e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          General Settings
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={config.max_file_size_mb}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  max_file_size_mb: parseInt(e.target.value) || 50,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Retention (days, 0 = forever)
            </label>
            <input
              type="number"
              min={0}
              value={config.retention_days || 0}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  retention_days: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
