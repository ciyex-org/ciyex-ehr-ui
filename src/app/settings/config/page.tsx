'use client';

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    PropsWithChildren,
    ReactNode,
    ChangeEvent,
    useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '@/app/(admin)/layout';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

/* ---------------------------------- API ---------------------------------- */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/* -------- Inline Icons -------- */
function Icon({ path, className = 'w-5 h-5' }: { path: string; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
const paths = {
    cog: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.5-3.5a6.5 6.5 0 0 0-.13-1.3l2-1.55-2-3.46-2.45 1a6.7 6.7 0 0 0-2.25-1.3l-.38-2.6h-4l-.38-2.6a6.7 6.7 0 0 0-2.25 1.3l-2.45-1-2 3.46 2 1.55c-.06.42-.1.85-.1 1.3s.04.88.1 1.3l-2 1.55 2 3.46 2.45-1c.82.55 1.43.99 2.25 1.3l.38 2.6h4l.38-2.6c.82-.31 1.57-.75 2.25-1.3l2.45 1 2-3.46-2-1.55c.09-.42.13-.85.13-1.3Z',
    db: 'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Zm16 4c0 1.66-3.58 3-8 3s-8-1.34-8-3m16 4c0 1.66-3.58 3-8 3s-8-1.34-8-3m16 4c0 1.66-3.58 3-8 3s-8-1.34-8-3',
    med: 'M12 3v18M3 12h18',
    card: 'M3 7h18M3 11h18M6 15h6',
    cloud: 'M3 12h18M12 3a15 15 0 0 0 0 18m0-18a15 15 0 0 1 0 18M3 12a9 9 0 0 1 18 0',
    sms: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z',
    mail: 'M3 7l9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z',
    link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
    id: 'M7 8h10M7 12h6M7 16h4',
    key: 'M15 7a4 4 0 1 1-5.66 5.65L4 18v-3H1v-3h3v-3l5.34-5.35A4 4 0 0 1 15 7Z',
    crosshair: 'M12 2v4m0 12v4M2 12h4m12 0h4M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z',
    table: 'M4 4h16v16H4V4Zm0 6h16M10 4v16',
    store: 'M3 9l2-5h14l2 5v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm0 0h18',
    badge: 'M12 2l3 7h7l-5.5 4 2.5 7-7-4.5L5.5 20 8 13 3 9h7l2-7Z',
    shield: 'M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z',
    eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    eyeOff: 'M3 3l18 18M1 12s4-7 11-7a10.9 10.9 0 0 1 6 2m3 5s-4 7-11 7a10.9 10.9 0 0 1-6-2',
    server: 'M4 6h16v6H4V6Zm0 6h16v6H4v-6Zm3-7h2m-2 12h2',
    user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v3h18v-3c0-2.5-4-5-9-5Z',
    save: 'M5 5h12l2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 0v6h14',
    chevronDown: 'M6 9l6 6 6-6',
    chevronUp: 'M18 15l-6-6-6 6',
    pencilSquare: 'M3 17.25V21h3.75L18.81 8.94a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L3 17.25Z M14 6l4 4',
    checkCircle: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm-2.5-6.5L8 14l-1.5 1.5L9.5 18l7-7-1.5-1.5-5.5 6',
};

/* -------- utils -------- */
function cx(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

/* -------- Smooth auto-height collapse -------- */
function useAutoHeight(isOpen: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (isOpen) {
            const start = el.getBoundingClientRect().height;
            el.style.height = `${start}px`;
            el.style.overflow = 'hidden';
            requestAnimationFrame(() => (el.style.height = `${el.scrollHeight}px`));
        } else {
            const start = el.scrollHeight;
            el.style.height = `${start}px`;
            el.style.overflow = 'hidden';
            requestAnimationFrame(() => (el.style.height = `0px`));
        }
    }, [isOpen]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onEnd = () => {
            if (isOpen) {
                el.style.height = 'auto';
                el.style.overflow = 'visible';
            }
        };
        el.addEventListener('transitionend', onEnd);
        return () => el.removeEventListener('transitionend', onEnd);
    }, [isOpen]);

    return ref;
}

/* ------------------------------ Data binding ----------------------------- */
const S = (v: any): string => (v ?? '') + '';
function deepGet(obj: any, path: string[]) {
    return path.reduce((acc, k) => (acc ? (acc as any)[k] : undefined), obj);
}
function deepSetImmutable<T extends Record<string, any>>(obj: T, path: string[], value: any): T {
    const root = { ...obj } as any;
    let prev = obj as any;
    let cur = root as any;
    for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        cur[k] = { ...(prev?.[k] ?? {}) };
        prev = prev?.[k];
        cur = cur[k];
    }
    cur[path[path.length - 1]] = value;
    return root as T;
}
function useFieldBinder(config: any, setConfig: React.Dispatch<React.SetStateAction<any>>) {
    return (path: string[]) =>
        ({
            value: S(deepGet(config, path)),
            onChange: (e: ChangeEvent<HTMLInputElement>) => setConfig((c: any) => deepSetImmutable(c, path, e.target.value)),
        }) as const;
}

/** Convert flattened key-value map to nested config structure */
function flatMapToNested(flatMap: Record<string, any>): any {
    const result: any = {};
    
    Object.entries(flatMap).forEach(([key, value]) => {
        const parts = key.split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
    });
    
    return result;
}

