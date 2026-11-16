import Comments from '../../../components/Comments'
import { sb } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }) {
  const slug = decodeURIComponent(params.slug)

  const { data: post } = await sb
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!post) {
    return (
      <div className="wrap">
        <p>نوشته پیدا نشد.</p>
        <p>
          <a href="/blog">بازگشت به نوشته‌ها</a>
        </p>
      </div>
    )
  }

  return (
    <div className="wrap">
      <p className="nav-links">
        <a href="/blog">← نوشته‌ها</a>
      </p>

      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)' }}>{post.title}</h1>
      <p className="mut">
        {new Date(post.created_at).toLocaleDateString('fa-IR')}
      </p>

      {post.cover_url && <img className="hero" src={post.cover_url} alt="" />}

      <div className="body" style={{ marginTop: 28 }}>
        {post.body}
      </div>

      <Comments postId={post.id} />
    </div>
  )
}
