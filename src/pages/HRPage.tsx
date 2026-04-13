import React, { useEffect, useState, useRef } from 'react'
import { analyticsApi, documentsApi, coursesApi } from '../api'
import type { AnalyticsData } from '../types'

interface Doc { id: number; filename: string; status: string; uploaded_at: string; chunk_count: number }
interface Course { id: number; title: string; description: string; status: string; module_count: number; generated_at: string }
interface User { id: number; full_name: string; email: string; role: string }

const statusCls = (s: string) => s === 'indexed' ? 'badge-green' : s === 'error' ? 'badge-red' : 'badge-amber'
const statusLbl = (s: string) => s === 'indexed' ? 'Проиндексирован' : s === 'error' ? 'Ошибка' : 'Обработка...'

export const HRPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [courses,   setCourses]   = useState<Course[]>([])
  const [users,     setUsers]     = useState<User[]>([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState<number | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<number | null>(null)
  const [assigning, setAssigning] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'analytics'|'documents'|'courses'>('analytics')
  const [assignModal, setAssignModal] = useState<Course | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' }

  const load = () => {
    analyticsApi.get().then(setAnalytics).catch(() => {})
    documentsApi.getAll().then(setDocuments).catch(() => {})
    // Загружаем курсы
    fetch(`${baseUrl}/courses`, { headers })
      .then(r => r.json()).then(setCourses).catch(() => {})
    // Загружаем пользователей
    fetch(`${baseUrl}/users`, { headers })
      .then(r => r.json()).then(data => {
        if (Array.isArray(data)) setUsers(data.filter((u: User) => u.role === 'employee' || u.role === 'user'))
      }).catch(() => {})
  }
  useEffect(load, [])

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(file)
      flash(`✅ Документ «${file.name}» загружен и проиндексирован`)
      documentsApi.getAll().then(setDocuments)
    } catch { flash('❌ Ошибка загрузки файла') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm('Удалить документ?')) return
    setDeletingDoc(docId)
    try {
      await fetch(`${baseUrl}/documents/${docId}`, { method: 'DELETE', headers })
      setDocuments(prev => prev.filter(d => d.id !== docId))
      flash('✅ Документ удалён')
    } catch { flash('❌ Ошибка удаления') }
    finally { setDeletingDoc(null) }
  }

  const handleGenerate = async (docId: number, name: string) => {
    setGenerating(docId)
    try {
      const title = `Курс: ${name.replace(/\.(pdf|docx|txt)$/i, '')}`
      const res = await coursesApi.generate(docId, title) as any
      flash(`✅ Курс «${res.title}» создан — ${res.module_count} модулей`)
      // Обновляем список курсов
      fetch(`${baseUrl}/courses`, { headers }).then(r => r.json()).then(setCourses).catch(() => {})
    } catch { flash('❌ Ошибка генерации курса') }
    finally { setGenerating(null) }
  }

  const handleAssign = async (courseId: number, userId: number) => {
    setAssigning(userId)
    try {
      const res = await fetch(`${baseUrl}/enrollments/${courseId}/${userId}`, { method: 'POST', headers })
      if (res.ok || res.status === 422) {
        flash('✅ Курс назначен сотруднику')
      } else {
        // Попробуем другой эндпоинт
        const res2 = await fetch(`${baseUrl}/enrollments/${courseId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: userId })
        })
        if (res2.ok) flash('✅ Курс назначен сотруднику')
        else flash('❌ Ошибка назначения')
      }
    } catch { flash('❌ Ошибка назначения') }
    finally { setAssigning(null); setAssignModal(null) }
  }

  const metrics = analytics ? [
    { label:'Обучается',       val: analytics.total_enrolled,    icon:'👥', color:'var(--indigo)' },
    { label:'Средний балл',    val: `${analytics.avg_score}%`,   icon:'⭐', color:'var(--amber)'  },
    { label:'Курсов создано',  val: analytics.courses_generated, icon:'📚', color:'var(--green)'  },
    { label:'Незавершено',     val: analytics.incomplete_count,  icon:'⏳', color:'var(--red)'    },
  ] : []

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">HR-панель</h1>
          <p className="page-sub">Управление обучением и аналитика</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <span className="spinner" style={{width:14,height:14}}/> : '📄'}
            {uploading ? 'Загрузка...' : 'Загрузить документ'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display:'none' }} />
        </div>
      </div>

      {/* Flash message */}
      {successMsg && (
        <div style={{
          padding:'10px 16px', borderRadius:'var(--radius-sm)', marginBottom:16,
          background: successMsg.startsWith('✅') ? 'var(--green-dim)' : 'var(--red-dim)',
          color: successMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${successMsg.startsWith('✅') ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
          fontSize:13,
        }}>{successMsg}</div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg)', padding:4, borderRadius:'var(--radius-sm)', width:'fit-content', border:'1px solid var(--border)' }}>
        {(['analytics','documents','courses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'6px 16px', borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:500, transition:'all .13s',
            background: tab===t ? 'var(--surface)' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? 'var(--shadow)' : 'none',
          }}>
            {t==='analytics' ? '📊 Аналитика' : t==='documents' ? '📁 Документы' : '📚 Курсы'}
          </button>
        ))}
      </div>

      {/* ── Analytics ─────────────────────────── */}
      {tab === 'analytics' && (
        <>
          <div className="grid-4" style={{ marginBottom:20 }}>
            {metrics.map(m => (
              <div key={m.label} className="metric-card">
                <div style={{ fontSize:24, marginBottom:8 }}>{m.icon}</div>
                <div className="metric-val" style={{ color:m.color }}>{m.val}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>
          {analytics && (
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:16 }}>Слабые темы (средний балл ниже 80%)</div>
              {analytics.weak_topics.map((t: any) => (
                <div key={t.topic} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ flex:1, fontSize:13 }}>{t.topic}</div>
                  <div style={{ width:180, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:3,
                      width:`${t.score}%`,
                      background: t.score < 65 ? 'var(--red)' : t.score < 75 ? 'var(--amber)' : 'var(--green)',
                    }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, width:36, textAlign:'right',
                    color: t.score<65 ? 'var(--red)' : t.score<75 ? 'var(--amber)' : 'var(--green)' }}>
                    {t.score}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Documents ─────────────────────────── */}
      {tab === 'documents' && (
        <>
          {documents.length === 0 ? (
            <div onClick={() => fileRef.current?.click()} style={{
              border:'2px dashed var(--border)', borderRadius:'var(--radius)', padding:'48px 24px',
              textAlign:'center', cursor:'pointer', transition:'border-color .15s',
            }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📁</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>Загрузите первый документ</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>PDF, DOCX или TXT — AI сгенерирует курс автоматически</div>
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
                    {['Файл','Статус','Фрагментов','Загружен','Действие'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d: Doc) => (
                    <tr key={d.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px', fontWeight:500, fontSize:13 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span>{d.filename.endsWith('.pdf') ? '📄' : d.filename.endsWith('.docx') ? '📝' : '📃'}</span>
                          {d.filename}
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span className={`badge ${statusCls(d.status)}`}>{statusLbl(d.status)}</span>
                      </td>
                      <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:13 }}>{d.chunk_count}</td>
                      <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:12 }}>
                        {new Date(d.uploaded_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:8 }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize:12, padding:'6px 12px' }}
                            onClick={() => handleGenerate(d.id, d.filename)}
                            disabled={generating === d.id || d.status !== 'indexed'}
                          >
                            {generating === d.id
                              ? <><span className="spinner" style={{width:12,height:12}}/> Генерация...</>
                              : '✨ Создать курс'}
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize:12, padding:'6px 12px', color:'var(--red)', borderColor:'var(--red)' }}
                            onClick={() => handleDeleteDoc(d.id)}
                            disabled={deletingDoc === d.id}
                          >
                            {deletingDoc === d.id ? '...' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Courses ───────────────────────────── */}
      {tab === 'courses' && (
        <>
          {courses.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📚</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>Курсов пока нет</div>
              <div style={{ fontSize:13 }}>Загрузите документ и создайте первый курс</div>
            </div>
          ) : (
            <div className="grid-2">
              {courses.map((c: Course) => (
                <div key={c.id} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{c.title}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {c.module_count} модулей · {new Date(c.generated_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ alignSelf:'flex-start', fontSize:12, padding:'6px 14px' }}
                    onClick={() => setAssignModal(c)}
                  >
                    👤 Назначить сотруднику
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Assign Modal ──────────────────────── */}
      {assignModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200,
        }} onClick={() => setAssignModal(null)}>
          <div style={{
            background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28,
            width:440, maxHeight:'80vh', overflow:'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:600, fontSize:16, marginBottom:4 }}>Назначить курс</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
              «{assignModal.title}»
            </div>

            {users.length === 0 ? (
              <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>
                Нет доступных сотрудников.<br/>
                Попробуйте назначить через консоль браузера.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {users.map(u => (
                  <div key={u.id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{u.full_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize:12, padding:'5px 12px' }}
                      onClick={() => handleAssign(assignModal.id, u.id)}
                      disabled={assigning === u.id}
                    >
                      {assigning === u.id ? '...' : 'Назначить'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-outline"
              style={{ marginTop:16, width:'100%' }}
              onClick={() => setAssignModal(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
