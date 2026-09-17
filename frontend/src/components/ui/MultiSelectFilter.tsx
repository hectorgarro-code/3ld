import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
  label: string
  value: string | number
  color?: string
}

interface MultiSelectFilterProps {
  label: string
  options: Option[]
  selectedValues: (string | number)[]
  onChange: (values: any[]) => void
  icon?: React.ReactNode
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  icon,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string | number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border",
          selectedValues.length > 0
            ? "border-primary bg-primary/5 text-primary"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        )}
      >
        {icon || <Filter className="h-3.5 w-3.5" />}
        <span>{label}</span>
        {selectedValues.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-primary px-1.5 text-[10px] text-white">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-64 origin-top-left rounded-xl bg-white p-2 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Filtro: {label}</span>
            {selectedValues.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors"
              >
                Limpiar <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              const textColorClass = option.color ? option.color.split(' ')[1] : "text-slate-700"
              const bgColorClass = option.color ? option.color.split(' ')[0] : "bg-slate-100"
              
              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    isSelected ? "bg-slate-50 font-bold" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    isSelected ? "border-primary bg-primary text-white" : "border-slate-300"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  
                  {option.color ? (
                    <span className={cn("px-2 py-0.5 rounded-md font-bold text-[10px]", textColorClass, bgColorClass)}>
                      {option.label}
                    </span>
                  ) : (
                    <span className={cn("truncate", isSelected ? "text-slate-800" : "text-slate-600")}>
                      {option.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
