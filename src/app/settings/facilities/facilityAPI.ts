// src/app/settings/facilities/facilityAPI.ts

import { fetchWithAuth } from "@/utils/fetchWithAuth";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export const facilityAPI = {
  async getAll() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/facilities`);
      if (!res.ok) {
        let message = `Failed to fetch facilities (${res.status})`;
        try {
          message = (await res.text()) || message;
        } catch {}
        return { success: false, data: [], message };
      }
      const text = await res.text();
      if (!text) return { success: false, data: [], message: "Empty response" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Success" };
    } catch (error) {
      console.error("Error in getAll:", error);
      return { success: false, data: [], message: error instanceof Error ? error.message : "Unknown error" };
        const errorText = await res.text().catch(() => "");
        console.error(`Failed to fetch facilities (${res.status}):`, errorText);
        return { 
          success: false, 
          data: [], 
          message: `Failed to load facilities (${res.status}). ${errorText || 'Please check if the backend server is running.'}` 
        };
      }
      const text = await res.text();
      if (!text) return { success: true, data: [], message: "No facilities found" };
      const parsed = JSON.parse(text);
      // Handle different response formats
      const data = Array.isArray(parsed) ? parsed : (parsed.data || []);
      return { success: true, data, message: "Success" };
    } catch (error) {
      console.error("Error in getAll:", error);
      return { 
        success: false, 
        data: [], 
        message: `Network error: ${error instanceof Error ? error.message : 'Unable to connect to server'}` 
      };
    }
  },
  async getStatistics() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/facilities/statistics`);
      if (!res.ok) {
        return { success: false, data: { totalCount: 0, activeCount: 0, inactiveCount: 0 }, message: `Failed (${res.status})` };
      }
      const text = await res.text();
      if (!text) return { success: false, data: { totalCount: 0, activeCount: 0, inactiveCount: 0 }, message: "Empty response" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Success" };
    } catch (error) {
      console.error("Error in getStatistics:", error);
      return { success: false, data: { totalCount: 0, activeCount: 0, inactiveCount: 0 }, message: "Error loading statistics" };
    }
  },
  async create(facility: Record<string, any>) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/facilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facility),
      });
      if (!res.ok) {
        let message = `Failed to create facility (${res.status})`;
        try {
          message = (await res.text()) || message;
        } catch {}
        return { success: false, data: {}, message };
      }
      const text = await res.text();
      if (!text) return { success: false, data: {}, message: "Empty response" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Success" };
    } catch (error) {
      console.error("Error in create:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Unknown error" };
      return { success: true, data: parsed.data || parsed, message: "Facility created successfully" };
    } catch (error) {
      console.error("Error in create:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Failed to create facility" };
    }
  },
  async update(id: string | number, facility: Record<string, any>) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/facilities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facility),
      });
      if (!res.ok) {
        let message = `Failed to update facility (${res.status})`;
        try {
          message = (await res.text()) || message;
        } catch {}
        return { success: false, data: {}, message };
      }
      const text = await res.text();
      if (!text) return { success: false, data: {}, message: "Empty response" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Success" };
    } catch (error) {
      console.error("Error in update:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Unknown error" };
      return { success: true, data: parsed.data || parsed, message: "Facility updated successfully" };
    } catch (error) {
      console.error("Error in update:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Failed to update facility" };
    }
  },
  async delete(id: string | number) {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/facilities/${id}`, {
        method: "DELETE" });
        method: "DELETE"
      });
      if (!res.ok) {
        let message = `Failed to delete facility (${res.status})`;
        try {
          message = (await res.text()) || message;
        } catch {}
        return { success: false, data: {}, message };
      }
      const text = await res.text();
      if (!text) return { success: true, data: {}, message: "Deleted successfully" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Success" };
    } catch (error) {
      console.error("Error in delete:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Unknown error" };
      if (!text) return { success: true, data: {}, message: "Facility deleted successfully" };
      const parsed = JSON.parse(text);
      return { success: true, data: parsed.data || parsed, message: "Facility deleted successfully" };
    } catch (error) {
      console.error("Error in delete:", error);
      return { success: false, data: {}, message: error instanceof Error ? error.message : "Failed to delete facility" };
    }
  },
};
