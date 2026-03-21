import React, { useEffect, useState, useRef } from 'react'
import { analyticsApi, documentsApi, coursesApi } from '../api'
import type { AnalyticsData } from '../types'

interface Doc { id: number; filename: string; status: string; uploaded_at: string; chunk_count: number }

const statusCls = (s: string) => s === 'indexed' ? 'badge-green' : s === 'error' ? 'badge-red' : 'badge-amber'
const statusLbl = (s: string) => s === 'indexed' ? 'Проиндексирован' : s === 'error' ? 'Ошибка' : 'Обработка...'

export const HRPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'analytics'|'documents'>('analytics')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    analyticsApi.get().then(setAnalytics).catch(() => {})
    documentsApi.getAll().then(setDocuments).catch(() => {})
  }
  useEffect(load, [])

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(file)
      flash(`✓ Документ «${file.name}» загружен и проиндексирован`)
      documentsApi.getAll().then(setDocuments)
    } catch { flash('✗ Ошибка загрузки файла') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleGenerate = async (docId: number, name: string) => {
    setGenerating(docId)
    try {
      const title = `Курс: ${name.replace(/\.(pdf|docx|txt)$/i, '')}`
      const res = await coursesApi.generate(docId, title) as any
      flash(`✓ Курс «${res.title}» создан — ${res.module_count} модулей`)
    } catch { flash('✗ Ошибка генерации курса') }
    finally { setGenerating(null) }
  }

  const metrics = analytics ? [
    { label:'Обучается',      val: analytics.total_enrolled,   icon:'👥', color:'var(--indigo)', bg:'var(--indigo-light)' },
    { label:'Средний балл',   val: `${analytics.avg_score}%`,  icon:'⭐', color:'var(--amber)',  bg:'var(--amber-light)'  },
    { label:'Курсов создано', val: analytics.courses_generated,icon:'📚', color:'var(--green)',  bg:'var(--green-light)'  },
    { label:'Незавершено',    val: analytics.incomplete_count,  icon:'⏳', color:'var(--red)',    bg:'var(--red-light)'    },
  ] : []

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">HR-панель</h1>
          <p className="page-sub">Управление обучением и аналитика</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <span className="spinner" style={{width:14,height:14}}/> : '📤'}
            {uploading ? 'Загрузка...' : 'Загрузить документ'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display:'none' }} />
        </div>
      </div>

      {successMsg && <div className={`${successMsg.startsWith('✓') ? 'success-box' : 'error-box'}`} style={{ marginBottom:16 }}>{successMsg}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--surface-2)', padding:4, borderRadius:'var(--r-md)', width:'fit-content', border:'1px solid var(--border)' }}>
        {(['analytics','documents'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding:'6px 16px', borderRadius:'var(--r-sm)', border:'none', cursor:'pointer',
              fontSize:13, fontWeight:500, transition:'all .13s',
              background: tab===t ? 'var(--surface)' : 'transparent',
              color: tab===t ? 'var(--text)' : 'var(--text-2)',
              boxShadow: tab===t ? 'var(--shadow-sm)' : 'none',
            }}
          >{t==='analytics' ? '📊 Аналитика' : '📁 Документы'}</button>
        ))}
      </div>

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <>
          {/* Metrics */}
          <div className="metrics-grid" style={{ marginBottom:20 }}>
            {metrics.map(m => (
              <div key={m.label} className="metric-card">
                <div className="metric-icon" style={{ background:m.bg }}>{m.icon}</div>
                <div className="metric-val" style={{ color:m.color }}>{m.val}</div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Weak topics */}
          {analytics && (
            <div className="card">
              <div className="section-header">
                <div className="section-title">Слабые темы (средний балл ниже 80%)</div>
              </div>
              {analytics.weak_topics.map((t: any) => (
                <div key={t.topic} className="weak-bar-row">
                  <div className="weak-bar-label">{t.topic}</div>
                  <div className="weak-bar-track">
                    <div className="weak-bar-fill" style={{
                      width:`${t.score}%`,
                      background: t.score < 65 ? 'var(--red-light)' === 'var(--red-light)' ? '#EF4444' : 'var(--red)' : t.score < 75 ? '#F59E0B' : 'var(--green)',
                    }}/>
                  </div>
                  <div className="weak-bar-score" style={{ color: t.score<65 ? 'var(--red)' : t.score<75 ? 'var(--amber)' : 'var(--green)' }}>
                    {t.score}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <>
          {documents.length === 0 ? (
            <div
              className="upload-zone"
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize:36, marginBottom:10 }}>📂</div>
              <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>Загрузите первый документ</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>PDF, DOCX или TXT — AI сгенерирует курс автоматически</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Файл</th>
                    <th>Статус</th>
                    <th>Фрагментов</th>
                    <th>Загружен</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d: Doc) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight:500 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span>{d.filename.endsWith('.pdf') ? '📄' : d.filename.endsWith('.docx') ? '📝' : '📃'}</span>
                          {d.filename}
                        </div>
                      </td>
                      <td><span className={`badge ${statusCls(d.status)}`}>{statusLbl(d.status)}</span></td>
                      <td style={{ color:'var(--text-2)' }}>{d.chunk_count}</td>
                      <td style={{ color:'var(--text-3)', fontSize:12 }}>
                        {new Date(d.uploaded_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleGenerate(d.id, d.filename)}
                          disabled={generating === d.id || d.status !== 'indexed'}
                        >
                          {generating === d.id
                            ? <><span className="spinner" style={{width:12,height:12}}/> Генерация...</>
                            : '✨ Создать курс'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
