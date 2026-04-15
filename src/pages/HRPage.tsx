import React, { useEffect, useState, useRef } from 'react'
import { analyticsApi, documentsApi, coursesApi } from '../api'
import type { AnalyticsData } from '../types'

interface Doc { id: number; filename: string; status: string; uploaded_at: string; chunk_count: number }
interface Course { id: number; title: string; description: string; status: string; module_count: number; generated_at: string }
interface User { id: number; full_name: string; email: string; role: string }
interface EmployeeCard {
  user: { id: number; full_name: string; email: string }
  overall_score: number | null
  courses: {
    course_id: number; course_title: string; status: string
    progress_pct: number; test_score: number | null; final_score: number | null
    test_results: { question: string; user_answer: string; correct_answer: string; is_correct: boolean }[]
    case_results: { module_title: string; answer: string; score: number | null }[]
  }[]
}
interface CaseAnswer { id: number; user_name: string; module_title: string; answer: string; score: number | null; created_at: string }

// Универсальный модал подтверждения
interface ConfirmModal { title: string; message: string; onConfirm: () => void }

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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeCard | null>(null)
  const [loadingEmployee, setLoadingEmployee] = useState(false)
  const [caseAnswers, setCaseAnswers] = useState<CaseAnswer[]>([])
  const [scoringId, setScoringId] = useState<number | null>(null)
  const [scoreInput, setScoreInput] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'analytics'|'documents'|'courses'|'cases'|'employees'>('analytics')
  const [assignDrawer, setAssignDrawer] = useState<Course | null>(null)
  const [enrolledMap, setEnrolledMap] = useState<Record<number, number[]>>({})
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [resetModal, setResetModal] = useState<{userId: number; courseId: number; courseTitle: string} | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
  const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' }

  const load = () => {
    analyticsApi.get().then(setAnalytics).catch(() => {})
    documentsApi.getAll().then(setDocuments).catch(() => {})
    fetch(`${baseUrl}/courses`, { headers }).then(r => r.json()).then(setCourses).catch(() => {})
    fetch(`${baseUrl}/enrollments/all`, { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const map: Record<number, number[]> = {}
        data.forEach((e: any) => { if (!map[e.course_id]) map[e.course_id] = []; map[e.course_id].push(e.user_id) })
        setEnrolledMap(map)
      }
    }).catch(() => {})
    fetch(`${baseUrl}/case-answers`, { headers }).then(r => r.json()).then(data => { if (Array.isArray(data)) setCaseAnswers(data) }).catch(() => {})
    fetch(`${baseUrl}/users`, { headers }).then(r => r.json()).then(data => { if (Array.isArray(data)) setUsers(data) }).catch(() => {})
  }
  useEffect(load, [])

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }
  const confirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ title, message, onConfirm })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { await documentsApi.upload(file); flash(`✅ Документ «${file.name}» загружен`); documentsApi.getAll().then(setDocuments) }
    catch { flash('❌ Ошибка загрузки') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDeleteDoc = (docId: number) => {
    confirm('Удалить документ?', 'Документ и все связанные курсы будут удалены безвозвратно.', async () => {
      setDeletingDoc(docId)
      try { await fetch(`${baseUrl}/documents/${docId}`, { method: 'DELETE', headers }); setDocuments(prev => prev.filter(d => d.id !== docId)); flash('✅ Документ удалён') }
      catch { flash('❌ Ошибка удаления') }
      finally { setDeletingDoc(null) }
    })
  }

  const handleDeleteCourse = (courseId: number, courseTitle: string) => {
    confirm('Удалить курс?', `Курс «${courseTitle}» и все записи на него будут удалены.`, async () => {
      try { await fetch(`${baseUrl}/courses/${courseId}`, { method: 'DELETE', headers }); setCourses(prev => prev.filter(c => c.id !== courseId)); flash('✅ Курс удалён') }
      catch { flash('❌ Ошибка удаления') }
    })
  }

  const handleGenerate = async (docId: number, name: string) => {
    setGenerating(docId)
    try {
      const cleanName = name.replace(/\.(pdf|docx|txt)$/i, '').replace(/^курс:\s*/i, '')
      const res = await coursesApi.generate(docId, `Курс: ${cleanName}`) as any
      flash(`✅ Курс «${res.title}» создан`)
      fetch(`${baseUrl}/courses`, { headers }).then(r => r.json()).then(setCourses).catch(() => {})
    } catch { flash('❌ Ошибка генерации') }
    finally { setGenerating(null) }
  }

  const handleScoreCaseAnswer = async (answerId: number) => {
    const score = parseFloat(scoreInput)
    if (isNaN(score) || score < 0 || score > 100) { flash('❌ Оценка от 0 до 100'); return }
    try {
      await fetch(`${baseUrl}/case-answers/${answerId}/score`, { method: 'PATCH', headers, body: JSON.stringify({ score }) })
      setCaseAnswers(prev => prev.map(a => a.id === answerId ? {...a, score} : a))
      setScoringId(null); setScoreInput(''); flash('✅ Оценка выставлена')
    } catch { flash('❌ Ошибка') }
  }

  const handleAssign = async (courseId: number, userId: number) => {
    setAssigning(userId)
    try {
      const res = await fetch(`${baseUrl}/enrollments/${courseId}/${userId}`, { method: 'POST', headers })
      if (res.ok || res.status === 422) {
        setEnrolledMap(prev => ({ ...prev, [courseId]: [...(prev[courseId] || []), userId] }))
        flash('✅ Курс назначен')
      }
    } catch { flash('❌ Ошибка назначения') }
    finally { setAssigning(null) }
  }

  const loadEmployee = async (userId: number) => {
    setLoadingEmployee(true)
    try { const res = await fetch(`${baseUrl}/analytics/employee/${userId}`, { headers }); setSelectedEmployee(await res.json()) }
    catch { flash('❌ Ошибка загрузки') }
    finally { setLoadingEmployee(false) }
  }

  const doReset = async (userId: number, courseId: number, what: 'test' | 'case' | 'all') => {
    try {
      await fetch(`${baseUrl}/tests/reset/${userId}/${courseId}?what=${what}`, { method: 'DELETE', headers })
      flash('✅ Попытки сброшены')
      loadEmployee(userId)
    } catch { flash('❌ Ошибка сброса') }
    setResetModal(null)
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
        <div><h1 className="page-title">HR-панель</h1><p className="page-sub">Управление обучением и аналитика</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {tab === 'documents' && (
            <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <span className="spinner" style={{width:14,height:14}}/> : '📄'}
              {uploading ? 'Загрузка...' : 'Загрузить документ'}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display:'none' }} />
        </div>
      </div>

      {successMsg && (
        <div style={{ padding:'10px 16px', borderRadius:'var(--radius-sm)', marginBottom:16,
          background: successMsg.startsWith('✅') ? 'var(--green-dim)' : 'var(--red-dim)',
          color: successMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${successMsg.startsWith('✅') ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`, fontSize:13,
        }}>{successMsg}</div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg)', padding:4, borderRadius:'var(--radius-sm)', width:'100%', border:'1px solid var(--border)' }}>
        {(['analytics','documents','courses','cases','employees'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, textAlign:'center' as const,
            padding:'6px 16px', borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:500, transition:'all .13s',
            background: tab===t ? 'var(--surface)' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? 'var(--shadow)' : 'none',
          }}>
            {t==='analytics' ? '📊 Аналитика' : t==='documents' ? '📁 Документы' : t==='courses' ? '📚 Курсы' : t==='cases' ? '✍️ Кейсы' : '👤 Сотрудники'}
          </button>
        ))}
      </div>

      {/* Analytics */}
      {tab === 'analytics' && (
        <>
          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            {metrics.map(m => (
              <div key={m.label} className="metric-card" style={{ flex:'1', minWidth:140, display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
                <div style={{ fontSize:24 }}>{m.icon}</div>
                <div>
                  <div className="metric-val" style={{ color:m.color, fontSize:22, fontWeight:700 }}>{m.val}</div>
                  <div className="metric-label" style={{ fontSize:12 }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>
          {analytics && analytics.weak_topics.length > 0 && (
            <div className="card">
              <div style={{ fontWeight:600, marginBottom:16 }}>Средний балл по курсам</div>
              {analytics.weak_topics.map((t: any) => (
                <div key={t.topic} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ flex:1, fontSize:13 }}>{t.topic}</div>
                  <div style={{ width:180, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${t.score}%`, background: t.score < 65 ? 'var(--red)' : t.score < 75 ? 'var(--amber)' : 'var(--green)' }}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, width:36, textAlign:'right', color: t.score<65 ? 'var(--red)' : t.score<75 ? 'var(--amber)' : 'var(--green)' }}>{t.score}%</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        documents.length === 0 ? (
          <div onClick={() => fileRef.current?.click()} style={{ border:'2px dashed var(--border)', borderRadius:'var(--radius)', padding:'48px 24px', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📁</div>
            <div style={{ fontWeight:600, marginBottom:6 }}>Загрузите первый документ</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>PDF, DOCX или TXT</div>
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
                    <td style={{ padding:'12px 16px' }}><span className={`badge ${statusCls(d.status)}`}>{statusLbl(d.status)}</span></td>
                    <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:13 }}>{d.chunk_count}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:12 }}>{new Date(d.uploaded_at).toLocaleDateString('ru-RU')}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-primary" style={{ fontSize:12, padding:'6px 12px' }}
                          onClick={() => handleGenerate(d.id, d.filename)} disabled={generating === d.id || d.status !== 'indexed'}>
                          {generating === d.id ? <><span className="spinner" style={{width:12,height:12}}/> Генерация...</> : '✨ Создать курс'}
                        </button>
                        <button className="btn btn-outline" style={{ fontSize:12, padding:'6px 12px', color:'var(--red)', borderColor:'var(--red)' }}
                          onClick={() => handleDeleteDoc(d.id)} disabled={deletingDoc === d.id}>
                          {deletingDoc === d.id ? '...' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Courses */}
      {tab === 'courses' && (
        courses.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📚</div>
            <div style={{ fontWeight:600 }}>Курсов пока нет</div>
          </div>
        ) : (
          <div className="grid-2">
            {courses.map((c: Course) => (
              <div key={c.id} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{c.title.replace(/^(курс:\s*)+/i, 'Курс: ')}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{c.module_count} модулей · {new Date(c.generated_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary" style={{ fontSize:12, padding:'6px 14px' }} onClick={() => setAssignDrawer(c)}>👤 Назначить</button>
                  <button className="btn btn-outline" style={{ fontSize:12, padding:'6px 10px', color:'var(--red)', borderColor:'var(--red)' }}
                    onClick={() => handleDeleteCourse(c.id, c.title)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Case Answers */}
      {tab === 'cases' && (
        caseAnswers.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>✍️</div>
            <div style={{ fontWeight:600 }}>Ответов на кейсы пока нет</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {caseAnswers.map(a => (
              <div key={a.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{a.user_name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{a.module_title} · {new Date(a.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {a.score !== null ? (
                      <span style={{ fontWeight:700, fontSize:16, color: a.score >= 80 ? 'var(--green)' : a.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{a.score}%</span>
                    ) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>Не оценено</span>}
                    <button className="btn btn-outline" style={{ fontSize:12, padding:'4px 10px' }}
                      onClick={() => { setScoringId(a.id); setScoreInput(a.score?.toString() || '') }}>✏️ Оценить</button>
                  </div>
                </div>
                <div style={{ fontSize:13, background:'var(--bg)', padding:'10px 14px', borderRadius:'var(--radius-sm)', whiteSpace:'pre-wrap' }}>{a.answer}</div>
                {scoringId === a.id && (
                  <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
                    <input type="number" min="0" max="100" value={scoreInput} onChange={e => setScoreInput(e.target.value)}
                      placeholder="0-100" style={{ width:100, padding:'6px 10px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:13 }}/>
                    <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => handleScoreCaseAnswer(a.id)}>Сохранить</button>
                    <button className="btn btn-outline" style={{ fontSize:12 }} onClick={() => setScoringId(null)}>Отмена</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Employees list */}
      {tab === 'employees' && !selectedEmployee && (
        <>
          {users.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}><div style={{ fontSize:36 }}>👥</div><div>Нет сотрудников</div></div>
          ) : (
            <div className="grid-2">
              {users.map(u => (
                <div key={u.id} className="card" style={{ cursor:'pointer' }} onClick={() => loadEmployee(u.id)}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--indigo-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'var(--indigo)' }}>{u.full_name[0]}</div>
                    <div><div style={{ fontWeight:600, fontSize:14 }}>{u.full_name}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{u.email}</div></div>
                    <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)' }}>→</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {loadingEmployee && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><span className="spinner" style={{ width:24, height:24 }} /></div>}
        </>
      )}

      {/* Employee Card */}
      {tab === 'employees' && selectedEmployee && (
        <div>
          <button className="btn btn-outline" style={{ marginBottom:20 }} onClick={() => setSelectedEmployee(null)}>← Назад</button>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--indigo-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'var(--indigo)' }}>{selectedEmployee.user.full_name[0]}</div>
            <div><div style={{ fontWeight:700, fontSize:20 }}>{selectedEmployee.user.full_name}</div><div style={{ fontSize:13, color:'var(--text-muted)' }}>{selectedEmployee.user.email}</div></div>
            {selectedEmployee.overall_score !== null && (
              <div style={{ marginLeft:'auto', textAlign:'center' }}>
                <div style={{ fontSize:32, fontWeight:700, color: selectedEmployee.overall_score >= 80 ? 'var(--green)' : selectedEmployee.overall_score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{selectedEmployee.overall_score}%</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>Итоговый балл</div>
              </div>
            )}
          </div>

          {selectedEmployee.courses.length === 0 ? (
            <div className="card" style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>Не записан ни на один курс</div>
          ) : selectedEmployee.courses.map(c => (
            <div key={c.course_id} className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:15 }}>{c.course_title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{c.status === 'completed' ? '✅ Завершён' : '🔄 В процессе'} · {c.progress_pct}%</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {c.final_score !== null && (
                    <div style={{ fontWeight:700, fontSize:20, color: c.final_score >= 80 ? 'var(--green)' : c.final_score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{c.final_score}%</div>
                  )}
                  <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 10px', color:'var(--red)', borderColor:'var(--red)' }}
                    onClick={() => setResetModal({ userId: selectedEmployee.user.id, courseId: c.course_id, courseTitle: c.course_title })}>
                    🔄 Сбросить попытки
                  </button>
                </div>
              </div>

              {c.test_results.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:'var(--text-muted)' }}>ТЕСТ {c.test_score !== null ? `— ${c.test_score}%` : ''}</div>
                  {c.test_results.map((t, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'6px 10px', borderRadius:'var(--radius-sm)', marginBottom:4, background: t.is_correct ? 'var(--green-dim)' : 'var(--red-dim)' }}>
                      <span>{t.is_correct ? '✅' : '❌'}</span>
                      <div style={{ flex:1, fontSize:12 }}>
                        <div>{t.question}</div>
                        {!t.is_correct && <div style={{ color:'var(--text-muted)', marginTop:2 }}>Ответил: «{t.user_answer}» → Правильно: «{t.correct_answer}»</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.case_results.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:'var(--text-muted)' }}>КЕЙС</div>
                  {c.case_results.map((cr, i) => (
                    <div key={i} style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:'var(--radius-sm)', marginBottom:4 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:500 }}>{cr.module_title}</span>
                        {cr.score !== null ? <span style={{ fontWeight:700, fontSize:14, color: cr.score >= 80 ? 'var(--green)' : cr.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{cr.score}%</span>
                          : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Не оценено</span>}
                      </div>
                      <div style={{ fontSize:12, whiteSpace:'pre-wrap' }}>{cr.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Drawer */}
      {assignDrawer && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:199 }} onClick={() => setAssignDrawer(null)} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:380, background:'var(--surface)', zIndex:200, boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', padding:24, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div><div style={{ fontWeight:700, fontSize:16 }}>Назначить курс</div><div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>«{assignDrawer.title}»</div></div>
              <button className="btn btn-ghost" style={{ fontSize:18, padding:'4px 8px' }} onClick={() => setAssignDrawer(null)}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {users.map(u => {
                const isEnrolled = (enrolledMap[assignDrawer.id] || []).includes(u.id)
                return (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', background: isEnrolled ? 'var(--green-dim)' : 'var(--surface)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--indigo-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--indigo)' }}>{u.full_name[0]}</div>
                      <div><div style={{ fontSize:13, fontWeight:500 }}>{u.full_name}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div></div>
                    </div>
                    {isEnrolled ? <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✅ Назначен</span>
                      : <button className="btn btn-primary" style={{ fontSize:12, padding:'5px 12px' }} onClick={() => handleAssign(assignDrawer.id, u.id)} disabled={assigning === u.id}>{assigning === u.id ? '...' : 'Назначить'}</button>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28, width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{confirmModal.title}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{confirmModal.message}</div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmModal(null)}>Отмена</button>
              <button className="btn btn-primary" style={{ background:'var(--red)', borderColor:'var(--red)' }}
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28, width:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Сбросить попытки</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>«{resetModal.courseTitle.replace(/^(курс:\s*)+/i, 'Курс: ')}»</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              <button className="btn btn-outline" style={{ width:'100%', padding:'10px 16px', textAlign:'left', display:'block' }}
                onClick={() => doReset(resetModal.userId, resetModal.courseId, 'test')}>
                🗑 Сбросить только тест
              </button>
              <button className="btn btn-outline" style={{ width:'100%', padding:'10px 16px', textAlign:'left', display:'block' }}
                onClick={() => doReset(resetModal.userId, resetModal.courseId, 'case')}>
                🗑 Сбросить только кейс
              </button>
              <button className="btn btn-outline" style={{ width:'100%', padding:'10px 16px', textAlign:'left', display:'block', color:'var(--red)', borderColor:'var(--red)' }}
                onClick={() => doReset(resetModal.userId, resetModal.courseId, 'all')}>
                🗑 Сбросить всё (тест + кейс)
              </button>
            </div>
            <button className="btn btn-outline" style={{ width:'100%' }} onClick={() => setResetModal(null)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  )
}
