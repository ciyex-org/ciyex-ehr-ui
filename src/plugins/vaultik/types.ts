export interface VaultikFile {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  category: string;
  s3Key?: string;
  sourceService?: string;
  referenceId?: string;
  downloadUrl: string;
  createdAt: string;
}

export interface VaultikFileList {
  files: VaultikFile[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface VaultikConfig {
  storage_mode: "files-service" | "local";
  max_file_size_mb: number;
  allowed_content_types?: string[];
  retention_days?: number;
  custom_s3?: {
    endpoint?: string;
    region?: string;
    bucket?: string;
    access_key?: string;
    secret_key?: string;
  };
}
