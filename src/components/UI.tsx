// src/components/UI.tsx
import React from 'react'

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, children, disabled, style, ...props
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, fontFamily: 'var(--font-body)', fontWeight: 500, borderRadius: 'var(--radius-md)',
    transition: 'all .15s', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    padding: size === 'sm' ? '5px 12px' : size === 'lg' ? '11px 22px' : '8px 16px',
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 15 : 13,
    opacity: disabled || loading ? 0.6 : 1,
    ...(variant === 'primary' ? {
      background: 'var(--c-green)', color: '#fff', border: 'none',
    } : variant === 'secondary' ? {
      background: 'var(--c-surface)', color: 'var(--c-text)',
      border: '1px solid var(--c-border)',
    } : variant === 'ghost' ? {
      background: 'transparent', color: 'var(--c-text-2)',
      border: '1px solid transparent',
    } : {
      background: 'var(--c-red-light)', color: 'var(--c-red)',
      border: '1px solid #f5c6c6',
    }),
    ...style,
  }
  return (
    <button style={base} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps { label: string; color?: 'green' | 'blue' | 'amber' | 'red' | 'gray' }

export const Badge: React.FC<BadgeProps> = ({ label, color = 'gray' }) => {
  const colors = {
    green:  { bg: 'var(--c-green-light)',  text: 'var(--c-green)' },
    blue:   { bg: 'var(--c-blue-light)',   text: 'var(--c-blue)' },
    amber:  { bg: 'var(--c-amber-light)',  text: 'var(--c-amber)' },
    red:    { bg: 'var(--c-red-light)',    text: 'var(--c-red)' },
    gray:   { bg: 'var(--c-surface-2)',    text: 'var(--c-text-2)' },
  }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 500,
      background: colors[color].bg, color: colors[color].text,
    }}>
      {label}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    border: `2px solid currentColor`, borderTopColor: 'transparent',
    borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0,
  }} />
)

// ── ProgressBar ───────────────────────────────────────────────
export const ProgressBar: React.FC<{ value: number; color?: string }> = ({
  value, color = 'var(--c-green-mid)'
}) => (
  <div style={{ height: 5, background: 'var(--c-border)', borderRadius: 3, overflow: 'hidden' }}>
    <div style={{
      height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
      background: color, borderRadius: 3, transition: 'width .4s ease',
    }} />
  </div>
)

// ── Card ──────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: number | string
}
export const Card: React.FC<CardProps> = ({ children, style, padding = '16px 18px', ...props }) => (
  <div style={{
    background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--c-border)', padding,
    boxShadow: 'var(--shadow-sm)', ...style,
  }} {...props}>
    {children}
  </div>
)

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}
export const Input: React.FC<InputProps> = ({ label, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text-2)' }}>{label}</label>}
    <input style={{
      padding: '9px 12px', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--c-border)', background: 'var(--c-surface)',
      color: 'var(--c-text)', fontSize: 13,
      transition: 'border-color .15s',
      ...style,
    }}
    onFocus={e => (e.target.style.borderColor = 'var(--c-green-mid)')}
    onBlur={e => (e.target.style.borderColor = 'var(--c-border)')}
    {...props}
    />
  </div>
)

// ── MetricCard ────────────────────────────────────────────────
export const MetricCard: React.FC<{
  label: string; value: string | number; accent?: string
}> = ({ label, value, accent }) => (
  <div style={{
    background: 'var(--c-surface-2)', borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
  }}>
    <div style={{
      fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)',
      color: accent ?? 'var(--c-text)', lineHeight: 1.1,
    }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 3 }}>{label}</div>
  </div>
)
