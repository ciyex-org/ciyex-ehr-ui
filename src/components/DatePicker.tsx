"use client";
import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  maxDate?: string; // YYYY-MM-DD format — disables days after this date
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = "mm/dd/yyyy", maxDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
      if (isNaN(date.getTime())) return '';
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${mm}/${dd}/${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const isDayDisabled = (day: number): boolean => {
    if (!maxDate) return false;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateString > maxDate;
  };

  const handleDateClick = (day: number) => {
    if (isDayDisabled(day)) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={formatDisplayDate(value || '')}
          placeholder={placeholder}
          onClick={() => {
            console.log('DatePicker clicked, current isOpen:', isOpen);
            setIsOpen(!isOpen);
          }}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64" style={{zIndex: 9999}}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
              style={{visibility: showYearPicker ? 'hidden' : 'visible'}}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="font-medium text-sm hover:bg-gray-100 px-2 py-1 rounded"
            >
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </button>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
              style={{visibility: showYearPicker ? 'hidden' : 'visible'}}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {showYearPicker ? (
            /* Year picker */
            <div className="max-h-32 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1">
                {Array.from({length: new Date().getFullYear() - 1950 + 1}, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setCurrentDate(new Date(year, currentDate.getMonth()));
                        setShowYearPicker(false);
                      }}
                      className={`py-2 px-1 text-xs rounded hover:bg-blue-100 ${
                        year === currentDate.getFullYear() ? 'bg-blue-500 text-white' : 'text-gray-900'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => day && handleDateClick(day)}
                    disabled={!day || (!!day && isDayDisabled(day))}
                    className={`py-1 px-1 text-xs rounded transition-colors ${
                      !day ? 'text-transparent cursor-default'
                      : (isDayDisabled(day)) ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-900 hover:bg-blue-100 cursor-pointer'
                    } ${
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear()
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : ''
                    }`}
                  >
                    {day || ''}
                  </button>
                ))}
              </div>
            </>
          )}
          
          {/* Footer */}
          <div className="flex justify-between mt-3">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-blue-500 hover:text-blue-700 text-xs"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onChange(today);
                setIsOpen(false);
              }}
              className="text-blue-500 hover:text-blue-700 text-xs"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;