import { test, expect } from '@playwright/test'
import path from 'path'

// AI-dependent steps (question generation, answer feedback) hit the real Claude
// API and can take several seconds — this test needs a real ANTHROPIC_API_KEY
// configured on the backend, and a generous overall timeout.
test.setTimeout(180_000)

test('register, upload a resume, run an interview, and view analytics', async ({ page }) => {
  const unique = Date.now()
  const email = `e2e-${unique}@example.com`
  const username = `e2euser${unique}`
  const password = 'e2e-test-password-123'

  // ─── Register ───────────────────────────────────────────────────────────
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: new RegExp(`welcome, ${username}`, 'i') })).toBeVisible()

  // ─── Upload a resume (navigate via the dashboard card — unambiguous heading) ─
  await page.getByRole('heading', { name: 'Resumes' }).click()
  await expect(page).toHaveURL('/resumes')
  await page.getByLabel(/upload resume pdf/i).setInputFiles(path.join(__dirname, 'fixtures/sample-resume.pdf'))
  await expect(page.getByText('sample-resume.pdf')).toBeVisible()

  // ─── Run an interview session (Sidebar nav is unambiguous once off the dashboard) ─
  await page.getByRole('link', { name: 'Interview Sessions' }).click()
  await expect(page).toHaveURL('/interviews')
  await page.getByRole('button', { name: 'New Session' }).click()
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/interviews\/[^/]+$/)

  await page.getByRole('button', { name: /generate first question/i }).click()
  await expect(page.getByText(/^question \d+/i)).toBeVisible({ timeout: 30_000 })

  await page
    .getByPlaceholder(/type your answer/i)
    .fill('I would use a hash map to store seen values and check for the complement in O(n) time.')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Feedback', { exact: true })).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: 'End interview' }).click()
  await page.getByRole('button', { name: 'End interview' }).last().click()
  await expect(page).toHaveURL(/\/interviews\/[^/]+\/feedback$/)
  await expect(page.getByText('Completed')).toBeVisible()

  // ─── View analytics ─────────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Analytics' }).click()
  await expect(page).toHaveURL('/analytics')
  await expect(page.getByText('Total sessions')).toBeVisible()
  await expect(page.getByText(/complete an interview session to start/i)).not.toBeVisible()
})
