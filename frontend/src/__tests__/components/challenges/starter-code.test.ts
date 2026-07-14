import { describe, it, expect } from 'vitest'
import { getStarterCodeForLanguage } from '@/components/challenges/starter-code'

describe('getStarterCodeForLanguage', () => {
  it('returns the starter code for a language the challenge provides', () => {
    const starterCode = { python: 'def solve(): pass', javascript: 'function solve() {}' }
    expect(getStarterCodeForLanguage(starterCode, 'python')).toBe('def solve(): pass')
  })

  it('falls back to a placeholder comment for a language with no starter code', () => {
    const starterCode = { python: 'def solve(): pass' }
    expect(getStarterCodeForLanguage(starterCode, 'go')).toBe('// Write your go solution here')
  })

  it('falls back to a placeholder when starter_code is empty', () => {
    expect(getStarterCodeForLanguage({}, 'typescript')).toBe('// Write your typescript solution here')
  })
})
