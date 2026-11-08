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

export function StorelyMetricStrip({ metrics, className }: MetricStripProps) {
  return (
    <section
      className={cn(
        'storely-metric-strip',
        className,
      )}
    >
      <div className="storely-metric-grid" style={{ '--metric-count': metrics.length } as CSSProperties}>
        {metrics.map((metric, index) => (
          <div key={index} className="storely-metric">
            <div className="storely-metric-label">{metric.label}</div>
            <div className="storely-metric-value" data-tone={metric.tone ?? 'neutral'}>
              {metric.value}
            </div>
            {metric.helper ? (
              <div className="storely-metric-helper">{metric.helper}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
