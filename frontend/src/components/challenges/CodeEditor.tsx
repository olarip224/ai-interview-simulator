'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
})

interface CodeEditorProps {
  language: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
}

export function CodeEditor({ language, value, onChange, readOnly = false, height = '20rem' }: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(newValue) => onChange?.(newValue ?? '')}
        options={{ readOnly, minimap: { enabled: false }, fontSize: 13 }}
        theme="vs-dark"
      />
    </div>
  )
}
