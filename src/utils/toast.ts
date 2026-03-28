/**
 * Simple toast notification utility.
 * Renders a temporary notification at the top-right of the screen.
 * No external dependencies required.
 */

type ToastType = "success" | "error" | "warning" | "info";

const ICON_MAP: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
};

const COLOR_MAP: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: "#ecfdf3", border: "#6ce9a6", text: "#027a48" },
    error: { bg: "#fef3f2", border: "#fda29b", text: "#b42318" },
    warning: { bg: "#fffaeb", border: "#fec84b", text: "#b54708" },
    info: { bg: "#f0f9ff", border: "#7cd4fd", text: "#026aa2" },
};

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
    if (container && document.body.contains(container)) return container;
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
        "position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:400px;";
    document.body.appendChild(container);
    return container;
}

function showToast(message: string, type: ToastType = "info", duration = 4000) {
    const root = getContainer();
    const colors = COLOR_MAP[type];
    const icon = ICON_MAP[type];

    const el = document.createElement("div");
    el.style.cssText = `
        pointer-events:auto;
        display:flex;align-items:center;gap:10px;
        padding:12px 16px;border-radius:8px;
        background:${colors.bg};border:1px solid ${colors.border};color:${colors.text};
        font-size:14px;font-family:inherit;line-height:1.4;
        box-shadow:0 4px 12px rgba(0,0,0,0.1);
        opacity:0;transform:translateX(100%);
        transition:opacity 0.3s,transform 0.3s;
        max-width:100%;word-break:break-word;
    `;

    const iconSpan = document.createElement("span");
    iconSpan.style.cssText = "font-size:18px;font-weight:bold;flex-shrink:0;";
    iconSpan.textContent = icon;

    const textSpan = document.createElement("span");
    textSpan.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = "margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:inherit;opacity:0.6;flex-shrink:0;padding:0 2px;";
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => dismiss();

    el.appendChild(iconSpan);
    el.appendChild(textSpan);
    el.appendChild(closeBtn);
    root.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateX(0)";
    });

    const dismiss = () => {
        el.style.opacity = "0";
        el.style.transform = "translateX(100%)";
        setTimeout(() => el.remove(), 300);
    };

    const timer = setTimeout(dismiss, duration);
    el.addEventListener("mouseenter", () => clearTimeout(timer));
    el.addEventListener("mouseleave", () => setTimeout(dismiss, 2000));
}

export const toast = {
    success: (msg: string, duration?: number) => showToast(msg, "success", duration),
    error: (msg: string, duration?: number) => showToast(msg, "error", duration),
    warning: (msg: string, duration?: number) => showToast(msg, "warning", duration),
    info: (msg: string, duration?: number) => showToast(msg, "info", duration),
};

/**
 * Modern confirm dialog replacement.
 * Returns a Promise<boolean> like window.confirm but with styled UI.
 */
export function confirmDialog(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style.cssText =
            "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;";

        const box = document.createElement("div");
        box.style.cssText =
            "background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.15);font-family:inherit;";

        const msg = document.createElement("p");
        msg.style.cssText = "margin:0 0 20px;font-size:15px;color:#344054;line-height:1.5;";
        msg.textContent = message;

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

        const cancelBtn = document.createElement("button");
        cancelBtn.style.cssText =
            "padding:8px 18px;border-radius:8px;border:1px solid #d0d5dd;background:white;color:#344054;font-size:14px;font-weight:500;cursor:pointer;";
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = () => { overlay.remove(); resolve(false); };

        const okBtn = document.createElement("button");
        okBtn.style.cssText =
            "padding:8px 18px;border-radius:8px;border:none;background:#d92d20;color:white;font-size:14px;font-weight:500;cursor:pointer;";
        okBtn.textContent = "Confirm";
        okBtn.onclick = () => { overlay.remove(); resolve(true); };

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        box.appendChild(msg);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus confirm button
        okBtn.focus();
    });
}
