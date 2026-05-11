'use client'
// src/app/admin/upload/page.tsx
import { useState, useRef, DragEvent, ChangeEvent } from 'react'

async function uploadAndNavigate(
  file: File,
  setError: (e: string) => void,
  setUploading: (v: boolean) => void,
  setFileName: (v: string) => void
) {
  setFileName(file.name)
  setError('')
  setUploading(true)

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '업로드 실패')
      setUploading(false)
      return
    }
    const { id, title, content, links, thumbnailUrl } = await res.json()
    sessionStorage.setItem(`nl_draft_${id}`, JSON.stringify({ title, content, links, thumbnailUrl }))

    // Save draft to localStorage registry so admin page shows it
    try {
      const registry = JSON.parse(localStorage.getItem('nl_registry') || '[]')
      const meta = { id, title, summary: null, category: '[]', published_at: null, created_at: new Date().toISOString(), status: 'draft' }
      const idx = registry.findIndex((n: { id: number }) => n.id === id)
      if (idx >= 0) registry[idx] = meta; else registry.unshift(meta)
      localStorage.setItem('nl_registry', JSON.stringify(registry.slice(0, 50)))
    } catch { /* empty */ }

    window.location.href = `/admin/edit/${id}`
  } catch (err) {
    setError(`업로드 중 오류: ${err instanceof Error ? err.message : String(err)}`)
    setUploading(false)
  }
}

export default function UploadPage() {
  const pptRef = useRef<HTMLInputElement>(null)
  const [pptDragging, setPptDragging] = useState(false)
  const [pptUploading, setPptUploading] = useState(false)
  const [pptFileName, setPptFileName] = useState('')
  const [error, setError] = useState('')

  const handlePptFile = (file: File) => {
    const nameLower = file.name.toLowerCase()
    if (!nameLower.endsWith('.pptx') && !nameLower.endsWith('.ppt')) {
      setError('PPT 또는 PPTX 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB 이하여야 합니다')
      return
    }
    uploadAndNavigate(file, setError, setPptUploading, setPptFileName)
  }

  const onPptDrop = (e: DragEvent) => { e.preventDefault(); setPptDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePptFile(f) }
  const onPptChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePptFile(f) }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📤 파일 업로드</h1>
        <p className="text-sm text-gray-500 mt-1">PPT/PPTX를 업로드해 뉴스레터를 만들 수 있습니다</p>
      </div>

      {/* PPT Upload */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">📊 PPT / PPTX 업로드</h2>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            pptDragging ? 'border-[var(--point)] bg-[var(--point-light)]' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setPptDragging(true) }}
          onDragLeave={() => setPptDragging(false)}
          onDrop={onPptDrop}
          onClick={() => pptRef.current?.click()}
        >
          <input ref={pptRef} type="file" accept=".ppt,.pptx" className="hidden" onChange={onPptChange} />
          {pptUploading ? (
            <div>
              <div className="text-3xl mb-3 animate-pulse">⏳</div>
              <p className="font-medium text-gray-700 text-sm">파싱 중...</p>
              <p className="text-xs text-gray-400 mt-1">{pptFileName}</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📊</div>
              <p className="font-medium text-gray-700 text-sm mb-1">PPT / PPTX 파일을 드래그하거나 클릭</p>
              <p className="text-xs text-gray-400">최대 50MB · 텍스트·이미지 자동 추출</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">이미지 삽입 방법</p>
        <p className="text-xs text-blue-600">업로드 후 편집 화면에서 툴바의 🖼️ 이미지 버튼으로 텍스트 중간에 이미지를 삽입할 수 있습니다.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
