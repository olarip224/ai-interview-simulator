'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { INTERVIEW_TYPE_LABELS } from '@/components/interviews/labels'
import { getPresentInterviewTypes, sortProgressAscending, toChartRows } from '@/components/analytics/progress-data'
import type { ProgressItem } from '@/types/analytics'
import type { InterviewType } from '@/types/interview'

const SERIES_COLOR_VARS: Record<InterviewType, string> = {
  swe: 'var(--chart-1)',
  ml: 'var(--chart-2)',
  behavioral: 'var(--chart-3)',
  cybersecurity: 'var(--chart-4)',
}

interface ProgressChartProps {
  items: ProgressItem[]
}

export function ProgressChart({ items }: ProgressChartProps) {
  const sorted = sortProgressAscending(items)
  const presentTypes = getPresentInterviewTypes(sorted)
  const rows = toChartRows(sorted)

  const config: ChartConfig = Object.fromEntries(
    presentTypes.map((type) => [type, { label: INTERVIEW_TYPE_LABELS[type], color: SERIES_COLOR_VARS[type] }])
  )

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart data={rows} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="completed_at"
          tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          tickLine={false}
          axisLine={false}
        />
        <YAxis domain={[0, 10]} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(value) => new Date(value as string).toLocaleDateString()} />}
        />
        {presentTypes.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {presentTypes.map((type) => (
          <Line
            key={type}
            dataKey={type}
            type="monotone"
            stroke={`var(--color-${type})`}
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
