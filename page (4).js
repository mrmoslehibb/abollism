'use client'

import { useState } from 'react'
import { sb } from '../../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('in') // 'in' | 'up'
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    invite: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async () => {
    setError('')
    setLoading(true)

    try {
      if (mode === 'in') {
        const { error: err } = await sb.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })
        if (err) throw err
      } else {
        const username = form.username.trim()
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error('نام کاربری باید ۳ تا ۲۰ حرف انگلیسی، عدد یا _ باشد')
        }
        if (form.password.length < 6) {
          throw new Error('رمز باید حداقل ۶ کاراکتر باشد')
        }

        const { error: err } = await sb.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              username,
              invite: form.invite.trim(),
            },
          },
        })
        if (err) throw err
      }

      window.location.href = '/'
    } catch (e) {
      setError(
        mode === 'in'
          ? e.message || 'ورود ناموفق بود'
          : e.message ||
              'ثبت‌نام ناموفق بود. کد دعوت، نام کاربری یا رمز را بررسی کن.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wrap adm" style={{ maxWidth: 420 }}>
      <p className="nav-links">
        <a href="/">← خانه</a>
      </p>

      <h2>{mode === 'in' ? 'ورود' : 'ثبت‌نام (با کد دعوت)'}</h2>

      <label>
        ایمیل
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          autoComplete="email"
          disabled={loading}
        />
      </label>

      <label>
        رمز
        <input
          type="password"
          value={form.password}
          onChange={set('password')}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          disabled={loading}
        />
      </label>

      {mode === 'up' && (
        <>
          <label>
            نام کاربری
            <input
              value={form.username}
              onChange={set('username')}
              placeholder="فقط انگلیسی، عدد و _"
              disabled={loading}
              dir="ltr"
            />
          </label>
          <label>
            کد دعوت
            <input
              value={form.invite}
              onChange={set('invite')}
              disabled={loading}
              dir="ltr"
            />
          </label>
        </>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: 12 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="primary" onClick={submit} disabled={loading}>
          {loading ? 'صبر کن…' : mode === 'in' ? 'ورود' : 'ساخت حساب'}
        </button>
        <button
          className="ghost"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError('')
          }}
          disabled={loading}
        >
          {mode === 'in' ? 'حساب ندارم' : 'حساب دارم'}
        </button>
      </div>
    </div>
  )
}
