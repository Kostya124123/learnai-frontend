import React, { useEffect, useRef, useState } from 'react'
import { chatApi } from '../api'
import type { ChatMessage } from '../types'

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    chatApi.getHistory()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim(); setInput('')

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await chatApi.ask(q)
      const aiMsg: ChatMessage = {
        id: Date.now() + 1, role: 'assistant',
        content: res.answer, source: res.source,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: 'Ошибка соединения с сервером.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = async () => {
    if (!window.confirm('Очистить историю чата?')) return
    try {
      await fetch(`${baseUrl}/chat/history`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      })
    } catch {}
    setMessages([])
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const SUGGESTIONS = [
    'Что такое Red Zone?',
    'Правила использования СИЗ',
    'Что делать при нарушении протокола?',
    'Порядок фиксации инцидента',
  ]

  return (
    <div className="chat-wrap">
      {/* Header */}
      <div className="topbar">
        <div>
          <div style={{ fontWeight:600, fontSize:15 }}>AI-ассистент</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Ответы строго по загруженным документам</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {messages.length > 0 && (
            <button
              className="btn btn-outline"
              style={{ fontSize:12, padding:'4px 10px', color:'var(--text-muted)' }}
              onClick={clearChat}
            >
              🗑 Очистить
            </button>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)' }} />
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Онлайн</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-msgs">
        {fetching && (
          <div style={{ display:'flex', justifyContent:'center', paddingTop:40 }}>
            <span className="spinner" style={{ width:22, height:22 }} />
          </div>
        )}

        {!fetching && messages.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
            <div style={{
              width:60, height:60, background:'var(--indigo-dim)',
              borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
            }}>🤖</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontWeight:600, fontSize:16, marginBottom:6 }}>Задайте вопрос по документам</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>Ответы формируются строго на основе загруженных регламентов</div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:500 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="btn btn-outline"
                  onClick={() => setInput(s)}
                  style={{ borderRadius:20, fontSize:12 }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            {msg.content}
            {msg.role === 'assistant' && msg.source && (
              <div className="chat-source">📄 {msg.source}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble assistant" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="spinner" style={{ width:14, height:14 }} />
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Анализирую документы...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="form-input"
          placeholder="Задайте вопрос по документам... (Enter для отправки)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
          Отправить
        </button>
      </div>
    </div>
  )
}
