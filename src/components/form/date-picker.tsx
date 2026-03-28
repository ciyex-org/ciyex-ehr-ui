import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create flatpickr instance once
  useEffect(() => {
    const isTime = mode === "time";
    const fp = flatpickr(`#${id}`, {
      mode: isTime ? "single" : (mode || "single"),
      static: false,
      appendTo: document.body,
      monthSelectorType: "static",
      dateFormat: isTime ? "H:i" : "m/d/Y",
      altInput: !isTime,
      altFormat: "m/d/Y",
      enableTime: isTime,
      noCalendar: isTime,
      time_24hr: false,
      defaultDate,
      onChange: (...args) => {
        const cb = onChangeRef.current;
        if (Array.isArray(cb)) cb.forEach(fn => fn(...args));
        else if (cb) cb(...args);
      },
    });
    fpRef.current = Array.isArray(fp) ? fp[0] : fp;

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  // Update the date when defaultDate prop changes (e.g. switching to edit mode)
  useEffect(() => {
    if (fpRef.current && defaultDate !== undefined) {
      fpRef.current.setDate(defaultDate, false);
    }
  }, [defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