/** Normalizer: adds google.oauth + recaptcha */
function normalizeIntegrations(obj: any) {
    const root = obj?.integrations ?? obj ?? {};
    return {
        storage_type: S(root.storage_type ?? root.storageType),
        payment_provider: S(root.payment_provider ?? root.paymentProvider ?? 'stripe'),
        payment_enabled: S(root.payment_enabled ?? root.paymentEnabled ?? 'false'),

        practice_db: { schema: S(root.practice_db?.schema ?? root.practiceDb?.schema) },

        fhir: {
            apiUrl: S(root.fhir?.apiUrl),
            clientId: S(root.fhir?.clientId),
            tokenUrl: S(root.fhir?.tokenUrl),
            scope: S(root.fhir?.scope),
            clientSecret: S(root.fhir?.clientSecret),
        },

        stripe: {
            apiKey: S(root.stripe?.apiKey),
            webhookSecret: S(root.stripe?.webhookSecret),
        },

        gps: {
            securityKey: S(root.gps?.securityKey),
            transactUrl: S(root.gps?.transactUrl),
        },

        twilio: {
            accountSid: S(root.twilio?.accountSid),
            authToken: S(root.twilio?.authToken),
            phoneNumber: S(root.twilio?.phoneNumber),
        },

        smtp: {
            server: S(root.smtp?.server),
            username: S(root.smtp?.username),
            password: S(root.smtp?.password),
        },

        telehealth: {
            vendor: S(root.telehealth?.vendor),
            twilio: {
                accountSid: S(root.telehealth?.twilio?.accountSid),
                authToken: S(root.telehealth?.twilio?.authToken),
                apiKeySid: S(root.telehealth?.twilio?.apiKeySid),
                apiKeySecret: S(root.telehealth?.twilio?.apiKeySecret),
            },
        },

        ai: {
            vendor: S(root.ai?.vendor),
            azure: { 
                endpoint: S(root.ai?.azure?.endpoint),
                apiVersion: S(root.ai?.azure?.apiVersion),
                deployment: S(root.ai?.azure?.deployment),
                apiKey: S(root.ai?.azure?.apiKey),
                useManagedIdentity: S(root.ai?.azure?.useManagedIdentity),
                timeoutMs: S(root.ai?.azure?.timeoutMs),
            }, 
            defaults: {   
                temperature: S(root.ai?.defaults?.temperature),
                maxTokens: S(root.ai?.defaults?.maxTokens),
                topP: S(root.ai?.defaults?.topP),
            },
        },

        document_storage: {
            s3: {
                bucket: S(root.document_storage?.s3?.bucket ?? root.documentStorage?.s3?.bucket),
                region: S(root.document_storage?.s3?.region ?? root.documentStorage?.s3?.region),
                accessKey: S(root.document_storage?.s3?.accessKey ?? root.documentStorage?.s3?.accessKey),
                secretKey: S(root.document_storage?.s3?.secretKey ?? root.documentStorage?.s3?.secretKey),
            },
        },

        weno: {
            ezKey: S(root.weno?.ezKey),
            userMail: S(root.weno?.userMail),
            locationId: S(root.weno?.locationId),
        },

        recaptcha: {
            siteKey: S(root.recaptcha?.siteKey),
            secretKey: S(root.recaptcha?.secretKey),
        },

        google: {
            oauth: {
                clientId: S(root.google?.oauth?.clientId),
                clientSecret: S(root.google?.oauth?.clientSecret),
            },
        },

        sikka: {
            vendor: S(root.sikka?.vendor),
            appId: S(root.sikka?.appId),
            appKey: S(root.sikka?.appKey),
            refreshKey: S(root.sikka?.refreshKey),
        },

        zuub: {
            vendor: S(root.zuub?.vendor),
            apiKey: S(root.zuub?.apiKey),
            apiUrl: S(root.zuub?.apiUrl),
        },

        ghl: {
            apiBaseUrl: S(root.ghl?.apiBaseUrl),
            apiKey: S(root.ghl?.apiKey),
            webhookSecret: S(root.ghl?.webhookSecret),
            locationId: S(root.ghl?.locationId),
        },

        dentalExchange: {
            username: S(root.dentalExchange?.username ?? root.dental_xchange_username),
            password: S(root.dentalExchange?.password ?? root.dental_xchange_password),
            apiKey: S(root.dentalExchange?.apiKey ?? root.dental_xchange_api_key),
            baseUrl: S(root.dentalExchange?.baseUrl ?? root.dental_xchange_base_url),
            dxcGroupId: S(root.dentalExchange?.dxcGroupId ?? root.dental_xchange_dxc_group_id),
            environment: S(root.dentalExchange?.environment ?? root.dental_xchange_environment),
            enabled: S(root.dentalExchange?.enabled ?? root.dental_xchange_enabled),
        },

        cloudflare: {
            appId: S(root.cloudflare?.appId),
            apiToken: S(root.cloudflare?.apiToken),
        },
    };
}

function EMPTY_CONFIG() {
    return normalizeIntegrations({});
}

/* -------- Inputs (respect editable) -------- */
function PasswordField({
                           id,
                           name,
                           defaultValue,
                           placeholder,
                           editable,
                           value,
                           onChange,
                       }: {
    id: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
    editable: boolean;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600 dark:text-blue-400">
        <Icon path={paths.key} />
      </span>
            <input
                id={id}
                name={name}
                type={show ? 'text' : 'password'}
                defaultValue={value === undefined ? defaultValue : undefined}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={!editable}
                aria-readonly={!editable}
                className={cx(
                    'h-11 w-full rounded-2xl border bg-white pl-11 pr-11 text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 ease-out',
                    editable
                        ? 'border-neutral-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        : 'border-neutral-200/70 text-neutral-500/80 focus:border-neutral-300 focus:ring-[1px] focus:ring-neutral-200',
                    'dark:bg-[#0B1220] dark:text-neutral-100 dark:placeholder:text-neutral-500',
                    editable
                        ? 'dark:border-[#1b2437] dark:focus:border-blue-400 dark:focus:ring-blue-900/40'
                        : 'dark:border-[#141b2b] dark:text-neutral-400 dark:focus:border-[#1b2437] dark:focus:ring-[#1b2437]'
                )}
            />
            <button
                type="button"
                onClick={() => editable && setShow((s) => !s)}
                className={cx(
                    'absolute inset-y-0 right-2 inline-flex items-center rounded-xl px-2 transition-all duration-200',
                    editable
                        ? 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-[#1b2437]'
                        : 'text-neutral-400 cursor-not-allowed'
                )}
                aria-label="Toggle password visibility"
                disabled={!editable}
            >
                <Icon path={show ? paths.eyeOff : paths.eye} className="h-5 w-5" />
            </button>
            {!editable && <div className="pointer-events-none absolute inset-0 rounded-2xl bg-neutral-50/50 dark:bg:white/5" />}
        </div>
    );
}

function TextInput({
                       id,
                       name,
                       defaultValue,
                       placeholder,
                       type = 'text',
                       icon = paths.link,
                       editable,
                       value,
                       onChange,
                   }: {
    id: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
    type?: string;
    icon?: string;
    editable: boolean;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600 dark:text-blue-400">
        <Icon path={icon} />
      </span>
            <input
                id={id}
                name={name}
                defaultValue={value === undefined ? defaultValue : undefined}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                type={type}
                readOnly={!editable}
                aria-readonly={!editable}
                className={cx(
                    'h-11 w-full rounded-2xl border bg-white pl-11 pr-4 text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 ease-out',
                    editable
                        ? 'border-neutral-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        : 'border-neutral-200/70 text-neutral-500/80 focus:border-neutral-300 focus:ring-[1px] focus:ring-neutral-200',
                    'dark:bg-[#0B1220] dark:text-neutral-100 dark:placeholder:text-neutral-500',
                    editable
                        ? 'dark:border-[#1b2437] dark:focus:border-blue-400 dark:focus:ring-blue-900/40'
                        : 'dark:border-[#141b2b] dark:text-neutral-400 dark:focus:border-[#1b2437] dark:focus:ring-[#1b2437]'
                )}
            />
            {!editable && <div className="pointer-events-none absolute inset-0 rounded-2xl bg-neutral-50/50 dark:bg:white/5" />}
        </div>
    );
}

/* -------- Tiny segmented control -------- */
function Segmented({
                       options,
                       value,
                       onChange,
                       disabled,
                   }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const stop = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div
            onMouseDown={stop}
            onClick={stop}
            onPointerDown={stop}
            className={cx(
                'inline-flex rounded-full border p-0.5 text-xs font-semibold',
                'border-neutral-200 bg-white dark:border-[#1b2437] dark:bg-[#0B1220]',
                disabled && 'opacity-60 pointer-events-none'
            )}
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(opt.value);
                        }}
                        aria-pressed={active}
                        className={cx(
                            'px-3 py-1 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/60',
                            active ? 'bg-blue-600 text-white shadow' : 'text-neutral-700  dark:text-neutral-200 dark:hover:bg-[#1b2437]'
                        )}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

