import './globals.css'

export const metadata = {
  title: 'Abollism',
  description: 'ویترین کارهای شخصی و تریبونی برای حرف‌های خودم',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
