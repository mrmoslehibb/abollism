'use client'

import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'

const PROJECT_FIELDS = [
  { key: 'title', label: 'عنوان', type: 'text' },
  { key: 'description', label: 'توضیح', type: 'textarea' },
  { key: 'tags', label: 'تگ‌ها (با کاما)', type: 'text' },
  { key: 'url', label: 'لینک', type: 'text' },
  { key: 'image_url', label: 'آدرس تصویر', type: 'text' },
  { key: 'sort_order', label: 'ترتیب', type: 'number' },
  { key: 'published', label: 'منتشر', type: 'checkbox' },
]

const POST_FIELDS = [
  { key: 'title', label: 'عنوان', type: 'text' },
  { key: 'slug', label: 'اسلاگ (انگلیسی)', type: 'text' },
  { key: 'body', label: 'متن', type: 'textarea' },
  { key: 'cover_url', label: 'کاور', type: 'text' },
  { key: 'published', label: 'منتشر', type: 'checkbox' },
]

const SETTINGS_FIELDS = [
  { key: 'site_name', label: 'نام سایت', type: 'text' },
  { key: 'tagline', label: 'شعار', type: 'text' },
  { key: 'hero_image_url', label: 'تصویر هیرو', type: 'text' },
  { key: 'contact', label: 'تماس / فوتر', type: 'text' },
]

function Crud({ table, fields, single = false }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const q = sb.from(table).select('*')
    if (single) {
      const { data } = await q.eq('id', 1).single()
      setRows(data ? [data] : [])
      setForm(data || {})
    } else {
      const { data } = await q.order('id', { ascending: false })
      setRows(data || [])
    }
  }

  useEffect(() => {
    load()
  }, [table])

  const save = async () => {
    setLoading(true)
    try {
      if (single || editing) {
        const id = single ? 1 : editing
        const { error } = await sb.from(table).update(form).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from(table).insert(form)
        if (error) throw error
      }
      setEditing(null)
      if (!single) setForm({})
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (row) => {
    setEditing(row.id)
    setForm({ ...row })
  }

  const remove = async (id) => {
    if (!confirm('حذف شود؟')) return
    await sb.from(table).delete().eq('id', id)
    load()
  }

  return (
    <div>
      {!single && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>
            {editing ? 'ویرایش' : 'افزودن جدید'}
          </h3>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === 'textarea' ? (
                <textarea
                  rows={5}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : f.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                  style={{ marginRight: 8 }}
                />
              ) : (
                <input
                  type={f.type}
                  value={form[f.key] ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.key]:
                        f.type === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  dir={f.key === 'slug' || f.key === 'url' ? 'ltr' : undefined}
                />
              )}
            </label>
          ))}
          <button className="primary" onClick={save} disabled={loading}>
            {loading ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
          {editing && (
            <button
              className="ghost"
              onClick={() => {
                setEditing(null)
                setForm({})
              }}
            >
              انصراف
            </button>
          )}
        </div>
      )}

      {single && (
        <div>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </label>
          ))}
          <button className="primary" onClick={save} disabled={loading}>
            {loading ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
          </button>
        </div>
      )}

      {!single && (
        <div>
          <h3 style={{ margin: '20px 0 12px' }}>موارد موجود</h3>
          {rows.length === 0 && <p className="mut">چیزی نیست</p>}
          {rows.map((row) => (
            <div className="row" key={row.id}>
              <span>
                <strong>{row.title || row.site_name || row.id}</strong>
                {row.published === false && (
                  <span className="mut"> (پیش‌نویس)</span>
                )}
              </span>
              <span>
                <button className="ghost" onClick={() => startEdit(row)}>
                  ویرایش
                </button>
                <button className="danger" onClick={() => remove(row.id)}>
                  حذف
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Media() {
  const [files, setFiles] = useState([])

  const load = async () => {
    const { data } = await sb.storage.from('media').list()
    setFiles(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const url = (name) =>
    sb.storage.from('media').getPublicUrl(name).data.publicUrl

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '')}`
    const { error } = await sb.storage.from('media').upload(safeName, file)
    if (error) alert(error.message)
    else load()
  }

  const remove = async (name) => {
    if (!confirm('حذف شود؟')) return
    await sb.storage.from('media').remove([name])
    load()
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={upload} />
      {files
        .filter((f) => f.name !== '.emptyFolderPlaceholder')
        .map((f) => (
          <div className="row" key={f.name}>
            <img src={url(f.name)} width={60} height={40} alt="" style={{ objectFit: 'cover', borderRadius: 6 }} />
            <input
              readOnly
              value={url(f.name)}
              onClick={(e) => e.target.select()}
              dir="ltr"
              style={{ flex: 1 }}
            />
            <button className="danger" onClick={() => remove(f.name)}>
              حذف
            </button>
          </div>
        ))}
    </div>
  )
}

function Invites() {
  const [rows, setRows] = useState([])

  const load = async () => {
    const { data } = await sb
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })
    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    const code = crypto.randomUUID().slice(0, 8)
    const { error } = await sb.from('invites').insert({ code })
    if (error) alert(error.message)
    else load()
  }

  return (
    <div>
      <button className="primary" onClick={create}>
        ساخت کد دعوت جدید
      </button>
      {rows.map((r) => (
        <div className="row" key={r.code}>
          <span dir="ltr" style={{ fontFamily: 'monospace' }}>
            {r.code}
          </span>
          <span className="mut">
            {r.used_by ? 'استفاده‌شده' : 'آزاد'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState('projects')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        const { data: a } = await sb
          .from('admins')
          .select('id')
          .eq('id', u.id)
          .maybeSingle()
        setIsAdmin(!!a)
      }
      setChecking(false)
    })
  }, [])

  const login = async () => {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      alert(error.message)
      return
    }
    setUser(data.user)
    const { data: a } = await sb
      .from('admins')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()
    setIsAdmin(!!a)
  }

  if (checking) {
    return (
      <div className="wrap">
        <p className="empty">در حال بررسی…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="wrap adm" style={{ maxWidth: 400 }}>
        <h2>ورود به پنل</h2>
        <label>
          ایمیل
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          رمز
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="primary" onClick={login}>
          ورود
        </button>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="wrap">
        <p className="empty">شما ادمین نیستید.</p>
        <p>
          <a href="/">بازگشت</a>
        </p>
      </div>
    )
  }

  const tabs = [
    ['projects', 'پروژه‌ها'],
    ['posts', 'نوشته‌ها'],
    ['settings', 'صفحهٔ اصلی'],
    ['media', 'تصاویر'],
    ['invites', 'دعوتنامه‌ها'],
  ]

  return (
    <div className="wrap adm">
      <nav>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : 'ghost'}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          className="ghost"
          onClick={() => sb.auth.signOut().then(() => setUser(null))}
        >
          خروج
        </button>
        <a href="/" style={{ marginRight: 12 }}>
          سایت
        </a>
      </nav>

      {tab === 'projects' && (
        <Crud key="projects" table="projects" fields={PROJECT_FIELDS} />
      )}
      {tab === 'posts' && (
        <Crud key="posts" table="posts" fields={POST_FIELDS} />
      )}
      {tab === 'settings' && (
        <Crud key="settings" table="settings" fields={SETTINGS_FIELDS} single />
      )}
      {tab === 'media' && <Media />}
      {tab === 'invites' && <Invites />}
    </div>
  )
}
