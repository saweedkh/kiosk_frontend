import PersianDate from 'persian-date'
// @ts-ignore - moment-jalaali doesn't have type definitions
import moment from 'moment-jalaali'

export function formatJalaliDate(date: Date | string): string {
  // Ensure we have a valid Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date)
    return ''
  }
  
  const persianDate = new PersianDate(dateObj)
  return persianDate.format('YYYY/MM/DD')
}

export function formatJalaliDateTime(date: Date | string): string {
  // Ensure we have a valid Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date)
    return ''
  }
  
  const persianDate = new PersianDate(dateObj)
  return persianDate.format('YYYY/MM/DD HH:mm:ss')
}

export function getTodayJalali(): string {
  return formatJalaliDate(new Date())
}

export function getTehranTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' }))
}

export function formatTime(date: Date | string): string {
  // Ensure we have a valid Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date)
    return ''
  }
  
  const persianDate = new PersianDate(dateObj)
  return persianDate.format('HH:mm')
}

// تبدیل تاریخ شمسی به میلادی با استفاده از PersianDate
export function convertJalaliToMiladi(jalaliDate: string): string {
  // بررسی خالی بودن یا null بودن
  if (!jalaliDate || typeof jalaliDate !== 'string' || jalaliDate.trim() === '') {
    return ''
  }
  
  const trimmedDate = jalaliDate.trim()
  
  // بررسی فرمت تاریخ (باید به صورت YYYY/MM/DD باشد)
  const datePattern = /^\d{4}\/\d{2}\/\d{2}$/
  if (!datePattern.test(trimmedDate)) {
    console.error('Invalid Jalali date format:', jalaliDate)
    return ''
  }
  
  try {
    // Parse تاریخ شمسی
    const [year, month, day] = trimmedDate.split('/').map(Number)
    
    // بررسی معتبر بودن اعداد
    if (!year || !month || !day || year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('Invalid Jalali date values:', { year, month, day })
      return ''
    }
    
    // استفاده از PersianDate برای تبدیل دقیق
    // PersianDate می‌تواند با آرایه استفاده شود: [year, month-1, day] (month از 0 شروع می‌شود)
    // @ts-ignore - PersianDate constructor accepts array
    const persianDate = new PersianDate([year, month - 1, day])
    const miladiDate = persianDate.toDate()
    
    // بررسی معتبر بودن تاریخ
    if (isNaN(miladiDate.getTime())) {
      console.error('Invalid date conversion:', jalaliDate)
      return ''
    }
    
    // فرمت کردن به YYYY-MM-DD
    const yearMiladi = miladiDate.getFullYear()
    const monthMiladi = String(miladiDate.getMonth() + 1).padStart(2, '0')
    const dayMiladi = String(miladiDate.getDate()).padStart(2, '0')
    
    const formatted = `${yearMiladi}-${monthMiladi}-${dayMiladi}`
    
    // بررسی اینکه تاریخ معتبر است (باید بین 1900 تا 2100 باشد)
    if (yearMiladi < 1900 || yearMiladi > 2100) {
      console.error('Invalid date conversion result:', formatted, 'from:', jalaliDate)
      return ''
    }
    
    return formatted
  } catch (error) {
    console.error('Error converting date:', error, 'input:', jalaliDate)
    return ''
  }
}

