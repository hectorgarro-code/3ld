export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  formatValue?: (v: number) => string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1 text-right text-xs font-bold text-slate-800 outline-none focus:border-primary"
          />
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {formatValue && (
        <p className="text-right text-xs text-slate-400">{formatValue(value)}</p>
      )}
    </div>
  )
}
