import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserSummary } from '@/types/analytics'

interface SummaryStatsCardsProps {
  summary: UserSummary
}

function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(1)
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function SummaryStatsCards({ summary }: SummaryStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Total sessions" value={String(summary.total_sessions)} />
      <StatTile label="Avg overall score" value={formatScore(summary.avg_overall_score)} />
      <StatTile label="Avg technical" value={formatScore(summary.avg_technical_score)} />
      <StatTile label="Avg communication" value={formatScore(summary.avg_communication_score)} />
      <StatTile label="Avg correctness" value={formatScore(summary.avg_correctness_score)} />
    </div>
  )
}
