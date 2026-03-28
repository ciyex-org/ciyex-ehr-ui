"use client";
import React, { useRef, useCallback } from "react";

/**
 * DateInput — drop-in replacement for <input type="date"> that shows MM/DD/YYYY
 * placeholder and uses a text input with a hidden native date picker for calendar.
 *
 * Props mirror <input type="date"> plus optional extras.
 *   value:       YYYY-MM-DD string (same as native date input)
 *   onChange:    fires with a synthetic-like event: e.target.value = YYYY-MM-DD
 *   placeholder: defaults to "MM/DD/YYYY"
 *   className:   passed to the visible text input
 *   All other HTML input props are forwarded (id, name, required, disabled, min, max, etc.)
 */

const pad = (n: number) => String(n).padStart(2, "0");

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  // Handle YYYY-MM-DD
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return iso;
}

function displayToIso(display: string): string {
  if (!display) return "";
  const parts = display.replace(/[^0-9/]/g, "").split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    const mm = parts[0].padStart(2, "0");
    const dd = parts[1].padStart(2, "0");
    return `${parts[2]}-${mm}-${dd}`;
  }
  return "";
}

/** Auto-insert slashes as user types MM/DD/YYYY */
function autoMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  onChange?: (e: { target: { name?: string; value: string } }) => void;
};

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, placeholder = "MM/DD/YYYY", className, name, ...rest }, ref) => {
    const hiddenRef = useRef<HTMLInputElement>(null);
    const textRef = useRef<HTMLInputElement>(null);

    // Display value in MM/DD/YYYY format
    const displayVal = isoToDisplay(String(value || ""));

    const fireChange = useCallback(
      (isoVal: string) => {
        onChange?.({ target: { name, value: isoVal } });
      },
      [onChange, name]
    );

    // Handle typed input with auto-masking
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = autoMask(e.target.value);
      // If fully typed (MM/DD/YYYY = 10 chars), convert to ISO
      if (masked.length === 10) {
        const iso = displayToIso(masked);
        if (iso) {
          // Validate the date is real
          const d = new Date(iso + "T00:00:00");
          if (!isNaN(d.getTime())) {
            fireChange(iso);
            return;
          }
        }
      }
      // Partial input — update display but don't fire ISO change yet
      if (e.target) {
        e.target.value = masked;
      }
      // If cleared, fire empty
      if (masked === "") {
        fireChange("");
      }
    };

    // Handle native date picker selection
    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      fireChange(e.target.value || "");
    };

    // Open calendar picker on icon click
    const openPicker = () => {
      if (hiddenRef.current) {
        hiddenRef.current.showPicker?.();
        hiddenRef.current.click();
      }
    };

    return (
      <div className="relative" style={{ display: "inline-flex", width: "100%" }}>
        <input
          ref={(node) => {
            (textRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={displayVal}
          onChange={handleTextChange}
          className={className}
          name={name}
          autoComplete="off"
          {...rest}
        />
        {/* Hidden native date input for calendar picker */}
        <input
          ref={hiddenRef}
          type="date"
          value={String(value || "")}
          onChange={handlePickerChange}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
          min={rest.min as string}
          max={rest.max as string}
        />
        {/* Calendar icon button */}
        <button
          type="button"
          onClick={openPicker}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label="Open calendar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";
export default DateInput;
