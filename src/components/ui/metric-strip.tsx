import type { CSSProperties, ReactNode } from 'react'
import type { StorelyStatus } from './design-tokens'
import { cn } from './utils'

type MetricTone = StorelyStatus | 'neutral'

export type StorelyMetric = {
  label: ReactNode
  value: ReactNode
  helper?: ReactNode
  tone?: MetricTone
}

type MetricStripProps = {
  metrics: StorelyMetric[]
  className?: string
}

const valueToneClasses: Record<MetricTone, string> = {
  neutral: 'text-[#203640]',
  success: 'text-[#047857]',
  warning: 'text-[#B45309]',
  danger: 'text-[#B91C1C]',
  info: 'text-[#4F6678]',
}

export function StorelyMetricStrip({ metrics, className }: MetricStripProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[6px] border border-[#E7E1D8] bg-white',
        className,
      )}
    >
      <div className="grid divide-y divide-[#E7E1D8] md:grid-cols-[repeat(var(--metric-count),minmax(0,1fr))] md:divide-x md:divide-y-0 md:divide-x-reverse" style={{ '--metric-count': metrics.length } as CSSProperties}>
        {metrics.map((metric, index) => (
          <div key={index} className="min-w-0 px-4 py-3">
            <div className="truncate text-[13px] font-semibold text-[#66737C]">{metric.label}</div>
            <div className={cn('mt-1.5 truncate text-xl font-semibold leading-7 tabular-nums', valueToneClasses[metric.tone ?? 'neutral'])}>
              {metric.value}
            </div>
            {metric.helper ? (
              <div className="mt-1 truncate text-xs text-[#66737C]">{metric.helper}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
