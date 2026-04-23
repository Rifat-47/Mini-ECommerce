import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i)

const ITEM_HEIGHT = 36
const PANEL_HEIGHT = ITEM_HEIGHT * 5

function getDaysInMonth(month, year) {
  if (!month) return 31
  return new Date(year || 2000, parseInt(month), 0).getDate()
}

function CustomSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const triggerRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom

      if (spaceBelow >= PANEL_HEIGHT + 8) {
        setPanelStyle({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      } else {
        setPanelStyle({
          top: rect.top + window.scrollY - PANEL_HEIGHT - 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }

      // Scroll to selected item
      if (listRef.current && value) {
        const idx = options.findIndex(o => String(o.value) === String(value))
        if (idx >= 0) listRef.current.scrollTop = idx * ITEM_HEIGHT
      }
    }
  }, [open])

  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div ref={triggerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-1 rounded-md border px-2.5 py-2 text-sm bg-background ring-offset-background transition-colors
          ${open ? 'border-ring ring-2 ring-ring ring-offset-2' : 'border-input hover:border-ring/50'}
          ${!selected ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <ul
          ref={listRef}
          style={{ ...panelStyle, height: PANEL_HEIGHT, position: 'absolute', overflowY: 'scroll' }}
          className="z-[9999] rounded-md border border-border bg-popover shadow-md overscroll-contain"
        >
          {options.map(opt => (
            <li
              key={opt.value}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => { onChange(String(opt.value)); setOpen(false) }}
              className={`flex items-center px-3 text-sm cursor-pointer select-none transition-colors
                ${String(opt.value) === String(value)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

export default function DateOfBirthPicker({ initialValue = '', onChange }) {
  const parts = initialValue ? initialValue.split('-') : []
  const [year, setYear] = useState(parts[0] || '')
  const [month, setMonth] = useState(parts[1] ? String(parseInt(parts[1])) : '')
  const [day, setDay] = useState(parts[2] ? String(parseInt(parts[2])) : '')

  const daysInMonth = getDaysInMonth(month, year)

  const monthOptions = MONTHS.map((name, i) => ({ value: i + 1, label: name }))
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
  const yearOptions = YEARS.map(y => ({ value: y, label: String(y) }))

  function emit(nextMonth, nextDay, nextYear) {
    if (nextMonth && nextDay && nextYear) {
      const safeDay = Math.min(parseInt(nextDay), getDaysInMonth(nextMonth, nextYear))
      onChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`)
    } else {
      onChange('')
    }
  }

  function handleMonth(val) { setMonth(val); emit(val, day, year) }
  function handleDay(val)   { setDay(val);   emit(month, val, year) }
  function handleYear(val)  { setYear(val);  emit(month, day, val) }

  return (
    <div className="flex gap-1.5">
      <CustomSelect placeholder="Month" options={monthOptions} value={month} onChange={handleMonth} />
      <CustomSelect placeholder="Day"   options={dayOptions}   value={day}   onChange={handleDay} />
      <CustomSelect placeholder="Year"  options={yearOptions}  value={year}  onChange={handleYear} />
    </div>
  )
}