/* -------- Section Card -------- */
function SettingsCard({
                          title,
                          iconPath,
                          isOpen,
                          isEditing,
                          savedFlash,
                          onToggle,
                          onEdit,
                          onDone,
                          children,
                          headerRight,
                      }: PropsWithChildren<{
    title: string;
    iconPath: string;
    isOpen: boolean;
    isEditing: boolean;
    savedFlash: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDone: () => void;
    headerRight?: ReactNode;
}>) {
    const bodyRef = useAutoHeight(isOpen);

    let btnLabel = 'Edit';
    let btnClass =
        'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#1b2437] dark:bg-[#0B1220] dark:text-neutral-200 dark:hover:bg-[#1b2437]';
    let btnIcon = paths.pencilSquare;
    let btnOnClick = onEdit;

    if (isEditing) {
        btnLabel = 'Done';
        btnClass =
            'border border-neutral-300 bg:white text-neutral-700 hover:bg-neutral-50 dark:border-[#1b2437] dark:bg-[#0B1220] dark:text-neutral-200 dark:hover:bg-[#1b2437]';
        btnIcon = paths.checkCircle;
        btnOnClick = onDone;
    }
    if (!isEditing && savedFlash) {
        btnLabel = 'Saved';
        btnClass = 'bg-emerald-600 text-white hover:bg-emerald-600';
        btnIcon = paths.checkCircle;
        btnOnClick = onEdit;
    }

    const stop = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-white via-white to-neutral-50/30 shadow-lg shadow-neutral-200/50 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-neutral-300/60 hover:-translate-y-0.5 dark:border-[#1a2332]/80 dark:bg-gradient-to-br dark:from-[#0E1627] dark:via-[#0E1627] dark:to-[#0a1220] dark:shadow-black/20 dark:hover:shadow-black/40">
            <div className="flex items-center justify-between px-3 py-2">
                {/* Left: Title toggle */}
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    className="group flex flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-[#1b2437] focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700 transition-colors group-hover:bg-blue-600/15 dark:bg-blue-500/15 dark:text-blue-300">
            <Icon path={iconPath} className="h-5 w-5" />
          </span>
                    <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</span>
                    <span className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-neutral-200 bg-white transition-all duration-200 ease-out group-hover:border-blue-200 group-hover:bg-blue-50 dark:border-[#1b2437] dark:bg-[#0B1220] dark:group-hover:bg-[#1b2437]">
            <Icon path={isOpen ? paths.chevronUp : paths.chevronDown} className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
          </span>
                </button>

                {/* Right: headerRight controls + edit/done (do NOT toggle) */}
                <div className="ml-3 flex items-center gap-2" onMouseDown={stop} onClick={stop} onPointerDown={stop}>
                    {headerRight}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            btnOnClick();
                        }}
                        className={cx(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2',
                            btnClass
                        )}
                        title={btnLabel}
                    >
                        <Icon path={btnIcon} className="h-3.5 w-3.5" />
                        {btnLabel}
                    </button>
                </div>
            </div>

            <div ref={bodyRef} style={{ height: isOpen ? undefined : 0 }} className="overflow-hidden transition-[height] duration-300 ease-out">
                <div className="border-t border-neutral-100 px-5 pb-5 pt-4 dark:border-[#141b2b]">{children}</div>
            </div>
        </div>
    );
}

/* ============================ TOASTS (bottom-right) ============================ */
type ToastType = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; title?: string; message: string; type: ToastType; duration: number };

const TYPE_COLORS: Record<ToastType, string> = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
};
const TYPE_ICON: Record<ToastType, string> = {
    success: '✓',
    error: '!',
    warning: '!',
    info: 'i',
};

function ToastItem({ t, onClose }: { t: Toast; onClose: (id: number) => void }) {
    const color = TYPE_COLORS[t.type];
    useEffect(() => {
        const tm = window.setTimeout(() => onClose(t.id), t.duration);
        return () => window.clearTimeout(tm);
    }, [t.id, t.duration, onClose]);

    return (
        <div
            className="relative pointer-events-auto w-80 rounded-lg border shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            style={{ borderLeft: `6px solid ${color}` }}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-2 p-3">
        <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white text-[11px] mt-0.5 select-none"
            style={{ backgroundColor: color }}
            aria-hidden
        >
          {TYPE_ICON[t.type]}
        </span>
                <div className="min-w-0">
                    {t.title && <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{t.title}</div>}
                    <div className="text-[12px] text-slate-600 dark:text-slate-300 break-words">{t.message}</div>
                </div>
                <button
                    aria-label="Close notification"
                    onClick={() => onClose(t.id)}
                    className="absolute right-1.5 top-1.5 rounded px-1 text-slate-500 hover:bg-black/5 dark:text-slate-300 dark:hover:bg:white/10"
                >
                    ✕
                </button>
            </div>
            <div className="h-1 w-full bg-transparent">
                <div className="h-1" style={{ backgroundColor: color, animation: `toastProgress ${t.duration}ms linear forwards` }} />
            </div>
        </div>
    );
}

