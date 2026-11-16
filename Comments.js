'use client'

import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'

export default function Comments({ postId }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const [{ data: c }, { data: r1 }, { data: r2 }] = await Promise.all([
      sb
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at'),
      sb
        .from('reactions')
        .select('*')
        .eq('kind', 'post')
        .eq('target', postId),
      sb
        .from('reactions')
        .select('*')
        .eq('kind', 'comment')
        .in(
          'target',
          (
            await sb.from('comments').select('id').eq('post_id', postId)
          ).data?.map((x) => x.id) || []
        ),
    ])

    setComments(c || [])
    setReactions([...(r1 || []), ...(r2 || [])])
  }

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
    })
    load()
  }, [postId])

  const send = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    const { error } = await sb.from('comments').insert({
      post_id: postId,
      body: text.trim(),
    })
    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    setText('')
    load()
  }

  const del = async (id) => {
    if (!confirm('حذف شود؟')) return
    await sb.from('comments').delete().eq('id', id)
    load()
  }

  const vote = async (kind, target, value) => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    const existing = reactions.find(
      (r) => r.kind === kind && r.target === target && r.user_id === user.id
    )

    if (existing && existing.value === value) {
      await sb
        .from('reactions')
        .delete()
        .match({ user_id: user.id, kind, target })
    } else {
      await sb.from('reactions').upsert({
        user_id: user.id,
        kind,
        target,
        value,
      })
    }
    load()
  }

  const share = async (hash) => {
    const url = location.origin + location.pathname + (hash || '')
    if (navigator.share) {
      try {
        await navigator.share({ url })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(url)
    alert('لینک کپی شد')
  }

  const bar = (kind, target, hash) => {
    const list = reactions.filter((r) => r.kind === kind && r.target === target)
    const mine = user && list.find((r) => r.user_id === user.id)?.value

    return (
      <span className="bar">
        <button
          style={{ opacity: mine === 1 ? 1 : 0.55 }}
          onClick={() => vote(kind, target, 1)}
        >
          👍 {list.filter((r) => r.value === 1).length}
        </button>
        <button
          style={{ opacity: mine === -1 ? 1 : 0.55 }}
          onClick={() => vote(kind, target, -1)}
        >
          👎 {list.filter((r) => r.value === -1).length}
        </button>
        <button onClick={() => share(hash)}>اشتراک</button>
      </span>
    )
  }

  return (
    <div className="cm" style={{ marginTop: 48 }}>
      <h2>واکنش و نظرها</h2>
      {bar('post', postId, '')}

      {comments.map((c) => (
        <div
          className="card"
          id={`c-${c.id}`}
          key={c.id}
          style={{ marginTop: 14 }}
        >
          <b>@{c.username}</b>{' '}
          <span className="mut">
            {new Date(c.created_at).toLocaleDateString('fa-IR')}
          </span>
          <p className="body" style={{ margin: '8px 0' }}>
            {c.body}
          </p>
          {bar('comment', c.id, `#c-${c.id}`)}
          {(isAdmin || (user && user.id === c.user_id)) && (
            <button className="ghost" onClick={() => del(c.id)}>
              حذف
            </button>
          )}
        </div>
      ))}

      {user ? (
        <div style={{ marginTop: 20 }}>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="نظرت را بنویس…"
            maxLength={2000}
          />
          <button className="primary" onClick={send} disabled={loading}>
            {loading ? 'در حال ارسال…' : 'ارسال نظر'}
          </button>
        </div>
      ) : (
        <p style={{ marginTop: 20 }}>
          <a href="/login">برای نظر دادن وارد شو</a>
        </p>
      )}
    </div>
  )
}
