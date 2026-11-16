'use client'

import { useEffect, useRef, useState } from 'react'
import { sb } from '../../lib/supabase'

export default function ChatPage() {
  const [user, setUser] = useState(null)
  const [rooms, setRooms] = useState([])
  const [current, setCurrent] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [newRoom, setNewRoom] = useState({ type: 'group', name: '', users: '' })
  const [addUser, setAddUser] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const loadRooms = async (uid) => {
    const { data } = await sb
      .from('room_members')
      .select('role, rooms(id, type, name)')
      .eq('user_id', uid)

    const list = (data || []).map((x) => ({ ...x.rooms, role: x.role }))

    const dmIds = list.filter((r) => r.type === 'dm').map((r) => r.id)
    if (dmIds.length) {
      const { data: members } = await sb
        .from('room_members')
        .select('room_id, user_id')
        .in('room_id', dmIds)
        .neq('user_id', uid)

      const otherIds = (members || []).map((m) => m.user_id)
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, username')
        .in('id', otherIds)

      list.forEach((r) => {
        if (r.type === 'dm') {
          const other = (members || []).find((m) => m.room_id === r.id)
          const profile = (profiles || []).find((p) => p.id === other?.user_id)
          r.name = profile ? `@${profile.username}` : 'پیام مستقیم'
        }
      })
    }

    setRooms(list)
  }

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) loadRooms(u.id)
    })
  }, [])

  useEffect(() => {
    if (!current) return

    sb.from('messages')
      .select('*')
      .eq('room_id', current.id)
      .order('id')
      .limit(200)
      .then(({ data }) => setMessages(data || []))

    const channel = sb
      .channel(`room-${current.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${current.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [current?.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !current || sending) return
    setSending(true)
    const { error } = await sb.from('messages').insert({
      room_id: current.id,
      body: text.trim(),
    })
    setSending(false)
    if (error) {
      alert(error.message)
      return
    }
    setText('')
  }

  const createRoom = async () => {
    const names = newRoom.users
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const { error } = await sb.rpc('create_room', {
      t: newRoom.type,
      n: newRoom.name || null,
      names,
    })

    if (error) {
      alert('ناموفق: نام کاربری‌ها را بررسی کن')
      return
    }

    setNewRoom({ type: 'group', name: '', users: '' })
    loadRooms(user.id)
  }

  const addMember = async () => {
    if (!addUser.trim() || !current) return
    const { error } = await sb.rpc('add_member', {
      r: current.id,
      nm: addUser.trim(),
    })
    if (error) {
      alert('ناموفق')
      return
    }
    setAddUser('')
  }

  if (!user) {
    return (
      <div className="wrap">
        <p className="nav-links">
          <a href="/">← خانه</a>
        </p>
        <p className="empty">
          <a href="/login">برای استفاده از چت وارد شو</a>
        </p>
      </div>
    )
  }

  const canPost =
    current && (current.type !== 'channel' || current.role === 'admin')

  const typeLabel = { dm: 'پیام مستقیم', group: 'گروه', channel: 'کانال' }

  return (
    <div className="wrap adm">
      <p className="nav-links">
        <a href="/">← خانه</a>
      </p>

      <div className="chat">
        {/* Sidebar */}
        <div className="side">
          <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>گفتگوها</h3>

          {rooms.length === 0 && (
            <p className="mut" style={{ fontSize: '0.85rem' }}>
              هنوز گفتگویی نداری
            </p>
          )}

          {rooms.map((r) => (
            <div className="row" key={r.id} style={{ border: 0, padding: '4px 0' }}>
              <button
                className={current?.id === r.id ? 'active' : ''}
                onClick={() => setCurrent(r)}
              >
                {r.name || typeLabel[r.type] || '—'}
              </button>
            </div>
          ))}

          <div style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>ساخت گفتگو</h3>
            <select
              value={newRoom.type}
              onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
            >
              <option value="dm">پیام مستقیم</option>
              <option value="group">گروه</option>
              <option value="channel">کانال</option>
            </select>

            {newRoom.type !== 'dm' && (
              <input
                placeholder="نام گروه / کانال"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              />
            )}

            <input
              placeholder={
                newRoom.type === 'dm'
                  ? 'نام کاربری طرف مقابل'
                  : 'نام کاربری اعضا (با کاما جدا کن)'
              }
              value={newRoom.users}
              onChange={(e) => setNewRoom({ ...newRoom, users: e.target.value })}
              dir="ltr"
            />

            <button className="primary" onClick={createRoom}>
              ساخت
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-main">
          {current ? (
            <>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>
                  {current.name || typeLabel[current.type]}
                  <span className="mut" style={{ marginRight: 8, fontWeight: 400 }}>
                    ({typeLabel[current.type]})
                  </span>
                </strong>
              </div>

              <div className="msgs">
                {messages.length === 0 && (
                  <p className="empty">هنوز پیامی نیست</p>
                )}
                {messages.map((m) => (
                  <div className="msg" key={m.id}>
                    <div className="meta">
                      <b>@{m.username}</b> ·{' '}
                      {new Date(m.created_at).toLocaleString('fa-IR')}
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {canPost ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="پیام…"
                    maxLength={4000}
                    disabled={sending}
                  />
                  <button className="primary" onClick={send} disabled={sending}>
                    ارسال
                  </button>
                </div>
              ) : (
                <p className="mut">فقط ادمین کانال می‌تواند پیام بفرستد</p>
              )}

              {current.type !== 'dm' && current.role === 'admin' && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <input
                    placeholder="افزودن عضو (نام کاربری)"
                    value={addUser}
                    onChange={(e) => setAddUser(e.target.value)}
                    dir="ltr"
                  />
                  <button className="ghost" onClick={addMember}>
                    افزودن
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="empty">یک گفتگو انتخاب کن یا بساز</p>
          )}
        </div>
      </div>
    </div>
  )
}
