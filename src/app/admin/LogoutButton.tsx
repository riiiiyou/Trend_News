'use client'

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-red-500 transition-colors"
    >
      로그아웃
    </button>
  )
}
