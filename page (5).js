import { sb } from '../lib/supabase'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [{ data: settings }, { data: projects }, { data: posts }] = await Promise.all([
    sb.from('settings').select('*').eq('id', 1).single(),
    sb.from('projects').select('*').eq('published', true).order('sort_order'),
    sb
      .from('posts')
      .select('title, slug, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="wrap">
      <header>
        <div className="nav-links">
          <a href="/chat">چت</a>
          <a href="/blog">تریبون</a>
          <a href="/login">ورود</a>
        </div>
        <h1>{settings?.site_name || 'Abollism'}</h1>
        <p className="mut">{settings?.tagline}</p>
        {settings?.hero_image_url && (
          <img className="hero" src={settings.hero_image_url} alt="" />
        )}
      </header>

      <h2>تریبون</h2>
      {posts?.length ? (
        <>
          <div className="grid">
            {posts.map((p) => (
              <a key={p.slug} className="card" href={`/blog/${p.slug}`}>
                <h3>{p.title}</h3>
                <span className="mut">
                  {new Date(p.created_at).toLocaleDateString('fa-IR')}
                </span>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>
            <a href="/blog">همهٔ نوشته‌ها ←</a>
          </p>
        </>
      ) : (
        <p className="mut">هنوز نوشته‌ای منتشر نشده.</p>
      )}

      <h2>کارها</h2>
      {projects?.length ? (
        <div className="grid">
          {projects.map((p) => (
            <div key={p.id} className="card">
              {p.image_url && <img src={p.image_url} alt="" />}
              <h3>{p.title}</h3>
              <p className="mut">{p.description}</p>
              {p.tags && (
                <div className="tags">
                  {p.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                </div>
              )}
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  مشاهده پروژه
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mut">هنوز پروژه‌ای اضافه نشده.</p>
      )}

      <footer>
        {settings?.contact && <span>{settings.contact} · </span>}
        © {settings?.site_name || 'Abollism'}
      </footer>
    </div>
  )
}
