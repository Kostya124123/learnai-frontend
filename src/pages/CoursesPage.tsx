import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enrollmentsApi } from '../api'
import type { Enrollment } from '../types'

const STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'В процессе', cls: 'badge-amber'  },
  completed: { label: 'Завершён',   cls: 'badge-green'  },
  paused:    { label: 'Приостановлен', cls: 'badge-gray' },
}

const COURSE_COLORS = ['#EEF2FF','#EFF6FF','#ECFDF5','#FFFBEB','#FFF1F2']
const COURSE_EMOJI  = ['📋','📘','🔬','⚙️','🏭','📝','🎯','🛡️']

export const CoursesPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    enrollmentsApi.getMy()
      .then(setEnrollments)
      .catch(() => setError('Не удалось загрузить курсы'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
      <span className="spinner" style={{ width:28, height:28 }} />
    </div>
  )

  const done  = enrollments.filter(e => e.status === 'completed').length
  const total = enrollments.length

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">Мои курсы</h1>
          <p className="page-sub">{total} курсов · {done} завершено</p>
        </div>
        {total > 0 && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--indigo)' }}>
              {total > 0 ? Math.round((done / total) * 100) : 0}%
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>общий прогресс</div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {total > 0 && (
        <div className="card" style={{ marginBottom:20, padding:'14px 20px' }}>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            {[
              { label:'Всего', val: total, color:'var(--indigo)' },
              { label:'В процессе', val: enrollments.filter(e => e.status==='active').length, color:'var(--amber)' },
              { label:'Завершено', val: done, color:'var(--green)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700, color:m.color }}>{m.val}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>{m.label}</div>
              </div>
            ))}
            <div style={{ flex:1, marginLeft:8 }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width:`${total>0?(done/total*100):0}%`, background:'var(--indigo)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom:16 }}>{error}</div>}

      {/* Empty */}
      {total === 0 && !error && (
        <div className="card empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">Нет назначенных курсов</div>
          <div className="empty-state-sub">Обратитесь к HR-менеджеру для записи</div>
        </div>
      )}

      {/* Course list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {enrollments.map((e, i) => {
          const st = STATUS[e.status] ?? { label: e.status, cls:'badge-gray' }
          const bg = COURSE_COLORS[i % COURSE_COLORS.length]
          const em = COURSE_EMOJI[i % COURSE_EMOJI.length]
          return (
            <div key={e.id} className="course-card" onClick={() => navigate(`/courses/${e.course_id}`)}>
              {/* Icon */}
              <div className="course-icon" style={{ background: bg }}>{em}</div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{e.course_title}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>
                      Записан: {new Date(e.enrolled_at).toLocaleDateString('ru-RU')}
                      {e.last_score != null && e.status === 'completed' && (
                        <span style={{ marginLeft:10, color:'var(--green)', fontWeight:600 }}>
                          Балл: {Math.round(e.last_score)}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div className="progress-track" style={{ flex:1 }}>
                    <div className="progress-fill" style={{
                      width: `${e.progress_pct}%`,
                      background: e.status==='completed' ? 'var(--green-mid)' : 'var(--indigo)',
                    }} />
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-3)', minWidth:36 }}>{Math.round(e.progress_pct)}%</span>
                </div>
              </div>

              <span style={{ color:'var(--text-3)', fontSize:18 }}>›</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
