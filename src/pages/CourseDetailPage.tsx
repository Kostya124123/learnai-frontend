import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesApi, enrollmentsApi } from '../api'
import type { CourseModule, Enrollment } from '../types'
import ReactMarkdown from 'react-markdown'

const TYPE_META: Record<string, { icon: string; label: string; cls: string }> = {
  theory: { icon:'📖', label:'Теория',   cls:'module-type-theory' },
  test:   { icon:'✏️', label:'Тест',     cls:'module-type-test'   },
  case:   { icon:'🎯', label:'Кейс',     cls:'module-type-case'   },
}

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate     = useNavigate()

  const [modules,    setModules]    = useState<CourseModule[]>([])
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [active,     setActive]     = useState<CourseModule | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!courseId) return
    Promise.all([
      modulesApi.getByCourse(Number(courseId)),
      enrollmentsApi.getMy(),
    ]).then(([mods, enrolls]) => {
      setModules(mods)
      setActive(mods[0] ?? null)
      const e = enrolls.find(e => e.course_id === Number(courseId))
      setEnrollment(e ?? null)
      // Восстанавливаем завершённые модули из прогресса
      if (e && e.progress_pct > 0) {
        const completedCount = Math.round((e.progress_pct / 100) * mods.length)
        const completed = new Set(mods.slice(0, completedCount).map(m => m.id))
        setCompletedModules(completed)
      }
    }).finally(() => setLoading(false))
  }, [courseId])

  const markModuleComplete = async (moduleId: number) => {
    if (!enrollment) return
    const newCompleted = new Set(completedModules)
    newCompleted.add(moduleId)
    setCompletedModules(newCompleted)

    const progress = Math.round((newCompleted.size / modules.length) * 100)
    try {
      await enrollmentsApi.updateProgress(enrollment.id, progress)
      setEnrollment(prev => prev ? { ...prev, progress_pct: progress, status: progress >= 100 ? 'completed' : 'active' } : prev)
    } catch {}
  }

  const goTest = (mod: CourseModule) => navigate(`/test/${mod.id}`)

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
      <span className="spinner" style={{ width:28, height:28 }} />
    </div>
  )

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/courses')} style={{ marginBottom:8, paddingLeft:0 }}>
          ← Назад к курсам
        </button>
        <h1 className="page-title">{enrollment?.course_title ?? 'Курс'}</h1>
        {enrollment && (
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8 }}>
            <div className="progress-track" style={{ width:200 }}>
              <div className="progress-fill" style={{ width:`${enrollment.progress_pct}%`, background:'var(--indigo)' }} />
            </div>
            <span style={{ fontSize:12, color:'var(--text-2)' }}>{Math.round(enrollment.progress_pct)}% завершено</span>
            {enrollment.status === 'completed' && (
              <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✅ Курс пройден!</span>
            )}
          </div>
        )}
      </div>

      {/* Split layout */}
      <div className="split">
        {/* Module list */}
        <div>
          <div className="section-header">
            <div className="section-title">Модули курса</div>
            <span className="tag">{modules.length} модулей</span>
          </div>
          <div className="module-list">
            {modules.map((m) => {
              const meta = TYPE_META[m.module_type] ?? { icon:'📄', label:m.module_type, cls:'' }
              const done = completedModules.has(m.id)
              return (
                <div
                  key={m.id}
                  className={`module-item${active?.id === m.id ? ' active' : ''}`}
                  onClick={() => setActive(m)}
                >
                  <div className={`module-type-icon ${meta.cls}`}>{meta.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{m.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{meta.label}</div>
                  </div>
                  {done
                    ? <span style={{ color:'var(--green)', fontSize:16 }}>✅</span>
                    : <span style={{ color:'var(--text-3)', fontSize:12 }}>›</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          {active && (
            <div className="card" style={{ padding:28 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <h2 style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{active.title}</h2>
                  <span className="tag">
                    {TYPE_META[active.module_type]?.icon} {TYPE_META[active.module_type]?.label}
                  </span>
                </div>
                {active.module_type !== 'theory' && (
                  <button className="btn btn-primary" onClick={() => goTest(active)}>
                    {active.module_type === 'test' ? 'Пройти тест' : 'Решить кейс'} →
                  </button>
                )}
              </div>
              <div className="divider" />
              <div style={{ fontSize:14, lineHeight:1.8, color:'var(--text)' }}>
                <ReactMarkdown>{active.content}</ReactMarkdown>
              </div>

              {/* Кнопка "Изучено" для теории */}
              {active.module_type === 'theory' && (
                <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
                  {!completedModules.has(active.id) ? (
                    <button className="btn btn-primary" onClick={async () => {
                      await markModuleComplete(active.id)
                      const next = modules[modules.findIndex(m => m.id === active.id) + 1]
                      if (next) setActive(next)
                    }}>
                      ✅ Изучено → Следующий модуль
                    </button>
                  ) : (
                    <button className="btn btn-outline" onClick={() => {
                      const next = modules[modules.findIndex(m => m.id === active.id) + 1]
                      if (next) setActive(next)
                    }}>
                      Следующий модуль →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
