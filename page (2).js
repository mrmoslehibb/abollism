import { sb } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default async function BlogList() {
  const { data: posts } = await sb
    .from('posts')
    .select('title, slug, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="wrap">
      <p className="nav-links">
        <a href="/">← خانه</a>
      </p>
      <h2>تریبون</h2>

      {posts?.length ? (
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
      ) : (
        <p className="empty">هنوز نوشته‌ای منتشر نشده.</p>
      )}
    </div>
  )
}
