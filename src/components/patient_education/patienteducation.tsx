'use client'

import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/app/(admin)/layout'
import Alert from '@/components/ui/alert/Alert'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

/** --- Minimal inline icons (no extra deps) ------------------------------- */

type IconProps = React.SVGProps<SVGSVGElement> & { className?: string }
const Icon = ({ children, className, ...rest }: IconProps & { children: React.ReactNode }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
        {children}
    </svg>
)

type PatientEducationAssignmentDto = {
    id: string | number
    patientId: string
    patientName: string
    notes?: string
    assignedAt: string
    delivered: boolean
}

export const X = (p: IconProps) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>
export const CheckCircle = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></Icon>
export const CheckCircle2 = CheckCircle
export const Plus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>
export const Bookmark = (p: IconProps) => <Icon {...p}><path d="M6 4h12v16l-6-3-6 3V4z"/></Icon>
export const Send = (p: IconProps) => <Icon {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></Icon>
export const BookOpen = (p: IconProps) => <Icon {...p}><path d="M12 3v18"/><path d="M12 3c-2 0-6 .5-8 2v14c2-1.5 6-2 8-2"/><path d="M12 3c2 0 6 .5 8 2v14c-2-1.5 6-2-8-2"/></Icon>
export const Filter = (p: IconProps) => <Icon {...p}><path d="M4 5h16M7 12h10M10 19h4"/></Icon>
export const Globe = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M2.5 12h19"/><path d="M12 2.5c3 3.5 3 15.5 0 19M12 2.5c-3 3.5-3 15.5 0 19"/></Icon>
export const LanguagesIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M2.5 12h19"/><path d="M7 8h10"/><path d="M7 16h10"/></Icon>
export const FileText = (p: IconProps) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></Icon>
export const Users = (p: IconProps) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>
export const Search = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></Icon>
export const Printer = (p: IconProps) => <Icon {...p}><path d="M6 9V2h12v7"/><path d="M6 18h12v4H6z"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M8 13h8"/></Icon>
export const Download = (p: IconProps) => <Icon {...p}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/></Icon>
export const Loader2 = (p: IconProps) => <Icon {...p}><path d="M12 3a9 9 0 1 0 9 9" /></Icon> // className="animate-spin"

/** ------------------------------------------------------------------------ */
/** Types that mirror PatientEducationDto (+ derived fields for UI) */

type Topic = {
    id: string
    orgId?: string
    title: string
    summary: string
    content: string
    category: string
    language: string
    readingLevel: 'Basic' | 'Intermediate' | 'Advanced' | string
    minutes: number                // derived from content length
    tags: string[]                 // optional derived labels (we keep for UI chips)
    audit?: { createdDate?: string; lastModifiedDate?: string }
    fhirId?: string
}

type AssignedItem = {
    id: string
    topic: Topic
    patientName: string
    patientId: string
    notes?: string
    assignedAt: string // ISO
    delivered: boolean
}

/** Utilities */

function openPrintWindow(html: string, title = 'Patient Education') {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; padding: 24px; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 12px; }
      .card { page-break-inside: avoid; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
      pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
  </head><body>${html}</body></html>`)
    w.document.close()
    w.focus()
    w.print()
}

function deriveMinutes(content?: string) {
    if (!content) return 2
    return Math.max(2, Math.round(content.length / 600))
}

function dtoToTopic(dto: Record<string, unknown>): Topic {
    const obj = dto as {
        id?: string | number
        orgId?: string | number
        title?: string
        summary?: string
        content?: string
        category?: string
        language?: string
        readingLevel?: string
        audit?: { createdDate?: string; lastModifiedDate?: string }
        fhirId?: string
    }

    return {
        id: String(obj.id ?? ''),
        orgId: obj.orgId ? String(obj.orgId) : undefined,
        title: obj.title ?? '',
        summary: obj.summary ?? '',
        content: obj.content ?? '',
        category: obj.category ?? 'General',
        language: obj.language ?? 'English',
        readingLevel: obj.readingLevel ?? 'Basic',
        minutes: deriveMinutes(obj.content),
        tags: [], // keep for UI chips; can derive from category/level etc.
        audit: obj.audit
            ? {
                createdDate: obj.audit.createdDate,
                lastModifiedDate: obj.audit.lastModifiedDate,
            }
            : undefined,
        fhirId: obj.fhirId ?? undefined,
    }
}

/** Component */

export default function PatientEducationPage() {
    /** Alerts (like inventory.tsx) */
    const [alertData, setAlertData] = useState<{
        variant: 'success' | 'error' | 'warning' | 'info'
        title: string
        message: string
    } | null>(null)

    useEffect(() => {
        if (!alertData) return
        const id = setTimeout(() => setAlertData(null), 4000)
        return () => clearTimeout(id)
    }, [alertData])

    /** Filters, paging, data */
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<string>('All')
    const [language, setLanguage] = useState<string>('All')
    const [level, setLevel] = useState<string>('All')

    const [topics, setTopics] = useState<Topic[]>([])
    const [loading, setLoading] = useState(false)

    /** Derived filter option sets (no hardcoded lists) */
    const categories = useMemo(() => {
        const s = new Set<string>()
        topics.forEach(t => t.category && s.add(t.category))
        return ['All', ...Array.from(s).sort()]
    }, [topics])

    const languages = useMemo(() => {
        const s = new Set<string>()
        topics.forEach(t => t.language && s.add(t.language))
        return ['All', ...Array.from(s).sort()]
    }, [topics])

    const levels = useMemo(() => {
        const s = new Set<string>()
        topics.forEach(t => t.readingLevel && s.add(String(t.readingLevel)))
        return ['All', ...Array.from(s).sort()]
    }, [topics])

    /** UI states */
    const [preview, setPreview] = useState<Topic | null>(null)
    const [assigned, setAssigned] = useState<AssignedItem[]>([])
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assignTarget, setAssignTarget] = useState<Topic | null>(null)
    const [creating, setCreating] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editing, setEditing] = useState<Topic | null>(null) // for Edit
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [assignedCount, setAssignedCount] = useState<number>(0)
    const [assignedSearch, setAssignedSearch] = useState("")
    const filteredAssigned = useMemo(() => {
        if (!assignedSearch.trim()) return []
        const q = assignedSearch.toLowerCase()

        return assigned.filter((a) => {
            const patientName = String(a.patientName ?? "").toLowerCase()
            const patientId = String(a.patientId ?? "").toLowerCase()
            return patientName.includes(q) || patientId.includes(q)
        })
    }, [assigned, assignedSearch])







    const handleDelete = async () => {
        if (!deleteId) return
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education/${deleteId}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                setAlertData({
                    variant: 'success',
                    title: 'Deleted',
                    message: 'Patient education deleted successfully',
                })
                setDeleteId(null)
                loadEducation() // ✅ this needs to be defined (see below)
            } else {
                setAlertData({
                    variant: 'error',
                    title: 'Error',
                    message: data.message || 'Failed to delete',
                })
            }
        } catch {
            setAlertData({
                variant: 'error',
                title: 'Error',
                message: 'Error deleting item',
            })
        }
    }

    async function loadEducation() {
        setLoading(true)
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education`)
            const text = await res.text()
            if (!text) {
                setTopics([])
                return
            }

            const json: {
                success: boolean
                data?: { content?: unknown[] }
                message?: string
            } = JSON.parse(text)

            if (res.ok && json.success && json.data?.content) {
                const content = json.data.content as Record<string, unknown>[]
                const items: Topic[] = content.map(dtoToTopic)
                setTopics(items)
            }
            else {
                setTopics([])
            }
        } catch (err) {
            console.error('Failed to load patient education:', err)
            setTopics([])
            setAlertData({
                variant: 'error',
                title: 'Load Failed',
                message: 'Could not fetch patient education.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/api/patient-education-assignments/count`)
                const json = await res.json()
                if (res.ok && json.success) {
                    setAssignedCount(json.data)   // backend returns long
                }
            } catch (err) {
                console.error("Failed to fetch assignment count", err)
            }
        })()
    }, [])

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/api/patient-education-assignments`)
                const text = await res.text()   // ✅ safe parse
                if (!text) {
                    setAssigned([])
                    return
                }

                const json = JSON.parse(text)
                if (res.ok && json.success) {
                    const arr = Array.isArray(json.data) ? json.data : (json.data?.content ?? [])
                    const mapped: AssignedItem[] = arr.map(
                        (dto: {
                            id: string | number
                            topic: Record<string, unknown>
                            patientId: string
                            patientName: string
                            notes?: string
                            assignedAt: string
                            delivered: boolean
                        }) => ({
                            id: String(dto.id),
                            topic: dtoToTopic(dto.topic),
                            patientId: dto.patientId,
                            patientName: dto.patientName,
                            notes: dto.notes,
                            assignedAt: dto.assignedAt,
                            delivered: dto.delivered,
                        })
                    )
                    setAssigned(mapped)
                }
            } catch (err) {
                console.error("Failed to load assigned items", err)
                setAssigned([])
            }
        })()
    }, [])




    /** Fetch paginated topics */
    useEffect(() => {
        (async () => {
            setLoading(true)
            try {
                const res = await fetchWithAuth(`${API_URL}/api/patient-education`)
                const text = await res.text()
                if (!text) {
                    setTopics([])
                    return
                }
                const json = JSON.parse(text)
                if (res.ok && json.success && json.data?.content) {
                    const items: Topic[] = (json.data.content as Record<string, unknown>[]).map(dtoToTopic)
                    setTopics(items)
                } else {
                    setTopics([])
                }
            } catch (err) {
                console.error('Failed to load patient education:', err)
                setTopics([])
                setAlertData({ variant: 'error', title: 'Load Failed', message: 'Could not fetch patient education.' })
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    /** Client-side filter + search */
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return topics.filter((t) => {
            if (category !== 'All' && t.category !== category) return false
            if (language !== 'All' && t.language !== language) return false
            if (level !== 'All' && String(t.readingLevel) !== level) return false
            if (!q) return true
            const hay = `${t.title} ${t.summary} ${t.content}`.toLowerCase()
            return hay.includes(q)
        })
    }, [topics, search, category, language, level])

    /** Assign flow (local demo; backend endpoints not in controller yet) */
    function handleAssign(topic: Topic) {
        setAssignTarget(topic)
        setShowAssignModal(true)
    }
    async function confirmAssign(patientId: string, patientName: string, notes?: string) {
        if (!assignTarget) return
        const currentUser = { fullName: 'Current User' }
        const assignedBy = currentUser?.fullName || 'Unknown'
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education-assignments/${assignTarget.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: assignTarget,
                    topicId: assignTarget.id,
                    patientId,
                    patientName,
                    notes: notes ?? '',
                    assignedBy
                }),
            })
            const text = await res.text()
            if (!text) throw new Error('Empty response')
            const json = JSON.parse(text)
            if (!res.ok || !json.success) throw new Error(json.message || 'Failed to assign')
            const dto = json.data as PatientEducationAssignmentDto

            const item: AssignedItem = {
                id: String(dto.id),
                topic: assignTarget,
                patientId: dto.patientId,
                patientName: patientName,
                notes: dto.notes,
                assignedAt: dto.assignedAt,
                delivered: dto.delivered,
            }

            setAssigned((prev) => [item, ...prev])
            setShowAssignModal(false)
            setAssignTarget(null)
            setAlertData({
                variant: 'success',
                title: 'Assigned',
                message: `Assigned “${item.topic.title}” to ${patientName}.`,
            })
        } catch (err) {
            console.error('Assign failed:', err)
            setAlertData({ variant: 'error', title: 'Error', message: 'Failed to assign education to patient.' })
        }
    }
    async function markDelivered(id: string) {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education-assignments/${id}/delivered`, { method: 'PUT' })
            const text = await res.text()
            if (!text) throw new Error('Empty response')
            const json = JSON.parse(text)
            if (res.ok && json.success) {
                setAssigned((prev) => prev.map((a) => (a.id === id ? { ...a, delivered: true } : a)))
                setAlertData({ variant: 'success', title: 'Delivered', message: 'Marked as delivered.' })
            }
        } catch {
            setAlertData({ variant: 'error', title: 'Error', message: 'Failed to mark delivered.' })
        }
    }

    async function removeAssigned(id: string) {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education-assignments/${id}`, { method: 'DELETE' })
            const text = await res.text()
            if (!text) throw new Error('Empty response')
            const json = JSON.parse(text)
            if (res.ok && json.success) {
                setAssigned((prev) => prev.filter((a) => a.id !== id))
                setAlertData({ variant: 'success', title: 'Removed', message: 'Removed from assigned list.' })
            }
        } catch {
            setAlertData({ variant: 'error', title: 'Error', message: 'Failed to remove assignment.' })
        }
    }

    /** Create topic (POST) */
    async function createTopic(payload: Partial<Topic>) {
        if (!payload.title || !payload.content) return
        setCreating(true)
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: payload.title,
                    summary: payload.summary ?? '',
                    content: payload.content,
                    category: payload.category ?? '',
                    language: payload.language ?? '',
                    readingLevel: payload.readingLevel ?? 'Basic',
                }),
            })
            const text = await res.text()
            if (!text) throw new Error('Empty response')
            const json = JSON.parse(text)
            if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create')
            const created: Topic = dtoToTopic(json.data)
            setTopics(prev => [created, ...prev])
            setShowCreateModal(false)
            setAlertData({ variant: 'success', title: 'Created', message: `Added "${created.title}".` })

        } catch (err) {
            console.error('Create topic failed:', err)
            setAlertData({ variant: 'error', title: 'Error', message: 'Failed to add patient education.' })
        } finally {
            setCreating(false)
        }
    }

    /** Update topic (PUT) */
    async function updateTopic(id: string, updates: Partial<Topic>) {
        try {
            const res = await fetchWithAuth(`${API_URL}/api/patient-education/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: updates.title,
                    summary: updates.summary,
                    content: updates.content,
                    category: updates.category,
                    language: updates.language,
                    readingLevel: updates.readingLevel,
                }),
            })
            const text = await res.text()
            if (!text) throw new Error('Empty response')
            const json = JSON.parse(text)
            if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update')
            const updated = dtoToTopic(json.data)
            setTopics(prev => prev.map(t => (t.id === id ? updated : t)))
            setEditing(null)
            setPreview(updated)
            setAlertData({ variant: 'success', title: 'Updated', message: `"${updated.title}" was updated.` })
        } catch (err) {
            console.error('Update topic failed:', err)
            setAlertData({ variant: 'error', title: 'Error', message: 'Failed to update patient education.' })
        }
    }


    const metrics = useMemo(() => {
        const total = topics.length
        const delivered = assigned.filter((a) => a.delivered).length
        const deliveredRate = assignedCount ? Math.round((delivered / assignedCount) * 100) : 0
        const langs = new Set(topics.map((t) => t.language)).size
        return { total, assignedCount, delivered, deliveredRate, langs }
    }, [topics, assigned, assignedCount])

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                {/* Alerts like inventory.tsx */}
                {alertData && (
                    <div className="mx-auto max-w-7xl px-4 pt-4">
                        <Alert variant={alertData.variant} title={alertData.title} message={alertData.message} />
                    </div>
                )}

                {/* Header */}
                    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1">
                        <div className="relative flex-1">
                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search title, summary, or content…"
                                    className="w-full bg-transparent outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                                title="New custom education"
                            >
                                <Plus className="h-4 w-4" /> New
                            </button>
                        </div>
                    </div>

                {/* Metrics */}
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard icon={<FileText className="h-5 w-5" />} label="Library" value={String(metrics.total)} delta="" />
                    <MetricCard icon={<Users className="h-5 w-5" />} label="Assigned" value={String(metrics.assignedCount)} delta="" />
                    <MetricCard icon={<CheckCircle className="h-5 w-5" />} label="Delivered Rate" value={`${metrics.deliveredRate}%`} delta="" />
                    <MetricCard icon={<LanguagesIcon className="h-5 w-5" />} label="Languages" value={String(metrics.langs)} delta="" />
                </div>

                {/* Content */}
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-8 lg:grid-cols-12">
                    {/* Library */}
                    <div className="lg:col-span-8">
                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Select value={category} onChange={setCategory} label="Category" items={categories} icon={<Filter className="h-4 w-4" />} />
                            <Select value={language} onChange={setLanguage} label="Language" items={languages} icon={<LanguagesIcon className="h-4 w-4" />} />
                            <Select value={level} onChange={setLevel} label="Reading level" items={levels} icon={<BookOpen className="h-4 w-4" />} />
                        </div>

                        {loading ? (
                            <EmptyState title="Loading…" subtitle="Fetching patient education from server." />
                        ) : filtered.length === 0 ? (
                            <EmptyState title="No topics found" subtitle="Try adjusting your search or filters." />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {filtered.map((t) => (
                                    <TopicCard
                                        key={t.id}
                                        topic={t}
                                        onPreview={() => setPreview(t)}
                                        onAssign={() => handleAssign(t)}
                                        onDelete={() => setDeleteId(Number(t.id))}
                                        onEdit={() => setEditing(t)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right rail: Assigned summary */}
                    <div className="lg:col-span-4">
                        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            {/* Header + Search inline like filters */}
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900">Assigned</h3>
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm w-64">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        value={assignedSearch}
                                        onChange={(e) => setAssignedSearch(e.target.value)}
                                        placeholder="Search…"
                                        className="w-full bg-transparent outline-none placeholder:text-slate-400 text-sm"
                                    />
                                </div>
                            </div>


                            {/* Assigned list */}
                            {(!assignedSearch.trim() || filteredAssigned.length === 0) ? (
                                <p className="text-sm text-slate-600">
                                    {assignedSearch ? "No matches found." : ""}
                                </p>
                            ) : (
                                <ul className="divide-y divide-slate-100 text-sm">
                                    {filteredAssigned.slice(0, 6).map((a) => (
                                        <li key={a.id} className="flex items-center justify-between py-2">
                                            <div className="min-w-0">
                                                <div className="truncate font-medium text-slate-900">
                                                    {a.topic.title}
                                                </div>
                                                <div className="truncate text-xs text-slate-500">
                                                    {a.patientName} • ID: {a.id} • {a.topic.language} • {a.topic.category}
                                                </div>
                                            </div>
                                            <div className="ml-2 flex items-center gap-1">
                                                {!a.delivered && (
                                                    <button
                                                        onClick={() => markDelivered(a.id)}
                                                        title="Mark delivered"
                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                                                    >
                                                        Deliver
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeAssigned(a.id)}
                                                    title="Remove"
                                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* View all */}
                            {filteredAssigned.length > 6 && (
                                <div className="mt-2 text-right">
                                    <button
                                        className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                                        onClick={() => alert("Build a full Assigned page or modal if needed")}
                                    >
                                        View all
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Drawer */}
                {preview && (
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out translate-x-0">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{preview.title}</h3>
                                <p className="text-xs text-slate-500">
                                    {preview.category} • {preview.language} • {preview.readingLevel} • ~{preview.minutes} min
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreview(null)}
                                    className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
                                    aria-label="Close preview"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6 p-4">
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{preview.content}</pre>
                            </div>
                            {!!preview.tags?.length && (
                                <div className="flex flex-wrap gap-2">
                                    {preview.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                                        >
              <Bookmark className="h-3 w-3" /> {tag}
            </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleAssign(preview)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                                >
                                    <Send className="h-4 w-4" /> Assign to patient
                                </button>
                                <button
                                    onClick={() => {
                                        const html = `
              <div class="card">
                <h1>${preview.title}</h1>
                <div class="meta">Category: ${preview.category} • Language: ${preview.language} • Level: ${preview.readingLevel} • ~${preview.minutes} min</div>
                <pre>${(preview.content || '').replace(/</g, '&lt;')}</pre>
              </div>`
                                        openPrintWindow(html, preview.title)
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                                >
                                    <Printer className="h-4 w-4" /> Print
                                </button>
                                <button
                                    onClick={() => {
                                        const html = `
      <div class="card">
        <h1>${preview.title}</h1>
        <div class="meta">
          Category: ${preview.category} • Language: ${preview.language} • 
          Level: ${preview.readingLevel} • ~${preview.minutes} min
        </div>
        <pre>${(preview.content || '').replace(/</g, '&lt;')}</pre>
      </div>`;

                                        // ✅ Create a blob and download as HTML file
                                        const blob = new Blob([html], { type: "text/html" });
                                        const url = URL.createObjectURL(blob);

                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = `${preview.title}.html`; // filename
                                        document.body.appendChild(link);
                                        link.click();

                                        // cleanup
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                                >
                                    <Download className="h-4 w-4" /> Download
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assign Modal */}
                <AssignModal open={showAssignModal} topic={assignTarget} onClose={() => setShowAssignModal(false)} onConfirm={confirmAssign} />

                {/* Create Modal */}
                <CreateModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createTopic} busy={creating} />

                {/* Edit Modal */}
                <EditModal
                    topic={editing}
                    onClose={() => setEditing(null)}
                    onSave={(t) => updateTopic(t.id, t)}
                />

                {/* Delete Confirmation Modal */}
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-900">Delete Education</h3>
                            <p className="mt-2 text-sm text-gray-600">
                                Are you sure you want to delete this patient education topic?
                            </p>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="rounded-md bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    )
}

/* --- Components ----------------------------------------------------------- */

function MetricCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600">{icon}</div>
                {delta ? <span className="text-xs text-emerald-600">{delta}</span> : <span />}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    )
}

function TopicCard({
                       topic,
                       onPreview,
                       onAssign,
                       onDelete,
                       onEdit,
                   }: {
    topic: Topic
    onPreview: () => void
    onAssign: () => void
    onDelete: () => void
    onEdit: () => void
}) {
    return (
        <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow">
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">{topic.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">~{topic.minutes} min</span>
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-slate-600">{topic.summary}</p>
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <Globe className="h-3 w-3" /> {topic.language}
          </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <BookOpen className="h-3 w-3" /> {topic.readingLevel}
          </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">{topic.category}</span>
                </div>
            </div>
            <div className="mt-2 flex gap-2">
                <button
                    onClick={onPreview}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                    <BookOpen className="h-4 w-4" /> Preview
                </button>

                <button
                    onClick={onAssign}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                    <Send className="h-4 w-4" /> Assign
                </button>
            </div>
            <div className="mt-2 flex gap-2">
                <button onClick={onEdit}   className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600">Edit
            </button>
                <button
                    onClick={onDelete}   // ✅ call the parent delete handler
                    className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}

function Select({
                    value,
                    onChange,
                    items,
                    label,
                    icon,
                }: {
    value: string
    onChange: (v: string) => void
    items: string[]
    label: string
    icon?: React.ReactNode
}) {
    return (
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            {icon}
            <span className="text-slate-500">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="ml-auto w-40 rounded-xl border border-slate-200 bg-white px-2 py-1 text-slate-900 focus:outline-none"
            >
                {items.map((it) => (
                    <option key={it} value={it}>
                        {it}
                    </option>
                ))}
            </select>
        </label>
    )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
            <p className="font-medium text-slate-900">{title}</p>
            <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
    )
}

function AssignModal({
                         open,
                         topic,
                         onClose,
                         onConfirm,
                     }: {
    open: boolean
    topic: Topic | null
    onClose: () => void
    onConfirm: (patientId: string, patientName: string, notes?: string) => void
}) {
    const [patientQuery, setPatientQuery] = useState('')
    const [patientId, setPatientId] = useState('')
    const [patientName, setPatientName] = useState('')
    const [notes, setNotes] = useState('')
    const [results, setResults] = useState<{ id: string; name: string; dateOfBirth?: string | null }[]>([])

    useEffect(() => {
        if (!open) return
        setPatientQuery('')
        setPatientId('')
        setPatientName('')
        setNotes('')
        setResults([])
    }, [open])

    // Debounced search — replace with real API if available
    useEffect(() => {
        if (!open) return
        const id = setTimeout(async () => {
            if (!patientQuery.trim()) return setResults([])
            try {
                const res = await fetchWithAuth(`${API_URL}/api/patients?search=${encodeURIComponent(patientQuery)}&size=5`)
                const json = await res.json()
                const arr = Array.isArray(json) ? json : (json?.data?.content ?? [])
                setResults(
                    (arr as Array<{
                        id?: string | number
                        patientId?: string | number
                        name?: string
                        fullName?: string
                        firstName?: string
                        lastName?: string
                        identification?: { firstName?: string; lastName?: string }
                        dateOfBirth?: string | null
                    }>).map((p) => ({
                        id: String(p.id ?? p.patientId ?? ''),
                        name: String(
                            p.name ??
                            p.fullName ??
                            `${p.firstName ?? p.identification?.firstName ?? ''} ${p.lastName ?? p.identification?.lastName ?? ''}`.trim()
                        ),
                        dateOfBirth: p.dateOfBirth ?? null,
                    }))
                        .filter(p => p.id && p.name)
                )
            } catch {
                setResults([])
            }
        }, 350)
        return () => clearTimeout(id)
    }, [patientQuery, open])

    if (!open || !topic) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Assign to patient</h3>
                        <p className="text-xs text-slate-500">{topic.title}</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="space-y-3 p-4">
                    <label className="block text-sm font-medium text-slate-700">Patient</label>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={patientQuery}
                            onChange={(e) => setPatientQuery(e.target.value)}
                            placeholder="Search by name or ID"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="max-h-40 overflow-auto rounded-xl border border-slate-200">
                            {results.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => {
                                        setPatientId(r.id)
                                        setPatientName(r.name)
                                        setResults([])
                                        setPatientQuery(r.name)
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${patientId === r.id ? 'bg-slate-50' : ''}`}
                                >
                                    <div>
                                        <div className="font-medium">{r.name}</div>
                                        {r.dateOfBirth && (
                                            <div className="text-xs text-slate-500">DOB: {r.dateOfBirth}</div>
                                        )}
                                    </div>
                                    {patientId === r.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                                </button>
                            ))}
                        </div>
                    )}
                    <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="Instructions, language preference, etc."
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(patientId || 'p-demo', patientName || patientQuery || 'Patient', notes)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                        >
                            <Send className="h-4 w-4" /> Assign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CreateModal({
                         open,
                         onClose,
                         onCreate,
                         busy,
                     }: {
    open: boolean
    onClose: () => void
    onCreate: (payload: Partial<Topic>) => void
    busy?: boolean
}) {
    const [title, setTitle] = useState('')
    const [summary, setSummary] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState('')
    const [language, setLanguage] = useState('')
    const [level, setLevel] = useState<Topic['readingLevel']>('Basic')

    useEffect(() => {
        if (!open) return
        setTitle('')
        setSummary('')
        setContent('')
        setCategory('')
        setLanguage('')
        setLevel('Basic')
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-base font-semibold text-slate-900">New Patient Education</h3>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid gap-3 p-4">
                    <Field label="Title">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="e.g., Low-Sodium Diet Basics"
                            required
                        />
                    </Field>
                    <Field label="Summary">
                        <input
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="Short one-liner shown in the list"
                        />
                    </Field>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Category">
                            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" placeholder="e.g., Diabetes" />
                        </Field>
                        <Field label="Language">
                            <input value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" placeholder="e.g., English" />
                        </Field>
                        <Field label="Reading level">
                            <select
                                value={level}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setLevel(e.target.value as Topic['readingLevel'])
                                }
                                className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                            >
                                {['Basic', 'Intermediate', 'Advanced'].map((lv) => (
                                    <option key={lv}>{lv}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field label="Content">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder={'Write patient-friendly content. Use short sentences, bullets, and clear actions.'}
                required
            />
                    </Field>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
                    <button onClick={onClose}  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60">
                            Cancel
                    </button>
                    <button
                        onClick={() => onCreate({ title, summary, content, category, language, readingLevel: level })}
                        disabled={!title || !content || busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

function EditModal({
                       topic,
                       onClose,
                       onSave,
                   }: {
    topic: Topic | null
    onClose: () => void
    onSave: (t: Topic) => void
}) {
    const [title, setTitle] = useState(topic?.title ?? '')
    const [summary, setSummary] = useState(topic?.summary ?? '')
    const [content, setContent] = useState(topic?.content ?? '')
    const [category, setCategory] = useState(topic?.category ?? '')
    const [language, setLanguage] = useState(topic?.language ?? '')
    const [level, setLevel] = useState<Topic['readingLevel']>(topic?.readingLevel ?? 'Basic')

    useEffect(() => {
        setTitle(topic?.title ?? '')
        setSummary(topic?.summary ?? '')
        setContent(topic?.content ?? '')
        setCategory(topic?.category ?? '')
        setLanguage(topic?.language ?? '')
        setLevel(topic?.readingLevel ?? 'Basic')
    }, [topic])

    if (!topic) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-base font-semibold text-slate-900">Edit Education</h3>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid gap-3 p-4">
                    <Field label="Title">
                        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                    </Field>
                    <Field label="Summary">
                        <input value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                    </Field>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Category">
                            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                        </Field>
                        <Field label="Language">
                            <input value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                        </Field>
                        <Field label="Reading level">
                            <select value={level} onChange={(e) => setLevel(e.target.value as Topic['readingLevel'])} className="w-full rounded-xl border border-slate-200 p-2 text-sm">
                                {['Basic', 'Intermediate', 'Advanced'].map((lv) => (
                                    <option key={lv}>{lv}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field label="Content">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
                    </Field>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
                    <button onClick={onClose} className="rounded-xl border bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...topic, title, summary, content, category, language, readingLevel: level, minutes: deriveMinutes(content) })}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 font-medium text-slate-700">{label}</div>
            {children}
        </label>
    )
}
