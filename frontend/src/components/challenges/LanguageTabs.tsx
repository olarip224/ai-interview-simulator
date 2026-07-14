'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EDITOR_LANGUAGES, EDITOR_LANGUAGE_LABELS, type EditorLanguage } from '@/components/challenges/labels'

interface LanguageTabsProps {
  value: EditorLanguage
  onValueChange: (language: EditorLanguage) => void
}

export function LanguageTabs({ value, onValueChange }: LanguageTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as EditorLanguage)}>
      <TabsList>
        {EDITOR_LANGUAGES.map((lang) => (
          <TabsTrigger key={lang} value={lang}>
            {EDITOR_LANGUAGE_LABELS[lang]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
