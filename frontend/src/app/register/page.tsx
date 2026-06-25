'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import type { ValidationErrorDetail } from '@/types/auth'

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, - and _'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type RegisterFormValues = z.infer<typeof registerSchema>

function fieldError(detail: string | ValidationErrorDetail[], field: string): string | null {
  if (!Array.isArray(detail)) return null
  const match = detail.find((d) => d.loc.includes(field))
  return match ? match.msg : null
}

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', username: '', password: '' },
  })

  async function onSubmit(values: RegisterFormValues) {
    setApiError(null)
    setIsLoading(true)
    try {
      await register({ email: values.email, username: values.username, password: values.password })
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail
        if (status === 409 && typeof detail === 'string') {
          if (detail.toLowerCase().includes('email')) {
            form.setError('email', { message: 'This email is already registered.' })
          } else if (detail.toLowerCase().includes('username')) {
            form.setError('username', { message: 'This username is already taken.' })
          } else {
            setApiError(detail)
          }
        } else if (status === 422 && Array.isArray(detail)) {
          const emailErr = fieldError(detail, 'email')
          const usernameErr = fieldError(detail, 'username')
          const passwordErr = fieldError(detail, 'password')
          if (emailErr) form.setError('email', { message: emailErr })
          if (usernameErr) form.setError('username', { message: usernameErr })
          if (passwordErr) form.setError('password', { message: passwordErr })
          if (!emailErr && !usernameErr && !passwordErr) setApiError('Validation failed. Please check your inputs.')
        } else if (status === 429) {
          setApiError('Too many attempts. Please wait a minute and try again.')
        } else {
          setApiError('Something went wrong. Please try again.')
        }
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Sign up to start practicing with AI-powered interview feedback</CardDescription>
        </CardHeader>
        <CardContent>
          {apiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="yourname" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
