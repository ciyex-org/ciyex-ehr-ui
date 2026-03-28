import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { VaultikFile, VaultikFileList } from "./types";

export function useVaultikApi() {
  const upload = async (
    file: File,
    patientId?: string,
    category?: string
  ): Promise<VaultikFile> => {
    const formData = new FormData();
    formData.append("file", file);
    if (patientId) formData.append("patientId", patientId);
    if (category) formData.append("category", category);

    const res = await fetchWithAuth("/api/files-proxy/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed: " + res.statusText);
    const json = await res.json();
    return json.data;
  };

  const list = async (
    patientId?: string,
    category?: string,
    page = 0,
    size = 20
  ): Promise<VaultikFileList> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (patientId) params.set("patientId", patientId);
    if (category) params.set("category", category);

    const res = await fetchWithAuth(`/api/files-proxy/list?${params}`);
    if (!res.ok) throw new Error("List failed: " + res.statusText);
    const json = await res.json();
    return json.data;
  };

  const download = async (fileId: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/files-proxy/${fileId}/download`);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    const fileName = disposition?.match(/filename="(.+)"/)?.[1] || "file";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (fileId: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/files-proxy/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed: " + res.statusText);
  };

  const getPresignedUrl = async (
    fileId: string,
    expiry = 3600
  ): Promise<string> => {
    const res = await fetchWithAuth(
      `/api/files-proxy/${fileId}/presigned-url?expiry=${expiry}`
    );
    if (!res.ok) throw new Error("Presigned URL failed");
    const json = await res.json();
    return json.data.url;
  };

  return { upload, list, download, deleteFile, getPresignedUrl };
}
