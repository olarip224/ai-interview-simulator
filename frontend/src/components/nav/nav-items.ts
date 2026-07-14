import { FileText, MessageSquare, Code2, BarChart3, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/interviews', label: 'Interview Sessions', icon: MessageSquare },
  { href: '/challenges', label: 'Coding Challenges', icon: Code2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]
