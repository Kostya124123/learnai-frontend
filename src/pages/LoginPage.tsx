import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api'

export const LoginPage: React.FC = () => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.login(email, password)
      navigate('/courses')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, background: 'var(--indigo)',
            borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 14px',
            boxShadow: '0 4px 14px rgba(79,70,229,.3)',
          }}>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>L</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
            Learn<span style={{ color: 'var(--indigo)' }}>AI</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Корпоративная платформа обучения</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input" type="email" autoFocus
              placeholder="user@company.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              className="form-input" type="password"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button
            className="btn btn-primary btn-lg"
            type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading
              ? <span className="spinner" style={{ width:16, height:16 }} />
              : 'Войти в систему'}
          </button>
        </form>

        {/* Hint */}
        <div style={{
          marginTop: 20, padding: 14,
          background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6, fontWeight: 600 }}>Тестовые аккаунты:</div>
          {[
            ['user@company.com',  'user123',  'Сотрудник'],
            ['hr@company.com',    'hr123',    'HR'],
            ['admin@company.com', 'admin123', 'Администратор'],
          ].map(([em, pw, role]) => (
            <div key={em}
              onClick={() => { setEmail(em); setPassword(pw) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--indigo-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 10, background: 'var(--indigo-light)', color: 'var(--indigo)', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>{role}</span>
              <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>{em}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{pw}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
