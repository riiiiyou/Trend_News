'use client'
// src/app/admin/upload/page.tsx
import { useState, useRef, DragEvent, ChangeEvent } from 'react'

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('파일 크기는 20MB 이하여야 합니다')
      return
    }

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
      const { id, title, content, links } = await res.json()
      // Vercel 서버리스 환경에서 Lambda 인스턴스가 달라 DB 조회 실패 가능.
      // 업로드 결과를 sessionStorage에 보존해 에디터 페이지에서 복원.
      sessionStorage.setItem(`nl_draft_${id}`, JSON.stringify({ title, content, links }))
      window.location.href = `/admin/edit/${id}`
    } catch {
      setError('업로드 중 오류가 발생했습니다')
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📤 PDF 업로드</h1>
        <p className="text-sm text-gray-500 mt-1">PDF를 업로드하면 자동으로 텍스트를 추출합니다</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
          dragging ? 'border-[var(--point)] bg-[var(--point-light)]' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onChange}
        />

        {uploading ? (
          <div>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="font-medium text-gray-700">PDF 파싱 중...</p>
            <p className="text-sm text-gray-400 mt-1">{fileName}</p>
            <p className="text-xs text-gray-400 mt-2">텍스트를 추출하고 있습니다. 잠시만 기다려주세요.</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">📄</div>
            <p className="font-medium text-gray-700 mb-1">PDF 파일을 드래그하거나 클릭해서 선택하세요</p>
            <p className="text-sm text-gray-400">최대 20MB · PDF 형식만 지원</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <p className="font-medium mb-1">💡 업로드 후 자동으로:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li>PDF에서 텍스트를 추출합니다</li>
          <li>제목과 본문을 자동으로 분리합니다</li>
          <li>URL 링크를 자동으로 감지합니다</li>
          <li>편집 페이지로 이동합니다</li>
        </ul>
      </div>
    </div>
  )
}