function ToastPortal({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(children as any, document.body);
}
/* ========================== /TOASTS ========================== */

/* -------- Page -------- */
type SectionId =
    | 'core'
    | 'fhir'
    | 'payments'
    | 'twilio'
    | 'smtp'
    | 'weno'
    | 'google'
    | 'telehealth'
    | 'ai'
    | 'insurance'
    | 'documents'
    | 'ghl'
    | 'dentalExchange'
    | 'cloudflare';

export default function Page() {
    const [open, setOpen] = useState<SectionId | null>(null);
    const [editing, setEditing] = useState<Record<SectionId, boolean>>({
        core: false,
        fhir: false,
        payments: false,
        twilio: false,
        smtp: false,
        weno: false,
        google: false,
        telehealth: false,
        ai: false,
        insurance: false,
        documents: false,
        ghl: false,
        dentalExchange: false,
        cloudflare: false,
    });
    const [flashBtn, setFlashBtn] = useState<Record<SectionId, boolean>>({
        core: false,
        fhir: false,
        payments: false,
        twilio: false,
        smtp: false,
        weno: false,
        google: false,
        telehealth: false,
        ai: false,
        insurance: false,
        documents: false,
        ghl: false,
        dentalExchange: false,
        cloudflare: false,
    });

    // Provider selections
    const [insuranceProvider, setInsuranceProvider] = useState<'sikka' | 'zuub'>('sikka');
    const [googleMode, setGoogleMode] = useState<'auth' | 'recaptcha'>('auth'); // NEW

    // Single config state powering all fields (empty by default)
    const [cfg, setCfg] = useState(EMPTY_CONFIG());
    const bind = useFieldBinder(cfg, setCfg);

    /* ---------------- Toast state & helpers ---------------- */
    const [toasts, setToasts] = useState<Toast[]>([]);
    const removeToast = useCallback((id: number) => setToasts((p) => p.filter((x) => x.id !== id)), []);
    const pushToast = useCallback(
        (message: string, type: ToastType = 'info', title?: string, duration = 3500) => {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            setToasts((p) => [...p, { id, title, message, type, duration }]);
            window.setTimeout(() => removeToast(id), duration + 1000);
        },
        [removeToast]
    );

    const sectionTitles: Record<SectionId, string> = {
        core: 'Core Data & Practice DB',
        fhir: 'FHIR Server',
        payments: 'Payments',
        twilio: 'Twilio SMS Settings',
        smtp: 'SMTP Email Settings',
        weno: 'Weno Integration',
        google: 'Google Settings',
        telehealth: 'Telehealth',
        ai: 'AI & LLM Settings',
        insurance: 'Insurance Verification (Sikka & Zuub)',
        documents: 'Document Storage',
        ghl: 'GoHighLevel Integration',
        dentalExchange: 'Dental Exchange Clearinghouse',
        cloudflare: 'Cloudflare',
    };

    // Track if config exists (has been loaded from backend)
    const [configExists, setConfigExists] = useState(false);
    const [saving, setSaving] = useState(false);

    // ---- Save handler ----
    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        try {
            // Coercers for numeric & boolean fields
            const toNum = (v: any) => (v === '' || v === undefined ? undefined : Number(v));
            const toBool = (v: any) => (v === '' || v === undefined ? undefined : v === true || String(v).toLowerCase() === 'true');

            // Build the nested config structure
            const payload: any = {
                storage_type: cfg.storage_type,
                payment_provider: cfg.payment_provider,
                payment_enabled: toBool(cfg.payment_enabled),
                practice_db: {
                    schema: cfg.practice_db?.schema,
                },
                fhir: {
                    apiUrl: cfg.fhir?.apiUrl,
                    clientId: cfg.fhir?.clientId,
                    tokenUrl: cfg.fhir?.tokenUrl,
                    scope: cfg.fhir?.scope,
                    clientSecret: cfg.fhir?.clientSecret,
                },
                stripe: {
                    apiKey: cfg.stripe?.apiKey,
                    webhookSecret: cfg.stripe?.webhookSecret,
                },
                gps: {
                    securityKey: cfg.gps?.securityKey,
                    transactUrl: cfg.gps?.transactUrl,
                },
                twilio: {
                    accountSid: cfg.twilio?.accountSid,
                    authToken: cfg.twilio?.authToken,
                    phoneNumber: cfg.twilio?.phoneNumber,
                },
                smtp: {
                    server: cfg.smtp?.server,
                    username: cfg.smtp?.username,
                    password: cfg.smtp?.password,
                },
                telehealth: {
                    vendor: cfg.telehealth?.vendor,
                    twilio: {
                        accountSid: cfg.telehealth?.twilio?.accountSid,
                        authToken: cfg.telehealth?.twilio?.authToken,
                        apiKeySid: cfg.telehealth?.twilio?.apiKeySid,
                        apiKeySecret: cfg.telehealth?.twilio?.apiKeySecret,
                    },
                },
                ai: {
                    vendor: cfg.ai?.vendor,
                    azure: {
                        endpoint: cfg.ai?.azure?.endpoint,
                        apiVersion: cfg.ai?.azure?.apiVersion,
                        deployment: cfg.ai?.azure?.deployment,
                        apiKey: cfg.ai?.azure?.apiKey,
                        useManagedIdentity: toBool(cfg.ai?.azure?.useManagedIdentity),
                        timeoutMs: toNum(cfg.ai?.azure?.timeoutMs),
                    },
                    defaults: {
                        temperature: toNum(cfg.ai?.defaults?.temperature),
                        maxTokens: toNum(cfg.ai?.defaults?.maxTokens),
                        topP: toNum(cfg.ai?.defaults?.topP),
                    },
                },
                document_storage: {
                    s3: {
                        bucket: cfg.document_storage?.s3?.bucket,
                        accessKey: cfg.document_storage?.s3?.accessKey,
                        secretKey: cfg.document_storage?.s3?.secretKey,
                        region: cfg.document_storage?.s3?.region,
                    },
                },
                weno: {
                    ezKey: cfg.weno?.ezKey,
                    userMail: cfg.weno?.userMail,
                    locationId: cfg.weno?.locationId,
                },
                recaptcha: {
                    siteKey: cfg.recaptcha?.siteKey,
                    secretKey: cfg.recaptcha?.secretKey,
                },
                google: {
                    oauth: {
                        clientId: cfg.google?.oauth?.clientId,
                        clientSecret: cfg.google?.oauth?.clientSecret,
                    },
                },
                sikka: {
                    vendor: cfg.sikka?.vendor,
                    appId: cfg.sikka?.appId,
                    appKey: cfg.sikka?.appKey,
                    refreshKey: cfg.sikka?.refreshKey,
                },
                zuub: {
                    vendor: cfg.zuub?.vendor,
                    apiKey: cfg.zuub?.apiKey,
                    apiUrl: cfg.zuub?.apiUrl,
                },
                ghl: {
                    apiBaseUrl: cfg.ghl?.apiBaseUrl,
                    apiKey: cfg.ghl?.apiKey,
                    webhookSecret: cfg.ghl?.webhookSecret,
                    locationId: cfg.ghl?.locationId,
                },
                dentalExchange: {
                    username: cfg.dentalExchange?.username,
                    password: cfg.dentalExchange?.password,
                    apiKey: cfg.dentalExchange?.apiKey,
                    baseUrl: cfg.dentalExchange?.baseUrl,
                    dxcGroupId: cfg.dentalExchange?.dxcGroupId,
                    environment: cfg.dentalExchange?.environment,
                    enabled: cfg.dentalExchange?.enabled,
                },
                cloudflare: {
                    appId: cfg.cloudflare?.appId,
                    apiToken: cfg.cloudflare?.apiToken,
                },
            };

            // Remove empty nested objects
            const cleanPayload = JSON.parse(JSON.stringify(payload, (key, value) => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const hasValues = Object.values(value).some(v => v !== '' && v !== null && v !== undefined);
                    return hasValues ? value : undefined;
                }
                return value === '' ? undefined : value;
            }));

            const res = await fetchWithAuth(`${API_BASE}/api/orgConfig/json`, {
                method: 'POST',
                body: JSON.stringify(cleanPayload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.warn('Save failed', res.status, errorText);
                pushToast(`Save failed: ${res.status}`, 'error', 'Error');
                return;
            }

            // Automatically fetch and display updated data
            const updatedRes = await fetchWithAuth(`${API_BASE}/api/orgConfig/map`);
            if (updatedRes.ok) {
                const updatedFlatMap = await updatedRes.json();
                if (updatedFlatMap && Object.keys(updatedFlatMap).length > 0) {
                    const updatedNested = flatMapToNested(updatedFlatMap);
                    const updatedParsed = normalizeIntegrations(updatedNested);
                    setCfg(updatedParsed);
                    setConfigExists(true);
                }
            }

            // Exit edit mode for all sections
            setEditing({
                core: false,
                fhir: false,
                payments: false,
                twilio: false,
                smtp: false,
                weno: false,
                google: false,
                telehealth: false,
                ai: false,
                insurance: false,
                documents: false,
                ghl: false,
                dentalExchange: false,
                cloudflare: false,
            });

            // flash "Saved" on all sections briefly
            setFlashBtn({
                core: true,
                fhir: true,
                payments: true,
                twilio: true,
                smtp: true,
                weno: true,
                google: true,
                telehealth: true,
                ai: true,
                insurance: true,
                documents: true,
                ghl: true,
                dentalExchange: true,
                cloudflare: true,
            });
            setTimeout(
                () =>
                    setFlashBtn({
                        core: false,
                        fhir: false,
                        payments: false,
                        twilio: false,
                        smtp: false,
                        weno: false,
                        google: false,
                        telehealth: false,
                        ai: false,
                        insurance: false,
                        documents: false,
                        ghl: false,
                        dentalExchange: false,
                        cloudflare: false,
                    }),
                1200
            );

            pushToast('All settings saved successfully.', 'success', 'Saved');
        } catch (err: unknown) {
            console.error('Save error', err);
            pushToast(err?.message ?? 'Unexpected error during save.', 'error', 'Error');
        } finally {
            setSaving(false);
        }
    }

    // Fetch org config on mount using the /map endpoint
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/api/orgConfig/map`);
                if (!res.ok) {
                    console.warn('Org config fetch failed', res.status);
                    // Don't show error for empty/not found - just use empty config
                    setCfg(EMPTY_CONFIG());
                    setConfigExists(false);
                    return;
                }
                const flatMap = await res.json();
                
                // Handle empty response
                if (!flatMap || Object.keys(flatMap).length === 0) {
                    console.log('No config data found, using empty config');
                    setCfg(EMPTY_CONFIG());
                    setConfigExists(false);
                    return;
                }
                
                // Convert flat map to nested structure and normalize
                const nested = flatMapToNested(flatMap);
                const parsed = normalizeIntegrations(nested);
                setCfg(parsed);
                setConfigExists(true);
            } catch (e) {
                console.error('Failed to load config:', e);
                // Gracefully handle errors by using empty config
                setCfg(EMPTY_CONFIG());
                setConfigExists(false);
            }
        })();
    }, []);

    const toggleOpen = (id: SectionId) => setOpen((curr) => (curr === id ? null : id));
    const startEdit = (id: SectionId) => setEditing((m) => ({ ...m, [id]: true }));
    const endEdit = (id: SectionId) => {
        setEditing((m) => ({ ...m, [id]: false }));
        setFlashBtn((m) => ({ ...m, [id]: true }));
        setTimeout(() => setFlashBtn((m) => ({ ...m, [id]: false })), 1000);
        // Toast to remind that changes are not persisted until Save is clicked
        pushToast(`Updated "${sectionTitles[id]}". Click Save to apply changes.`, 'info', 'Section updated', 4000);
    };

    return (
        <AdminLayout>
            {/* Toast stack at bottom-right */}
            <ToastPortal>
                <div className="fixed bottom-[30px] right-4 z-[2147483647] flex flex-col gap-2 pointer-events-none">
                    {toasts.map((t) => (
                        <div key={t.id} className="pointer-events-auto">
                            <ToastItem t={t} onClose={removeToast} />
                        </div>
                    ))}
                </div>
            </ToastPortal>

            <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 pb-10 dark:bg-gradient-to-br dark:from-[#060913] dark:via-[#0A0F1A] dark:to-[#060913]">
                {/* Top global Save */}
                <div className="sticky top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur-md dark:border-[#141b2b] dark:bg-[#0B1220]/80">
                    <div className="mx-auto flex h-14 max-w-6xl items-center justify-end px-4">
                        <button
                            type="submit"
                            form="settingsForm"
                            disabled={saving}
                            className="inline-flex items-center gap-2.5 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/40 hover:bg-blue-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                            title="Save all settings"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Icon path={paths.save} className="h-5 w-5 text-white" />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="px-4 pt-6">
                    <div className="mx-auto max-w-4xl space-y-4">
                        <form id="settingsForm" action="/api/config" method="post" autoComplete="off" className="space-y-4" onSubmit={handleSave}>
                            {/* 1) Core Data & Practice DB */}
                            <SettingsCard
                                title="Core Data & Practice DB"
                                iconPath={paths.cog}
                                isOpen={open === 'core'}
                                isEditing={editing.core}
                                savedFlash={flashBtn.core}
                                onToggle={() => toggleOpen('core')}
                                onEdit={() => startEdit('core')}
                                onDone={() => endEdit('core')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="storage_type" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Storage Type
                                        </label>
                                        <TextInput id="storage_type" name="storage_type" editable={editing.core} {...bind(['storage_type'])} />
                                    </div>

                                    <div>
                                        <label htmlFor="practice_db.schema" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Practice DB Schema
                                        </label>
                                        <TextInput
                                            id="practice_db.schema"
                                            name="practice_db[schema]"
                                            placeholder="qiaben_health"
                                            icon={paths.table}
                                            editable={editing.core}
                                            {...bind(['practice_db', 'schema'])}
                                        />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 2) FHIR Server */}
                            <SettingsCard
                                title="FHIR Server"
                                iconPath={paths.med}
                                isOpen={open === 'fhir'}
                                isEditing={editing.fhir}
                                savedFlash={flashBtn.fhir}
                                onToggle={() => toggleOpen('fhir')}
                                onEdit={() => startEdit('fhir')}
                                onDone={() => endEdit('fhir')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label htmlFor="fhir.apiUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            API URL
                                        </label>
                                        <TextInput
                                            id="fhir.apiUrl"
                                            name="fhir[apiUrl]"
                                            type="url"
                                            placeholder="https://your-fhir.azurehealthcareapis.com"
                                            icon={paths.link}
                                            editable={editing.fhir}
                                            {...bind(['fhir', 'apiUrl'])}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="fhir.clientId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Client ID
                                        </label>
                                        <TextInput
                                            id="fhir.clientId"
                                            name="fhir[clientId]"
                                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            icon={paths.id}
                                            editable={editing.fhir}
                                            {...bind(['fhir', 'clientId'])}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="fhir.tokenUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Token URL
                                        </label>
                                        <TextInput
                                            id="fhir.tokenUrl"
                                            name="fhir[tokenUrl]"
                                            type="url"
                                            placeholder="https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
                                            icon={paths.key}
                                            editable={editing.fhir}
                                            {...bind(['fhir', 'tokenUrl'])}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="fhir.scope" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Scope
                                        </label>
                                        <TextInput
                                            id="fhir.scope"
                                            name="fhir[scope]"
                                            placeholder="https://your-fhir-server/.default"
                                            icon={paths.crosshair}
                                            editable={editing.fhir}
                                            {...bind(['fhir', 'scope'])}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="fhir.clientSecret" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Client Secret
                                        </label>
                                        <PasswordField id="fhir.clientSecret" name="fhir[clientSecret]" editable={editing.fhir} {...bind(['fhir', 'clientSecret'])} />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 3) Payments (Stripe & GPS) with provider switch */}
                            <SettingsCard
                                title="Payments (Stripe & GPS)"
                                iconPath={paths.card}
                                isOpen={open === 'payments'}
                                isEditing={editing.payments}
                                savedFlash={flashBtn.payments}
                                onToggle={() => toggleOpen('payments')}
                                onEdit={() => startEdit('payments')}
                                onDone={() => endEdit('payments')}
                                headerRight={
                                    <Segmented
                                        options={[
                                            { value: 'stripe', label: 'Stripe' },
                                            { value: 'gps', label: 'GPS' },
                                        ]}
                                        value={cfg.payment_provider || 'stripe'}
                                        onChange={(v) => {
                                            // When switching providers, set the new provider to inactive by default
                                            setCfg((c) => ({ ...c, payment_provider: v, payment_enabled: 'false' }));
                                        }}
                                    />
                                }
                            >
                                {/* Payment Status - Single Compact Container */}
                                <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#1b2437] dark:bg-[#0B1220]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                                {(cfg.payment_provider || 'stripe') === 'stripe' ? 'Stripe' : 'GPS'}
                                            </div>
                                            <div className={cx(
                                                'flex items-center gap-1 text-[11px] font-medium',
                                                cfg.payment_enabled === 'true'
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-neutral-500 dark:text-neutral-400'
                                            )}>
                                                <span className={cx(
                                                    'inline-block h-1.5 w-1.5 rounded-full',
                                                    cfg.payment_enabled === 'true'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-neutral-400 dark:bg-neutral-500'
                                                )} />
                                                {cfg.payment_enabled === 'true' ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newValue = cfg.payment_enabled === 'true' ? 'false' : 'true';
                                                setCfg((c) => ({ ...c, payment_enabled: newValue }));
                                            }}
                                            disabled={!editing.payments}
                                            className={cx(
                                                'relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none',
                                                cfg.payment_enabled === 'true'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-neutral-300 dark:bg-neutral-600',
                                                !editing.payments && 'opacity-50 cursor-not-allowed'
                                            )}
                                            aria-label="Toggle payment gateway"
                                        >
                                            <span
                                                className={cx(
                                                    'inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform',
                                                    cfg.payment_enabled === 'true'
                                                        ? 'translate-x-4'
                                                        : 'translate-x-0.5'
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {(cfg.payment_provider || 'stripe') === 'stripe' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="stripe.apiKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Stripe API Key
                                            </label>
                                            <PasswordField id="stripe.apiKey" name="stripe[apiKey]" editable={editing.payments} {...bind(['stripe', 'apiKey'])} />
                                        </div>
                                        <div>
                                            <label htmlFor="stripe.webhookSecret" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Stripe Webhook Secret
                                            </label>
                                            <PasswordField
                                                id="stripe.webhookSecret"
                                                name="stripe[webhookSecret]"
                                                editable={editing.payments}
                                                {...bind(['stripe', 'webhookSecret'])}
                                            />
                                        </div>
                                    </div>
                                )}

                                {(cfg.payment_provider || 'stripe') === 'gps' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="gps.securityKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                GPS Security Key
                                            </label>
                                            <PasswordField
                                                id="gps.securityKey"
                                                name="gps[securityKey]"
                                                placeholder="6457Thfj624V5r7WUwc5v6a68Zsd6YEm"
                                                editable={editing.payments}
                                                {...bind(['gps', 'securityKey'])}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="gps.transactUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                GPS Transaction URL
                                            </label>
                                            <TextInput
                                                id="gps.transactUrl"
                                                name="gps[transactUrl]"
                                                placeholder="https://secure.networkmerchants.com/api/transact.php"
                                                type="url"
                                                icon={paths.link}
                                                editable={editing.payments}
                                                {...bind(['gps', 'transactUrl'])}
                                            />
                                        </div>
                                    </div>
                                )}
                            </SettingsCard>

                            {/* 4) Twilio SMS Settings */}
                            <SettingsCard
                                title="Twilio SMS Settings"
                                iconPath={paths.sms}
                                isOpen={open === 'twilio'}
                                isEditing={editing.twilio}
                                savedFlash={flashBtn.twilio}
                                onToggle={() => toggleOpen('twilio')}
                                onEdit={() => startEdit('twilio')}
                                onDone={() => endEdit('twilio')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="twilio.accountSid" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Twilio Account SID
                                        </label>
                                        <TextInput
                                            id="twilio.accountSid"
                                            name="twilio[accountSid]"
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            icon={paths.badge}
                                            editable={editing.twilio}
                                            {...bind(['twilio', 'accountSid'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="twilio.authToken" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Twilio Auth Token
                                        </label>
                                        <PasswordField id="twilio.authToken" name="twilio[authToken]" placeholder="••••••••" editable={editing.twilio} {...bind(['twilio', 'authToken'])} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="twilio.phoneNumber" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Twilio Phone Number
                                        </label>
                                        <TextInput
                                            id="twilio.phoneNumber"
                                            name="twilio[phoneNumber]"
                                            placeholder="+1234567898"
                                            icon={paths.sms}
                                            editable={editing.twilio}
                                            {...bind(['twilio', 'phoneNumber'])}
                                        />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 5) SMTP Email Settings */}
                            <SettingsCard
                                title="SMTP Email Settings"
                                iconPath={paths.mail}
                                isOpen={open === 'smtp'}
                                isEditing={editing.smtp}
                                savedFlash={flashBtn.smtp}
                                onToggle={() => toggleOpen('smtp')}
                                onEdit={() => startEdit('smtp')}
                                onDone={() => endEdit('smtp')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="smtp.server" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            SMTP Server
                                        </label>
                                        <TextInput
                                            id="smtp.server"
                                            name="smtp[server]"
                                            placeholder="smtp.sendgrid.net"
                                            icon={paths.server}
                                            editable={editing.smtp}
                                            {...bind(['smtp', 'server'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="smtp.username" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            SMTP Username
                                        </label>
                                        <TextInput id="smtp.username" name="smtp[username]" placeholder="apikey" icon={paths.user} editable={editing.smtp} {...bind(['smtp', 'username'])} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="smtp.password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            SMTP Password
                                        </label>
                                        <PasswordField id="smtp.password" name="smtp[password]" placeholder="••••••••" editable={editing.smtp} {...bind(['smtp', 'password'])} />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 6) Weno Integration */}
                            <SettingsCard
                                title="Weno Integration"
                                iconPath={paths.table}
                                isOpen={open === 'weno'}
                                isEditing={editing.weno}
                                savedFlash={flashBtn.weno}
                                onToggle={() => toggleOpen('weno')}
                                onEdit={() => startEdit('weno')}
                                onDone={() => endEdit('weno')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="weno.ezKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Ez_Encryption_key
                                        </label>
                                        <PasswordField id="weno.ezKey" name="weno[ezKey]" placeholder="••••••••" editable={editing.weno} {...bind(['weno', 'ezKey'])} />
                                    </div>
                                    <div>
                                        <label htmlFor="weno.userMail" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Weno_Default_Usermail
                                        </label>
                                        <TextInput id="weno.userMail" name="weno[userMail]" placeholder="prescriber@example.com" icon={paths.mail} editable={editing.weno} {...bind(['weno', 'userMail'])} />
                                    </div>
                                    <div>
                                        <label htmlFor="weno.locationId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Weno_Default_Location_ID
                                        </label>
                                        <TextInput id="weno.locationId" name="weno[locationId]" placeholder="LOC-001" icon={paths.id} editable={editing.weno} {...bind(['weno', 'locationId'])} />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 7) Google Settings (Auth / reCAPTCHA) */}
                            <SettingsCard
                                title="Google Settings"
                                iconPath={paths.cloud}
                                isOpen={open === 'google'}
                                isEditing={editing.google}
                                savedFlash={flashBtn.google}
                                onToggle={() => toggleOpen('google')}
                                onEdit={() => startEdit('google')}
                                onDone={() => endEdit('google')}
                                headerRight={
                                    <Segmented
                                        options={[
                                            { value: 'auth', label: 'Google Auth' },
                                            { value: 'recaptcha', label: 'reCAPTCHA' },
                                        ]}
                                        value={googleMode}
                                        onChange={(v) => setGoogleMode(v as 'auth' | 'recaptcha')}
                                    />
                                }
                            >
                                {/* Google Auth mode */}
                                {googleMode === 'auth' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label htmlFor="google.oauth.clientId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Google OAuth Client ID
                                            </label>
                                            <TextInput
                                                id="google.oauth.clientId"
                                                name="google[oauth][clientId]"
                                                placeholder="7691...apps.googleusercontent.com"
                                                icon={paths.id}
                                                editable={editing.google}
                                                {...bind(['google', 'oauth', 'clientId'])}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="google.oauth.clientSecret" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Google OAuth Client Secret
                                            </label>
                                            <PasswordField
                                                id="google.oauth.clientSecret"
                                                name="google[oauth][clientSecret]"
                                                placeholder="••••••••"
                                                editable={editing.google}
                                                {...bind(['google', 'oauth', 'clientSecret'])}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* reCAPTCHA mode (kept in top-level recaptcha in DB) */}
                                {googleMode === 'recaptcha' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="recaptcha.siteKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                reCAPTCHA V2 Site Key
                                            </label>
                                            <TextInput
                                                id="recaptcha.siteKey"
                                                name="recaptcha[siteKey]"
                                                placeholder="6Lcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                icon={paths.key}
                                                editable={editing.google}
                                                {...bind(['recaptcha', 'siteKey'])}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="recaptcha.secretKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                reCAPTCHA V2 Secret Key
                                            </label>
                                            <PasswordField
                                                id="recaptcha.secretKey"
                                                name="recaptcha[secretKey]"
                                                placeholder="••••••••"
                                                editable={editing.google}
                                                {...bind(['recaptcha', 'secretKey'])}
                                            />
                                        </div>
                                    </div>
                                )}
                            </SettingsCard>

                            {/* 8) Telehealth */}
                            <SettingsCard
                                title="Telehealth"
                                iconPath={paths.crosshair}
                                isOpen={open === 'telehealth'}
                                isEditing={editing.telehealth}
                                savedFlash={flashBtn.telehealth}
                                onToggle={() => toggleOpen('telehealth')}
                                onEdit={() => startEdit('telehealth')}
                                onDone={() => endEdit('telehealth')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="telehealth.vendor" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Vendor
                                        </label>
                                        <TextInput id="telehealth.vendor" name="telehealth[vendor]" editable={editing.telehealth} {...bind(['telehealth', 'vendor'])} />
                                    </div>

                                    <div className="md:col-span-2">
                                        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-[#1b2437]">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label htmlFor="telehealth.twilio.accountSid" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Twilio Account SID
                                                    </label>
                                                    <TextInput
                                                        id="telehealth.twilio.accountSid"
                                                        name="telehealth[twilio][accountSid]"
                                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                        icon={paths.badge}
                                                        editable={editing.telehealth}
                                                        {...bind(['telehealth', 'twilio', 'accountSid'])}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="telehealth.twilio.authToken" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Twilio Auth Token
                                                    </label>
                                                    <PasswordField id="telehealth.twilio.authToken" name="telehealth[twilio][authToken]" editable={editing.telehealth} {...bind(['telehealth', 'twilio', 'authToken'])} />
                                                </div>
                                                <div>
                                                    <label htmlFor="telehealth.twilio.apiKeySid" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        API Key SID
                                                    </label>
                                                    <TextInput id="telehealth.twilio.apiKeySid" name="telehealth[twilio][apiKeySid]" editable={editing.telehealth} {...bind(['telehealth', 'twilio', 'apiKeySid'])} />
                                                </div>
                                                <div>
                                                    <label htmlFor="telehealth.twilio.apiKeySecret" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        API Key Secret
                                                    </label>
                                                    <PasswordField id="telehealth.twilio.apiKeySecret" name="telehealth[twilio][apiKeySecret]" editable={editing.telehealth} {...bind(['telehealth', 'twilio', 'apiKeySecret'])} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 9) AI & LLM Settings */}
                            <SettingsCard
                                title="AI & LLM Settings"
                                iconPath={paths.cloud}
                                isOpen={open === 'ai'}
                                isEditing={editing.ai}
                                savedFlash={flashBtn.ai}
                                onToggle={() => toggleOpen('ai')}
                                onEdit={() => startEdit('ai')}
                                onDone={() => endEdit('ai')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="ai.vendor" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Vendor
                                        </label>
                                        <TextInput id="ai.vendor" name="ai[vendor]" editable={editing.ai} {...bind(['ai', 'vendor'])} />
                                    </div>

                                    <div className="md:col-span-2">
                                        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-[#1b2437]">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="md:col-span-2">
                                                    <label htmlFor="ai.azure.endpoint" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Azure OpenAI Endpoint
                                                    </label>
                                                    <TextInput
                                                        id="ai.azure.endpoint"
                                                        name="ai[azure][endpoint]"
                                                        type="url"
                                                        placeholder="https://your-azure-openai.cognitiveservices.azure.com"
                                                        icon={paths.link}
                                                        editable={editing.ai}
                                                        {...bind(['ai', 'azure', 'endpoint'])}
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="ai.azure.apiVersion" className="mb-1 block text.sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        API Version
                                                    </label>
                                                    <TextInput id="ai.azure.apiVersion" name="ai[azure][apiVersion]" editable={editing.ai} {...bind(['ai', 'azure', 'apiVersion'])} />
                                                </div>

                                                <div>
                                                    <label htmlFor="ai.azure.deployment" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Deployment Name
                                                    </label>
                                                    <TextInput id="ai.azure.deployment" name="ai[azure][deployment]" editable={editing.ai} {...bind(['ai', 'azure', 'deployment'])} />
                                                </div>

                                                <div>
                                                    <label htmlFor="ai.azure.apiKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        API Key
                                                    </label>
                                                    <PasswordField id="ai.azure.apiKey" name="ai[azure][apiKey]" editable={editing.ai} {...bind(['ai', 'azure', 'apiKey'])} />
                                                </div>

                                                <div>
                                                    <label htmlFor="ai.azure.useManagedIdentity" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Use Managed Identity
                                                    </label>
                                                    <TextInput id="ai.azure.useManagedIdentity" name="ai[azure][useManagedIdentity]" editable={editing.ai} {...bind(['ai', 'azure', 'useManagedIdentity'])} />
                                                </div>

                                                <div>
                                                    <label htmlFor="ai.azure.timeoutMs" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Timeout (ms)
                                                    </label>
                                                    <TextInput id="ai.azure.timeoutMs" name="ai[azure][timeoutMs]" type="number" editable={editing.ai} {...bind(['ai', 'azure', 'timeoutMs'])} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-[#1b2437]">
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div>
                                                    <label htmlFor="ai.defaults.temperature" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Temperature
                                                    </label>
                                                    <TextInput id="ai.defaults.temperature" name="ai[defaults][temperature]" type="number" editable={editing.ai} {...bind(['ai', 'defaults', 'temperature'])} />
                                                </div>
                                                <div>
                                                    <label htmlFor="ai.defaults.maxTokens" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Max Tokens
                                                    </label>
                                                    <TextInput id="ai.defaults.maxTokens" name="ai[defaults][maxTokens]" type="number" editable={editing.ai} {...bind(['ai', 'defaults', 'maxTokens'])} />
                                                </div>
                                                <div>
                                                    <label htmlFor="ai.defaults.topP" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                        Top P
                                                    </label>
                                                    <TextInput id="ai.defaults.topP" name="ai[defaults][topP]" type="number" editable={editing.ai} {...bind(['ai', 'defaults', 'topP'])} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 10) Insurance Verification (Sikka & Zuub) with provider switch */}
                            <SettingsCard
                                title="Insurance Verification (Sikka & Zuub)"
                                iconPath={paths.badge}
                                isOpen={open === 'insurance'}
                                isEditing={editing.insurance}
                                savedFlash={flashBtn.insurance}
                                onToggle={() => toggleOpen('insurance')}
                                onEdit={() => startEdit('insurance')}
                                onDone={() => endEdit('insurance')}
                                headerRight={
                                    <Segmented
                                        options={[
                                            { value: 'sikka', label: 'Sikka' },
                                            { value: 'zuub', label: 'Zuub' },
                                        ]}
                                        value={insuranceProvider}
                                        onChange={(v) => setInsuranceProvider(v as 'sikka' | 'zuub')}
                                    />
                                }
                            >
                                {insuranceProvider === 'sikka' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="sikka.appId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Sikka App ID
                                            </label>
                                            <TextInput
                                                id="sikka.appId"
                                                name="sikka[appId]"
                                                placeholder="c9f4c33bc08ad4baa86e9b375a5d1c1a"
                                                icon={paths.badge}
                                                editable={editing.insurance}
                                                {...bind(['sikka', 'appId'])}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="sikka.appKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Sikka App Key
                                            </label>
                                            <PasswordField
                                                id="sikka.appKey"
                                                name="sikka[appKey]"
                                                editable={editing.insurance}
                                                {...bind(['sikka', 'appKey'])}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="sikka.refreshKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Sikka Refresh Key
                                            </label>
                                            <PasswordField
                                                id="sikka.refreshKey"
                                                name="sikka[refreshKey]"
                                                editable={editing.insurance}
                                                {...bind(['sikka', 'refreshKey'])}
                                            />
                                        </div>
                                    </div>
                                )}

                                {insuranceProvider === 'zuub' && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label htmlFor="zuub.apiKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Zuub API Key
                                            </label>
                                            <PasswordField
                                                id="zuub.apiKey"
                                                name="zuub[apiKey]"
                                                editable={editing.insurance}
                                                {...bind(['zuub', 'apiKey'])}
                                                placeholder="Enter your Zuub API key"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="zuub.apiUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Zuub API URL
                                            </label>
                                            <TextInput
                                                id="zuub.apiUrl"
                                                name="zuub[apiUrl]"
                                                editable={editing.insurance}
                                                {...bind(['zuub', 'apiUrl'])}
                                                placeholder="https://api.zuub.com/v1"
                                                type="url"
                                                icon={paths.link}
                                            />
                                        </div>
                                    </div>
                                )}
                            </SettingsCard>

                            {/* 12) Document Storage */}
                            <SettingsCard
                                title="Document Storage"
                                iconPath={paths.server}
                                isOpen={open === 'documents'}
                                isEditing={editing.documents}
                                savedFlash={flashBtn.documents}
                                onToggle={() => toggleOpen('documents')}
                                onEdit={() => startEdit('documents')}
                                onDone={() => endEdit('documents')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="document_storage.s3.bucket" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            S3 Bucket
                                        </label>
                                        <TextInput id="document_storage.s3.bucket" name="document_storage[s3][bucket]" editable={editing.documents} {...bind(['document_storage', 's3', 'bucket'])} />
                                    </div>
                                    <div>
                                        <label htmlFor="document_storage.s3.region" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Region
                                        </label>
                                        <TextInput id="document_storage.s3.region" name="document_storage[s3][region]" editable={editing.documents} {...bind(['document_storage', 's3', 'region'])} />
                                    </div>
                                    <div>
                                        <label htmlFor="document_storage.s3.accessKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Access Key
                                        </label>
                                        <TextInput id="document_storage.s3.accessKey" name="document_storage[s3][accessKey]" editable={editing.documents} {...bind(['document_storage', 's3', 'accessKey'])} />
                                    </div>
                                    <div>
                                        <label htmlFor="document_storage.s3.secretKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Secret Key
                                        </label>
                                        <PasswordField id="document_storage.s3.secretKey" name="document_storage[s3][secretKey]" editable={editing.documents} {...bind(['document_storage', 's3', 'secretKey'])} />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 13) GHL (GoHighLevel) Integration */}
                            <SettingsCard
                                title="GHL"
                                iconPath={paths.link}
                                isOpen={open === 'ghl'}
                                isEditing={editing.ghl}
                                savedFlash={flashBtn.ghl}
                                onToggle={() => toggleOpen('ghl')}
                                onEdit={() => startEdit('ghl')}
                                onDone={() => endEdit('ghl')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="ghl.apiBaseUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            API Base URL
                                        </label>
                                        <TextInput
                                            id="ghl.apiBaseUrl"
                                            name="ghl[apiBaseUrl]"
                                            placeholder="https://rest.gohighlevel.com"
                                            icon={paths.link}
                                            editable={editing.ghl}
                                            {...bind(['ghl', 'apiBaseUrl'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ghl.apiKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            API Key
                                        </label>
                                        <PasswordField
                                            id="ghl.apiKey"
                                            name="ghl[apiKey]"
                                            placeholder="Enter GHL API Key"
                                            editable={editing.ghl}
                                            {...bind(['ghl', 'apiKey'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ghl.webhookSecret" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Webhook Secret
                                        </label>
                                        <PasswordField
                                            id="ghl.webhookSecret"
                                            name="ghl[webhookSecret]"
                                            placeholder="Enter Webhook Secret"
                                            editable={editing.ghl}
                                            {...bind(['ghl', 'webhookSecret'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ghl.locationId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Location ID
                                        </label>
                                        <TextInput
                                            id="ghl.locationId"
                                            name="ghl[locationId]"
                                            placeholder="Enter Location ID"
                                            icon={paths.id}
                                            editable={editing.ghl}
                                            {...bind(['ghl', 'locationId'])}
                                        />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 14) Dental Exchange Clearinghouse */}
                            <SettingsCard
                                title="Dental Exchange Clearinghouse"
                                iconPath={paths.shield}
                                isOpen={open === 'dentalExchange'}
                                isEditing={editing.dentalExchange}
                                savedFlash={flashBtn.dentalExchange}
                                onToggle={() => toggleOpen('dentalExchange')}
                                onEdit={() => startEdit('dentalExchange')}
                                onDone={() => endEdit('dentalExchange')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="dentalExchange.username" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Username
                                        </label>
                                        <TextInput
                                            id="dentalExchange.username"
                                            name="dentalExchange[username]"
                                            placeholder="support@qiaben.com"
                                            icon={paths.user}
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'username'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Password
                                        </label>
                                        <PasswordField
                                            id="dentalExchange.password"
                                            name="dentalExchange[password]"
                                            placeholder="Enter password"
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'password'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.apiKey" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            API Key
                                        </label>
                                        <PasswordField
                                            id="dentalExchange.apiKey"
                                            name="dentalExchange[apiKey]"
                                            placeholder="84b25980d68e816f7057151387d272e"
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'apiKey'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.baseUrl" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Base URL
                                        </label>
                                        <TextInput
                                            id="dentalExchange.baseUrl"
                                            name="dentalExchange[baseUrl]"
                                            placeholder="https://xconnect-api.dentalxchange.com"
                                            icon={paths.link}
                                            type="url"
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'baseUrl'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.dxcGroupId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            DXC Group ID
                                        </label>
                                        <TextInput
                                            id="dentalExchange.dxcGroupId"
                                            name="dentalExchange[dxcGroupId]"
                                            placeholder="-149229"
                                            icon={paths.id}
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'dxcGroupId'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.environment" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Environment
                                        </label>
                                        <TextInput
                                            id="dentalExchange.environment"
                                            name="dentalExchange[environment]"
                                            placeholder="sandbox"
                                            icon={paths.cog}
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'environment'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dentalExchange.enabled" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Enabled
                                        </label>
                                        <TextInput
                                            id="dentalExchange.enabled"
                                            name="dentalExchange[enabled]"
                                            placeholder="true"
                                            icon={paths.checkCircle}
                                            editable={editing.dentalExchange}
                                            {...bind(['dentalExchange', 'enabled'])}
                                        />
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* 15) Cloudflare */}
                            <SettingsCard
                                title="Cloudflare"
                                iconPath={paths.cloud}
                                isOpen={open === 'cloudflare'}
                                isEditing={editing.cloudflare}
                                savedFlash={flashBtn.cloudflare}
                                onToggle={() => toggleOpen('cloudflare')}
                                onEdit={() => startEdit('cloudflare')}
                                onDone={() => endEdit('cloudflare')}
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="cloudflare.appId" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            App ID
                                        </label>
                                        <TextInput
                                            id="cloudflare.appId"
                                            name="cloudflare[appId]"
                                            placeholder="00c4eff9-3d67-45b5-8c95-d2d736149b9f"
                                            icon={paths.id}
                                            editable={editing.cloudflare}
                                            {...bind(['cloudflare', 'appId'])}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="cloudflare.apiToken" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            API Token
                                        </label>
                                        <PasswordField
                                            id="cloudflare.apiToken"
                                            name="cloudflare[apiToken]"
                                            placeholder="Enter API Token"
                                            editable={editing.cloudflare}
                                            {...bind(['cloudflare', 'apiToken'])}
                                        />
                                    </div>
                                </div>
                            </SettingsCard>
                        </form>
                    </div>
                </div>
            </div>

            {/* Toast keyframes */}
            <style jsx global>{`
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
        </AdminLayout>
    );
}
