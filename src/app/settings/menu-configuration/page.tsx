"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { useMenu, type MenuItemNode } from "@/context/MenuContext";

import IconPicker from "@/components/settings/IconPicker";
import JsonCodeView from "@/components/settings/JsonCodeView";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  RotateCcw, Pencil, X, Check, Eye, EyeOff, Undo2, Code,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const API_URL = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

type MenuItemFlat = {
  id: string;
  menuId: string;
  parentId: string | null;
  itemKey: string;
  label: string;
  icon: string | null;
  screenSlug: string | null;
  position: number;
  isCustom?: boolean;      // added via override
  isModified?: boolean;    // has modify override
  isReordered?: boolean;   // has reorder override
};

type Override = {
  id: string;
  orgId: string;
  menuCode: string;
  itemId: string | null;
  action: string;
  data: string | null;
};

export default function MenuConfigurationPage() {
  const { refreshMenu } = useMenu();
  const [showCode, setShowCode] = useState(false);
  const [items, setItems] = useState<MenuItemFlat[]>([]);
  const [hiddenItems, setHiddenItems] = useState<MenuItemFlat[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [hasCustomizations, setHasCustomizations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", icon: "", screenSlug: "", fhirResources: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ label: "", icon: "FileText", screenSlug: "", itemKey: "", fhirResources: "" });
  const [showHidden, setShowHidden] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const base = API_URL();

      // Include practice type if available
      const practiceType = typeof window !== "undefined" ? localStorage.getItem("practiceType") : null;
      const ptParam = practiceType ? `?practiceType=${encodeURIComponent(practiceType)}` : "";

      // Load overrides, has-custom check, and resolved menu in parallel
      const [overridesRes, customRes, menuRes] = await Promise.all([
        fetchWithAuth(`${base}/api/menus/ehr-sidebar/overrides`),
        fetchWithAuth(`${base}/api/menus/ehr-sidebar/has-custom`),
        fetchWithAuth(`${base}/api/menus/ehr-sidebar${ptParam}`),
      ]);

      const overridesData: Override[] = await overridesRes.json();
      const customData = await customRes.json();
      const menuData = await menuRes.json();

      setOverrides(overridesData);
      setHasCustomizations(customData.hasCustom);

      // Build sets for quick lookup
      const hiddenIds = new Set(
        overridesData.filter(o => o.action === "hide").map(o => o.itemId)
      );
      const modifiedIds = new Set(
        overridesData.filter(o => o.action === "modify").map(o => o.itemId)
      );
      const reorderedIds = new Set(
        overridesData.filter(o => o.action === "reorder").map(o => o.itemId)
      );
      const customItemIds = new Set(
        overridesData.filter(o => o.action === "add").map(o => o.id)
      );

      // Flatten the resolved menu tree
      const flatItems: MenuItemFlat[] = [];
      function flatten(nodes: MenuItemNode[], parentId: string | null) {
        for (const node of nodes) {
          flatItems.push({
            id: node.item.id,
            menuId: menuData.menu.id,
            parentId,
            itemKey: node.item.itemKey,
            label: node.item.label,
            icon: node.item.icon,
            screenSlug: node.item.screenSlug,
            position: node.item.position,
            isCustom: customItemIds.has(node.item.id),
            isModified: modifiedIds.has(node.item.id),
            isReordered: reorderedIds.has(node.item.id),
          });
          if (node.children?.length) {
            flatten(node.children, node.item.id);
          }
        }
      }
      flatten(menuData.items || [], null);
      setItems(flatItems);

      // Now load the global menu (without overrides) to find hidden items
      // We can derive hidden items from overrides - they have item_id references
      // We need to fetch the raw global menu to get labels for hidden items
      if (hiddenIds.size > 0) {
        // Load global menu directly (no org context) to get hidden item labels
        try {
          const globalRes = await fetch(`${base}/api/menus/ehr-sidebar`, {
            headers: { "Accept": "application/json" },
          });
          if (globalRes.ok) {
            const globalData = await globalRes.json();
            const globalFlat: MenuItemFlat[] = [];
            function flattenGlobal(nodes: MenuItemNode[], parentId: string | null) {
              for (const node of nodes) {
                globalFlat.push({
                  id: node.item.id,
                  menuId: globalData.menu.id,
                  parentId,
                  itemKey: node.item.itemKey,
                  label: node.item.label,
                  icon: node.item.icon,
                  screenSlug: node.item.screenSlug,
                  position: node.item.position,
                });
                if (node.children?.length) {
                  flattenGlobal(node.children, node.item.id);
                }
              }
            }
            flattenGlobal(globalData.items || [], null);
            setHiddenItems(globalFlat.filter(i => hiddenIds.has(i.id)));
          }
        } catch {
          // If we can't get global menu, just show IDs for hidden items
          setHiddenItems(
            Array.from(hiddenIds).filter(Boolean).map(id => ({
              id: id!,
              menuId: "",
              parentId: null,
              itemKey: "",
              label: `Item ${id}`,
              icon: null,
              screenSlug: null,
              position: 0,
            }))
          );
        }
      } else {
        setHiddenItems([]);
      }

      // Expand top-level items by default
      const topIds = new Set(flatItems.filter(i => !i.parentId).map(i => i.id));
      setExpandedItems(prev => prev.size > 0 ? prev : topIds);
    } catch (err) {
      console.error("Failed to load menu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Hide a menu item (store override)
  const handleHideItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!(await confirmDialog(`Hide "${item?.label}" from sidebar? You can restore it later.`))) return;
    try {
      setSaving(true);
      const base = API_URL();
      await fetchWithAuth(`${base}/api/menus/ehr-sidebar/items/${itemId}/hide`, { method: "POST" });
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to hide item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Unhide a menu item (remove hide override)
  const handleUnhideItem = async (itemId: string) => {
    try {
      setSaving(true);
      const base = API_URL();
      await fetchWithAuth(`${base}/api/menus/ehr-sidebar/items/${itemId}/hide`, { method: "DELETE" });
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to unhide item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Modify a menu item (store modify override)
  const saveEdit = async (itemId: string) => {
    try {
      setSaving(true);
      const base = API_URL();
      const changes: Record<string, string> = {};
      if (editForm.label) changes.label = editForm.label;
      if (editForm.icon) changes.icon = editForm.icon;
      if (editForm.screenSlug) changes.screenSlug = editForm.screenSlug;

      await fetchWithAuth(`${base}/api/menus/ehr-sidebar/items/${itemId}/modify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      // Save FHIR resources to tab_field_config if provided
      if (editForm.fhirResources) {
        const slug = editForm.screenSlug || "";
        const pageKeyMatch = slug.match(/\/settings\/p\/(.+)/);
        const configKeyMatch = slug.match(/\/settings\/layout-settings\/config\/(.+)/);
        const tabKey = pageKeyMatch?.[1] || configKeyMatch?.[1];
        if (tabKey) {
          const fhirArray = editForm.fhirResources
            .split(",").map(s => s.trim()).filter(Boolean).map(type => ({ type }));
          await fetchWithAuth(`${base}/api/tab-field-config/${tabKey}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fhirResources: fhirArray,
              fieldConfig: { sections: [] },
            }),
          });
        }
      }

      setEditingItem(null);
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to modify item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Revert modifications on a single item
  const handleRevertItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!(await confirmDialog(`Revert changes to "${item?.label}"?`))) return;
    try {
      setSaving(true);
      const base = API_URL();
      // Find and delete the modify + reorder overrides for this item
      const itemOverrides = overrides.filter(
        o => o.itemId === itemId && (o.action === "modify" || o.action === "reorder")
      );
      for (const ov of itemOverrides) {
        await fetchWithAuth(`${base}/api/menus/overrides/${ov.id}`, { method: "DELETE" });
      }
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to revert item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete a custom item (remove the add override)
  const handleDeleteCustomItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!(await confirmDialog(`Delete custom item "${item?.label}"?`))) return;
    try {
      setSaving(true);
      const base = API_URL();
      // The item ID for custom items IS the override ID
      const addOverride = overrides.find(o => o.action === "add" && o.id === itemId);
      if (addOverride) {
        await fetchWithAuth(`${base}/api/menus/overrides/${addOverride.id}`, { method: "DELETE" });
      }
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to delete custom item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Add custom item
  const addItem = async () => {
    if (!newItem.label.trim()) return;
    const key = newItem.itemKey.trim() || newItem.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const siblings = getChildren(addParentId);

    try {
      setSaving(true);
      const base = API_URL();
      await fetchWithAuth(`${base}/api/menus/ehr-sidebar/custom-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemKey: key,
          label: newItem.label,
          icon: newItem.icon || null,
          screenSlug: newItem.screenSlug || null,
          parentId: addParentId,
          position: siblings.length,
        }),
      });

      // Save FHIR resources to tab_field_config if provided
      if (newItem.fhirResources) {
        const fhirArray = newItem.fhirResources
          .split(",").map(s => s.trim()).filter(Boolean).map(type => ({ type }));
        await fetchWithAuth(`${base}/api/tab-field-config/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fhirResources: fhirArray,
            fieldConfig: { sections: [] },
            category: "Settings",
          }),
        });
      }

      setShowAddForm(false);
      setNewItem({ label: "", icon: "FileText", screenSlug: "", itemKey: "", fhirResources: "" });
      setAddParentId(null);
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setSaving(false);
    }
  };

  // Move item up/down (store reorder overrides)
  const moveItem = async (itemId: string, direction: "up" | "down") => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const siblings = getChildren(item.parentId);
    const idx = siblings.findIndex(s => s.id === itemId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    // Build reorder payload for the swapped pair
    const ordering = siblings.map((s, i) => {
      if (i === idx) return { id: siblings[swapIdx].id, position: i };
      if (i === swapIdx) return { id: siblings[idx].id, position: i };
      return { id: s.id, position: i };
    });

    try {
      setSaving(true);
      const base = API_URL();
      await fetchWithAuth(`${base}/api/menus/ehr-sidebar/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ordering),
      });
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to reorder:", err);
    } finally {
      setSaving(false);
    }
  };

  // Reset all customizations
  const handleResetToDefaults = async () => {
    if (!(await confirmDialog("Reset sidebar menu to defaults? All your customizations (hidden items, label changes, reordering, custom items) will be removed."))) return;
    try {
      setSaving(true);
      const base = API_URL();
      const res = await fetchWithAuth(`${base}/api/menus/ehr-sidebar/reset`, { method: "POST" });
      if (!res.ok) {
        console.error("Reset failed:", await res.text());
      }
      await loadMenu();
      await refreshMenu();
    } catch (err) {
      console.error("Failed to reset menu:", err);
    } finally {
      setSaving(false);
    }
  };

  const getChildren = (parentId: string | null) =>
    items.filter(i => i.parentId === parentId).sort((a, b) => a.position - b.position);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = async (item: MenuItemFlat) => {
    setEditingItem(item.id);
    setEditForm({ label: item.label, icon: item.icon || "", screenSlug: item.screenSlug || "", fhirResources: "" });

    // Load FHIR resources from tab_field_config if applicable
    const slug = item.screenSlug || "";
    const pageKeyMatch = slug.match(/\/settings\/p\/(.+)/);
    const configKeyMatch = slug.match(/\/settings\/layout-settings\/config\/(.+)/);
    const tabKey = pageKeyMatch?.[1] || configKeyMatch?.[1];
    if (tabKey) {
      try {
        const base = API_URL();
        const res = await fetchWithAuth(`${base}/api/tab-field-config/${tabKey}`);
        if (res.ok) {
          const data = await res.json();
          const fhir = Array.isArray(data.fhirResources)
            ? data.fhirResources.map((r: any) => typeof r === "string" ? r : r.type || "").filter(Boolean).join(", ")
            : "";
          setEditForm(prev => ({ ...prev, fhirResources: fhir }));
        }
      } catch {}
    }
  };

  // Render a menu item row
  const renderItem = (item: MenuItemFlat, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isEditing = editingItem === item.id;
    const hasModifications = item.isModified || item.isReordered;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-1 transition-colors ${
            item.isCustom
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
              : hasModifications
              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
          }`}
          style={{ marginLeft: depth * 24 }}
        >
          {/* Expand/collapse */}
          <button
            onClick={() => hasChildren && toggleExpand(item.id)}
            className={`w-5 h-5 flex items-center justify-center text-gray-400 ${hasChildren ? "cursor-pointer hover:text-gray-600" : "invisible"}`}
          >
            {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
          </button>

          {isEditing ? (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <IconPicker value={editForm.icon} onChange={(v) => setEditForm({ ...editForm, icon: v })} />
                <input
                  className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  className="w-48 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={editForm.screenSlug}
                  onChange={(e) => setEditForm({ ...editForm, screenSlug: e.target.value })}
                  placeholder="Route path"
                />
                <button onClick={() => saveEdit(item.id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingItem(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 pl-8">
                <input
                  className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={editForm.fhirResources}
                  onChange={(e) => setEditForm({ ...editForm, fhirResources: e.target.value })}
                  placeholder="FHIR Resources (comma-separated, e.g. Practitioner, Organization)"
                />
              </div>
            </div>
          ) : (
            <>
              <GripVertical className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">
                {item.label}
              </span>
              {item.screenSlug && (
                <span className="text-xs text-gray-400 font-mono">{item.screenSlug}</span>
              )}
              {/* Badges */}
              {item.isCustom && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                  Custom
                </span>
              )}
              {item.isModified && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                  Modified
                </span>
              )}
              {/* Actions */}
              <div className="flex items-center gap-0.5">
                <button onClick={() => moveItem(item.id, "up")} disabled={saving} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Move up">
                  <ChevronDown className="w-3 h-3 rotate-180" />
                </button>
                <button onClick={() => moveItem(item.id, "down")} disabled={saving} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Move down">
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded" title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setAddParentId(item.id);
                    setShowAddForm(true);
                    if (!isExpanded) toggleExpand(item.id);
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-gray-700 rounded"
                  title="Add child"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {hasModifications && (
                  <button onClick={() => handleRevertItem(item.id)} disabled={saving} className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-700 rounded" title="Revert changes">
                    <Undo2 className="w-3 h-3" />
                  </button>
                )}
                {item.isCustom ? (
                  <button onClick={() => handleDeleteCustomItem(item.id)} disabled={saving} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded" title="Delete custom item">
                    <Trash2 className="w-3 h-3" />
                  </button>
                ) : (
                  <button onClick={() => handleHideItem(item.id)} disabled={saving} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded" title="Hide from sidebar">
                    <EyeOff className="w-3 h-3" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && children.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </>
    );
  }

  const topLevelItems = getChildren(null);

  return (
    <>
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Menu Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customize the sidebar navigation for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors ${
              showCode
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Code
          </button>
          {hasCustomizations ? (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              Customized
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded">
              Default
            </span>
          )}
        </div>
      </div>

      <div className={showCode ? "flex gap-4" : ""}>
      {/* Code Panel */}
      {showCode && (
        <div className="w-1/2 shrink-0 border border-gray-200 rounded-lg overflow-hidden h-[calc(100vh-296px)] min-h-64">
          <JsonCodeView />
        </div>
      )}

      <div className={showCode ? "w-1/2 overflow-auto space-y-6" : "space-y-6"}>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setAddParentId(null); setShowAddForm(true); }}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
        {hiddenItems.length > 0 && (
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
              showHidden
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Eye className="w-4 h-4" />
            Hidden Items ({hiddenItems.length})
          </button>
        )}
        {hasCustomizations && (
          <button
            onClick={handleResetToDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Changes are saved as overrides on top of the default menu. New items added globally will automatically appear.
          Use <strong>Hide</strong> to remove items, <strong>Edit</strong> to rename, and <strong>Revert</strong> to undo changes.
        </p>
      </div>

      {/* Hidden items panel */}
      {showHidden && hiddenItems.length > 0 && (
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            Hidden Items
          </h3>
          <div className="space-y-1">
            {hiddenItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                  {item.label}
                </span>
                {item.screenSlug && (
                  <span className="text-xs text-gray-400 font-mono">{item.screenSlug}</span>
                )}
                <button
                  onClick={() => handleUnhideItem(item.id)}
                  disabled={saving}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded disabled:opacity-50"
                >
                  <Eye className="w-3 h-3" />
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add item form */}
      {showAddForm && (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Add {addParentId ? "Sub-Item" : "Top-Level Item"}
          </h3>
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={newItem.label}
                  onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  placeholder="Menu item label"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
                <IconPicker value={newItem.icon} onChange={(v) => setNewItem({ ...newItem, icon: v })} />
              </div>
              <div className="w-56">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Route Path</label>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={newItem.screenSlug}
                  onChange={(e) => setNewItem({ ...newItem, screenSlug: e.target.value })}
                  placeholder="/settings/p/my-page"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Key</label>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={newItem.itemKey}
                  onChange={(e) => setNewItem({ ...newItem, itemKey: e.target.value })}
                  placeholder="auto-generated"
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">FHIR Resources</label>
                <input
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={newItem.fhirResources}
                  onChange={(e) => setNewItem({ ...newItem, fhirResources: e.target.value })}
                  placeholder="Practitioner, Organization (comma-separated)"
                />
              </div>
              <button
                onClick={addItem}
                disabled={saving || !newItem.label.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddParentId(null); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu tree */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Sidebar Menu Structure
        </h2>
        <div className="space-y-0.5">
          {topLevelItems.map(item => renderItem(item))}
        </div>
        {topLevelItems.length === 0 && (
          <p className="text-center text-gray-400 py-8">No menu items found</p>
        )}
      </div>

      </div>{/* close menu editor column */}
      </div>{/* close flex wrapper */}
    </div>
    </>
  );
}
