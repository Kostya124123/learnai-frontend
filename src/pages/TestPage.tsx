import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesApi, testsApi } from '../api'
import ReactMarkdown from 'react-markdown'
import type { TestQuestion, TestAttempt } from '../types'

export const TestPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate      = useNavigate()

  const [questions,  setQuestions]  = useState<TestQuestion[]>([])
  const [moduleContent, setModuleContent] = useState<string>('')
  const [moduleType, setModuleType] = useState<string>('')
  const [current,    setCurrent]    = useState(0)
  const [selected,   setSelected]   = useState<string | null>(null)
  const [result,     setResult]     = useState<TestAttempt | null>(null)
  const [answers,    setAnswers]     = useState<TestAttempt[]>([])
  const [loading,    setLoading]     = useState(true)
  const [submitting, setSubmitting]  = useState(false)
  const [done,       setDone]        = useState(false)
  const [caseAnswer, setCaseAnswer]  = useState('')
  const [caseSubmitted, setCaseSubmitted] = useState(false)
  const [caseSubmitting, setCaseSubmitting] = useState(false)

  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

  const submitCaseAnswer = async () => {
    if (!caseAnswer.trim() || caseSubmitting) return
    setCaseSubmitting(true)
    try {
      await fetch(`${baseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
        },
        body: JSON.stringify({ question: `[КЕЙС #${moduleId}] ${caseAnswer}` })
      })
    } catch {}
    setCaseSubmitted(true)
    setCaseSubmitting(false)
  }

  useEffect(() => {
    if (!moduleId) return
    // Загружаем вопросы
    modulesApi.getTests(Number(moduleId))
      .then(qs => {
        setQuestions(qs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [moduleId])

  // Определяем тип модуля по URL или по отсутствию вопросов
  useEffect(() => {
    // Пробуем получить информацию о модуле через API
    if (!moduleId) return
    fetch(`/modules/${moduleId}`, {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
      .then(r => r.json())
      .then(data => {
        if (data.module_type) setModuleType(data.module_type)
        if (data.content) setModuleContent(data.content)
      })
      .catch(() => {})
  }, [moduleId])

  const question = questions[current]
  const isLast   = current === questions.length - 1

  const handleSubmit = async () => {
    if (!selected || !question || submitting) return
    setSubmitting(true)
    try {
      const res = await testsApi.submit(question.id, selected)
      setResult(res)
      setAnswers(prev => [...prev, res])
    } finally { setSubmitting(false) }
  }

  const handleNext = () => {
    if (isLast) { setDone(true); return }
    setCurrent(c => c + 1)
    setSelected(null); setResult(null)
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
      <span className="spinner" style={{ width:28, height:28 }} />
    </div>
  )

  // Кейс — нет вопросов, показываем текст задания
  if (questions.length === 0) {
    if (caseSubmitted) {
      return (
        <div className="page fade-in">
          <div className="card" style={{ maxWidth:560, margin:'0 auto', padding:40, textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🎯</div>
            <h2 style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>Кейс выполнен!</h2>
            <p style={{ color:'var(--text-muted)', marginBottom:24 }}>
              Ваш ответ отправлен на проверку руководителю.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад к курсу</button>
              <button className="btn btn-primary" onClick={() => navigate('/courses')}>Мои курсы</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="page fade-in">
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom:8, paddingLeft:0 }}>
            ← Назад
          </button>
          <h1 className="page-title">🎯 Практический кейс</h1>
        </div>

        {moduleContent ? (
          <div className="card" style={{ marginBottom:24, padding:28 }}>
            <ReactMarkdown>{moduleContent}</ReactMarkdown>
          </div>
        ) : (
          <div className="card" style={{ marginBottom:24, padding:28 }}>
            <p style={{ color:'var(--text-muted)' }}>
              Изучите материал курса и выполните практическое задание ниже.
            </p>
          </div>
        )}

        <div className="card" style={{ padding:28 }}>
          <h3 style={{ marginBottom:12, fontSize:16, fontWeight:600 }}>Ваш ответ</h3>
          <textarea
            value={caseAnswer}
            onChange={e => setCaseAnswer(e.target.value)}
            placeholder="Опишите ваши действия в данной ситуации..."
            style={{
              width:'100%', minHeight:200, padding:'12px 16px',
              border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
              fontFamily:'var(--font)', fontSize:14, resize:'vertical',
              outline:'none', background:'var(--surface)', color:'var(--text)'
            }}
          />
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад</button>
            <button
              className="btn btn-primary"
              onClick={submitCaseAnswer}
              disabled={!caseAnswer.trim() || caseSubmitting}
            >
              {caseSubmitting ? 'Отправка...' : 'Отправить на проверку'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Результаты теста
  if (done) {
    const correct = answers.filter(a => a.is_correct).length
    const total   = answers.length
    const pct     = Math.round((correct / total) * 100)
    return (
      <div className="page fade-in">
        <div className="card" style={{ maxWidth:560, margin:'0 auto', padding:40, textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>
            {pct >= 80 ? '🏆' : pct >= 60 ? '📚' : '💪'}
          </div>
          <h2 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Тест завершён!</h2>
          <div style={{
            fontSize:48, fontWeight:700, margin:'16px 0',
            color: pct>=80 ? 'var(--green)' : pct>=60 ? 'var(--amber)' : 'var(--red)',
          }}>{pct}%</div>
          <div style={{ fontSize:14, color:'var(--text-muted)', marginBottom:24 }}>
            Правильных ответов: <strong>{correct}</strong> из <strong>{total}</strong>
          </div>
          <div style={{ textAlign:'left', marginBottom:24 }}>
            {answers.map((a, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', borderRadius:'var(--radius-sm)', marginBottom:6,
                background: a.is_correct ? 'var(--green-dim)' : 'var(--red-dim)',
              }}>
                <span style={{ fontSize:16 }}>{a.is_correct ? '✅' : '❌'}</span>
                <span style={{ fontSize:12, color:'var(--text-muted)', flex:1 }}>Вопрос {i + 1}</span>
                {!a.is_correct && (
                  <span style={{ fontSize:11, color:'var(--red)' }}>→ {a.correct_answer}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>← Назад к курсу</button>
            <button className="btn btn-primary" onClick={() => navigate('/courses')}>Мои курсы</button>
          </div>
        </div>
      </div>
    )
  }

  // Экран вопроса
  return (
    <div className="page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom:8, paddingLeft:0 }}>
          ← Назад
        </button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Тестирование</h1>
          <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>
            {current + 1} / {questions.length}
          </span>
        </div>
        <div className="progress-track" style={{ marginTop:8 }}>
          <div className="progress-fill" style={{
            width:`${((current + (result ? 1 : 0)) / questions.length) * 100}%`,
          }} />
        </div>
      </div>

      <div style={{ maxWidth:660 }}>
        <div className="card" style={{ marginBottom:16, padding:28 }}>
          <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>
            Вопрос {current + 1} · {question.points} очков
          </div>
          <p style={{ fontSize:16, fontWeight:500, lineHeight:1.6 }}>
            {question.question}
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {question.options.map((opt, i) => {
            let cls = ''
            if (result) {
              if (opt === result.correct_answer)        cls = 'correct'
              else if (opt === selected)                cls = 'wrong'
            } else if (opt === selected) {
              cls = 'selected'
            }
            return (
              <div
                key={i}
                className={`test-option ${cls}`}
                onClick={() => !result && setSelected(opt)}
              >
                <div className="option-circle" />
                <span>{opt}</span>
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {!result ? (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selected || submitting}
            >
              {submitting ? <span className="spinner" style={{width:14,height:14}}/> : 'Ответить'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleNext}>
              {isLast ? 'Завершить тест 🏆' : 'Следующий вопрос →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
