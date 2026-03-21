import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesApi, testsApi } from '../api'
import type { TestQuestion, TestAttempt } from '../types'

export const TestPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate      = useNavigate()

  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [current,   setCurrent]   = useState(0)
  const [selected,  setSelected]  = useState<string | null>(null)
  const [result,    setResult]    = useState<TestAttempt | null>(null)
  const [answers,   setAnswers]   = useState<TestAttempt[]>([])
  const [loading,   setLoading]   = useState(true)
  const [submitting,setSubmitting]= useState(false)
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    if (!moduleId) return
    modulesApi.getTests(Number(moduleId))
      .then(qs => { setQuestions(qs); setLoading(false) })
      .catch(() => setLoading(false))
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

  if (questions.length === 0) return (
    <div className="page">
      <div className="card empty-state">
        <div className="empty-state-icon">✏️</div>
        <div className="empty-state-title">Вопросы не найдены</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop:16 }}>← Назад</button>
      </div>
    </div>
  )

  // Results screen
  if (done) {
    const correct = answers.filter(a => a.is_correct).length
    const total   = answers.length
    const pct     = Math.round((correct / total) * 100)
    return (
      <div className="page fade-in">
        <div className="card" style={{ maxWidth:560, margin:'0 auto', padding:40, textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>
            {pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚'}
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, marginBottom:8 }}>
            Тест завершён!
          </h2>
          <div style={{
            fontSize:48, fontWeight:700, margin:'16px 0',
            color: pct>=80 ? 'var(--green)' : pct>=60 ? 'var(--amber)' : 'var(--red)',
          }}>{pct}%</div>
          <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:24 }}>
            Правильных ответов: <strong>{correct}</strong> из <strong>{total}</strong>
          </div>

          {/* Answer breakdown */}
          <div style={{ textAlign:'left', marginBottom:24 }}>
            {answers.map((a, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', borderRadius:'var(--r-sm)', marginBottom:6,
                background: a.is_correct ? 'var(--green-light)' : 'var(--red-light)',
              }}>
                <span style={{ fontSize:16 }}>{a.is_correct ? '✓' : '✗'}</span>
                <span style={{ fontSize:12, color:'var(--text-2)', flex:1 }}>
                  Вопрос {i + 1}
                </span>
                {!a.is_correct && (
                  <span style={{ fontSize:11, color:'var(--red)' }}>
                    → {a.correct_answer}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Назад к курсу</button>
            <button className="btn btn-primary"   onClick={() => navigate('/courses')}>Мои курсы</button>
          </div>
        </div>
      </div>
    )
  }

  // Question screen
  return (
    <div className="page fade-in">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom:8, paddingLeft:0 }}>
          ← Назад
        </button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 className="page-title">Тестирование</h1>
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:500 }}>
            {current + 1} / {questions.length}
          </span>
        </div>
        <div className="progress-track" style={{ marginTop:8 }}>
          <div className="progress-fill" style={{
            width:`${((current + (result ? 1 : 0)) / questions.length) * 100}%`,
            background:'var(--indigo)',
          }} />
        </div>
      </div>

      <div style={{ maxWidth:660 }}>
        {/* Question card */}
        <div className="card" style={{ marginBottom:16, padding:28 }}>
          <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>
            Вопрос {current + 1} · {question.points} очков
          </div>
          <p style={{ fontSize:16, fontWeight:500, lineHeight:1.6, color:'var(--text)' }}>
            {question.question}
          </p>
        </div>

        {/* Options */}
        <div className="test-options" style={{ marginBottom:20 }}>
          {question.options.map((opt, i) => {
            let cls = ''
            if (result) {
              if (opt === result.correct_answer)  cls = 'correct'
              else if (opt === selected)           cls = 'wrong'
              else                                 cls = 'disabled'
            } else if (opt === selected) {
              cls = 'selected'
            }
            return (
              <div
                key={i}
                className={`test-option ${cls}`}
                onClick={() => !result && setSelected(opt)}
              >
                <div className="option-bullet">
                  {result && opt === result.correct_answer ? '✓' :
                   result && opt === selected && !result.is_correct ? '✗' :
                   String.fromCharCode(65 + i)}
                </div>
                <span>{opt}</span>
              </div>
            )
          })}
        </div>

        {/* Feedback */}
        {result && (
          <div className={result.is_correct ? 'success-box' : 'error-box'} style={{ marginBottom:16 }}>
            {result.explanation}
          </div>
        )}

        {/* Actions */}
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
              {isLast ? 'Завершить тест 🎉' : 'Следующий вопрос →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
