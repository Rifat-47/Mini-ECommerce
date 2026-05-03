import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i)

function parseValue(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

function formatDisplay(value) {
  const p = parseValue(value)
  if (!p) return ''
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

export default function DateOfBirthPicker({ initialValue = '', onChange }) {
  const [value, setValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const [view, setView] = useState('calendar') // 'calendar' | 'year'

  const parsed = parseValue(value)
  const today = new Date()
  const [viewYear, setViewYear] = useState(parsed?.year || today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month || today.getMonth() + 1)

  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const yearListRef = useRef(null)

  // Sync internal value if parent changes initialValue after mount (e.g. async profile load)
  useEffect(() => {
    if (initialValue && initialValue !== value) {
      setValue(initialValue)
      const p = parseValue(initialValue)
      if (p) { setViewYear(p.year); setViewMonth(p.month) }
    }
  }, [initialValue])

  // Position panel below (or above) trigger
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const panelH = 320
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= panelH + 8
        ? rect.bottom + window.scrollY + 4
        : rect.top + window.scrollY - panelH - 4
      setPanelStyle({ top, left: rect.left + window.scrollX, width: Math.max(rect.width, 280) })
    }
    if (open && view === 'year') {
      // Scroll year list to selected year
      requestAnimationFrame(() => {
        if (yearListRef.current) {
          const idx = YEARS.indexOf(viewYear)
          if (idx >= 0) yearListRef.current.scrollTop = idx * 36 - 72
        }
      })
    }
  }, [open, view])

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !(panelRef.current && panelRef.current.contains(e.target))
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectDate(day) {
    const iso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setValue(iso)
    onChange(iso)
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const totalDays = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)]

  return (
    <div ref={triggerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setView('calendar'); setOpen(o => !o) }}
        className={cn(
          'w-full flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-background ring-offset-background transition-colors text-left',
          open ? 'border-ring ring-2 ring-ring ring-offset-2' : 'border-input hover:border-ring/50',
          !value && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{value ? formatDisplay(value) : 'Select date of birth'}</span>
      </button>

      {/* Popover */}
      {open && createPortal(
        <div
          ref={panelRef}
          style={{ ...panelStyle, position: 'absolute' }}
          className="z-[9999] rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
        >
          {view === 'calendar' ? (
            <div className="p-3 w-[280px]">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setView('year')}
                  className="text-sm font-semibold hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-accent"
                >
                  {MONTHS[viewMonth - 1]} {viewYear}
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />
                  const isSelected = parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === day
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={cn(
                        'h-8 w-full rounded-md text-sm transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Year picker */
            <div className="w-[280px]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="text-sm font-semibold">Select Year</span>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="text-xs text-primary hover:underline"
                >
                  Back
                </button>
              </div>
              <ul ref={yearListRef} className="h-[216px] overflow-y-auto">
                {YEARS.map(y => (
                  <li
                    key={y}
                    onClick={() => { setViewYear(y); setView('calendar') }}
                    className={cn(
                      'flex items-center px-4 h-9 text-sm cursor-pointer transition-colors select-none',
                      y === viewYear
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {y}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
