'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

type ResultNode = { title: string; level: string; summary: string }
type Result = {
  nodeCount: number
  edgeCount: number
  nodes: ResultNode[]
  usage?: { input_tokens: number; output_tokens: number }
}

const LEVEL_STYLE: Record<string, { icon: string; color: string }> = {
  star: { icon: '⭐', color: 'text-yellow-400' },
  planet: { icon: '🪐', color: 'text-violet-400' },
  asteroid: { icon: '☄️', color: 'text-zinc-400' },
}

export default function UploadPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    setFileName(file.name)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('未登录'); setPhase('error'); return }

    // 1. 浏览器直传 Supabase Storage
    setPhase('uploading')
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: 'application/pdf' })
    if (uploadErr) { setError(`上传失败：${uploadErr.message}`); setPhase('error'); return }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    // 2. 创建 Document 记录
    const docRes = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: file.name.replace(/\.pdf$/i, ''), fileUrl }),
    })
    if (!docRes.ok) { setError('创建文档记录失败'); setPhase('error'); return }
    const { id } = await docRes.json()

    // 3. 触发 Claude 提取
    setPhase('extracting')
    const extractRes = await fetch(`/api/documents/${id}/extract`, { method: 'POST' })
    const extractData = await extractRes.json()
    if (!extractRes.ok) {
      setError(`提取失败：${extractData.error ?? '未知错误'}`)
      setPhase('error')
      return
    }

    setResult(extractData)
    setPhase('done')
  }

  const busy = phase === 'uploading' || phase === 'extracting'

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <img src="/icon.svg" alt="NeuronMap" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold text-white leading-none">上传学习材料</h1>
            <p className="text-sm text-zinc-500 mt-1">上传 PDF，AI 自动提取知识节点</p>
          </div>
        </div>

        <label
          className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            busy ? 'border-zinc-700 opacity-50 pointer-events-none' : 'border-zinc-700 hover:border-violet-500'
          }`}
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <div className="text-4xl mb-3">📄</div>
          <p className="text-zinc-300 font-medium">点击选择 PDF 文件</p>
          <p className="text-xs text-zinc-600 mt-1">Phase 1 仅支持 .pdf</p>
        </label>

        {phase === 'uploading' && (
          <p className="mt-6 text-sm text-violet-400 flex items-center gap-2">
            <span className="animate-pulse">●</span> 正在上传 {fileName}...
          </p>
        )}
        {phase === 'extracting' && (
          <p className="mt-6 text-sm text-violet-400 flex items-center gap-2">
            <span className="animate-pulse">●</span> Claude 正在分析材料，提取知识节点...（大文件可能需要 10-60 秒）
          </p>
        )}

        {phase === 'error' && (
          <p className="mt-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {phase === 'done' && result && (
          <div className="mt-8">
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="text-green-400 font-medium">✓ 提取完成</span>
              <span className="text-zinc-400">{result.nodeCount} 个节点 · {result.edgeCount} 条关系</span>
              {result.usage && (
                <span className="text-zinc-600">
                  {result.usage.input_tokens + result.usage.output_tokens} tokens
                </span>
              )}
            </div>
            <div className="space-y-2">
              {result.nodes.map((n, i) => {
                const style = LEVEL_STYLE[n.level] ?? LEVEL_STYLE.asteroid
                return (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <span className="font-medium text-white">{n.title}</span>
                      <span className={`text-xs ${style.color}`}>{n.level}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{n.summary}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
