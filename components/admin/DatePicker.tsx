'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/shared/Input'
import { forwardRef } from 'react'
import PersianDate from 'persian-date'
import { motion, AnimatePresence } from 'framer-motion'
import { getTodayJalali } from '@/lib/utils/date'

interface DatePickerProps {
  label: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  name?: string
  error?: string
  placeholder?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, value, onChange, onBlur, name, error, placeholder = 'تاریخ را انتخاب کنید' }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    
    // Parse current date from value or use today
    const getCurrentDate = (): { year: number; month: number; day: number } => {
      if (value) {
        try {
          const [year, month, day] = value.split('/').map(Number)
          if (year && month && day) {
            return { year, month: month - 1, day }
          }
        } catch {
          // Fall through to default
        }
      }
      const today = new PersianDate()
      const year = today.year()
      const month = today.month()
      const day = today.date()
      return { year, month, day }
    }

    const [currentDate, setCurrentDate] = useState<{ year: number; month: number; day: number }>(() => {
      const today = new PersianDate()
      return { year: today.year(), month: today.month(), day: today.date() }
    })

    // Set default value to today if value is empty
    useEffect(() => {
      if (!value && onChange) {
        const today = getTodayJalali()
        const syntheticEvent = {
          target: { value: today },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }, []) // Only run on mount

    useEffect(() => {
      if (value) {
        const newDate = getCurrentDate()
        if (newDate.year && newDate.month !== undefined && newDate.month >= 0 && newDate.day) {
          setCurrentDate(newDate)
        }
      } else {
        // If value is empty, use today's date
        const today = new PersianDate()
        setCurrentDate({ 
          year: today.year(), 
          month: today.month(), 
          day: today.date() 
        })
      }
    }, [value])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    const handleDateSelect = (year: number, month: number, day: number) => {
      const formattedDate = `${year}/${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`
      if (onChange) {
        const syntheticEvent = {
          target: { value: formattedDate },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
      setIsOpen(false)
    }

    // Ensure currentDate has valid values
    const today = new PersianDate()
    const todayYear = today.year()
    const todayMonth = today.month()
    const todayDay = today.date()
    
    const currentYear = currentDate?.year || todayYear
    const currentMonth = currentDate?.month !== undefined ? currentDate.month : todayMonth

    // Calculate days in month and first day of week
    // For Persian calendar, we need to calculate manually
    const getDaysInMonth = (year: number, month: number): number => {
      if (month < 6) return 31
      if (month < 11) return 30
      // Check if it's a leap year (سال کبیسه)
      const isLeap = (year % 4 === 3)
      return isLeap ? 30 : 29
    }

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    
    // Calculate first day of week (0 = شنبه, 6 = جمعه)
    const getFirstDayOfWeek = (year: number, month: number): number => {
      // Create a PersianDate for the first day of the month
      // We'll use a helper function to create the date
      const tempDate = new Date(2000, 0, 1)
      const pd = new PersianDate(tempDate)
      // We need to set the date manually by converting Jalali to Miladi
      // For now, use a simple approximation
      const miladiDate = new Date(year + 621, month, 1)
      const dayOfWeek = miladiDate.getDay()
      // Convert to Persian week (Saturday = 0)
      return (dayOfWeek + 1) % 7
    }

    const firstDayWeek = getFirstDayOfWeek(currentYear, currentMonth)

    const calendarDays: { year: number; month: number; day: number }[] = []
    // Add empty cells for days before month start
    for (let i = 0; i < firstDayWeek; i++) {
      calendarDays.push({ year: 0, month: 0, day: 0 })
    }
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({ year: currentYear, month: currentMonth, day })
    }

    const monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ]

    const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

    const navigateMonth = (direction: 'prev' | 'next') => {
      let newYear = currentYear
      let newMonth = currentMonth
      
      if (direction === 'prev') {
        if (newMonth === 0) {
          newMonth = 11
          newYear--
        } else {
          newMonth--
        }
      } else {
        if (newMonth === 11) {
          newMonth = 0
          newYear++
        } else {
          newMonth++
        }
      }
      
      setCurrentDate({ year: newYear, month: newMonth, day: 1 })
    }

    return (
      <div className="relative" ref={containerRef}>
        <div onClick={() => setIsOpen(!isOpen)}>
        <Input
          ref={ref}
          label={label}
          type="text"
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          name={name}
          placeholder={placeholder}
          error={error}
          readOnly
        />
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 mt-4 pointer-events-none">
          <svg
            className="w-6 h-6 text-text-secondary dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 mt-2 w-80 bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-4"
              >
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateMonth('prev')
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <div className="font-bold text-text dark:text-text-dark">
                      {monthNames[currentMonth]} {currentYear}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateMonth('next')
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Week Days */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-bold text-text-secondary dark:text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dateInfo, index) => {
                    if (dateInfo.day === 0) {
                      return <div key={index} className="aspect-square" />
                    }
                    const isToday = dateInfo.year === todayYear &&
                      dateInfo.month === todayMonth &&
                      dateInfo.day === todayDay
                    const isSelected = value && value === `${dateInfo.year}/${String(dateInfo.month + 1).padStart(2, '0')}/${String(dateInfo.day).padStart(2, '0')}`

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDateSelect(dateInfo.year, dateInfo.month, dateInfo.day)
                        }}
                        className={`aspect-square rounded-lg text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary text-white font-bold'
                            : isToday
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text dark:text-text-dark'
                        }`}
                      >
                        {dateInfo.day}
                      </button>
                    )
                  })}
                </div>

                {/* Today Button */}
                <div className="mt-4 pt-4 border-t border-border dark:border-border-dark">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDateSelect(todayYear, todayMonth, todayDay)
                    }}
                    className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    امروز
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

