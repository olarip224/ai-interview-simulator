export function getStarterCodeForLanguage(starterCode: Record<string, string>, language: string): string {
  return starterCode[language] ?? `// Write your ${language} solution here`
}
