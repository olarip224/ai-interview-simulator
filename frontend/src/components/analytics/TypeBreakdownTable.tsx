import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { INTERVIEW_TYPE_LABELS } from '@/components/interviews/labels'
import type { TypeBreakdownItem } from '@/types/analytics'

interface TypeBreakdownTableProps {
  items: TypeBreakdownItem[]
}

export function TypeBreakdownTable({ items }: TypeBreakdownTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By interview type</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Sessions</th>
              <th className="pb-2 font-medium">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.interview_type} className="border-t">
                <td className="py-2">{INTERVIEW_TYPE_LABELS[item.interview_type]}</td>
                <td className="py-2 tabular-nums">{item.sessions}</td>
                <td className="py-2 tabular-nums">{item.avg_score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
