import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

interface NavItem { label: string; to: string; emoji: string }

const employeeNav: NavItem[] = [
  { label: 'Мои курсы',    to: '/courses',   emoji: '📚' },
  { label: 'AI-ассистент', to: '/assistant', emoji: '🤖' },
]
const hrNav: NavItem[] = [
  { label: 'HR-панель',    to: '/hr',        emoji: '📊' },
  { label: 'Мои курсы',    to: '/courses',   emoji: '📚' },
  { label: 'AI-ассистент', to: '/assistant', emoji: '🤖' },
]

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate  = useNavigate()
  const role      = localStorage.getItem('role') ?? 'employee'
  const name      = localStorage.getItem('user_name') ?? localStorage.getItem('name') ?? 'Пользователь'
  const navItems  = (role === 'hr' || role === 'admin') ? hrNav : employeeNav
  const initials  = name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0,2).toUpperCase()
  const roleLabel = role === 'hr' ? 'HR-менеджер' : role === 'admin' ? 'Администратор' : 'Сотрудник'

  const handleLogout = () => { localStorage.clear(); navigate('/login') }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">L</div>
          <div>
            <div className="sidebar-logo-text">Learn<span style={{color:'var(--indigo)'}}>AI</span></div>
            <div className="sidebar-logo-sub">Корп. обучение</div>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          <div className="sidebar-section-label">Меню</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* User */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-indigo">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{roleLabel}</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost btn-sm"
              title="Выйти"
              style={{ padding: '4px 6px', fontSize: 16 }}
            >⎋</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">{children}</main>
    </div>
  )
}
