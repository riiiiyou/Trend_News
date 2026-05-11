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
    const nameLower = file.name.toLowerCase()
    if (!nameLower.endsWith('.pptx') && !nameLower.endsWith('.ppt')) {
      setError('PPT 또는 PPTX 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB 이하여야 합니다')
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
      const { id, title, content, links, thumbnailUrl } = await res.json()
      sessionStorage.setItem(`nl_draft_${id}`, JSON.stringify({ title, content, links, thumbnailUrl }))
      window.location.href = `/admin/edit/${id}`
    } catch (err) {
      setError(`업로드 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`)
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
        <h1 className="text-2xl font-bold text-gray-900">📤 PPT 업로드</h1>
        <p className="text-sm text-gray-500 mt-1">PPT / PPTX를 업로드하면 자동으로 텍스트와 이미지를 추출합니다</p>
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
          accept=".ppt,.pptx"
          className="hidden"
          onChange={onChange}
        />

        {uploading ? (
          <div>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="font-medium text-gray-700">파일 파싱 중...</p>
            <p className="text-sm text-gray-400 mt-1">{fileName}</p>
            <p className="text-xs text-gray-400 mt-2">텍스트와 이미지를 추출하고 있습니다. 잠시만 기다려주세요.</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">📊</div>
            <p className="font-medium text-gray-700 mb-1">PPT / PPTX 파일을 드래그하거나 클릭해서 선택하세요</p>
            <p className="text-sm text-gray-400">최대 50MB · PPT · PPTX 형식 지원</p>
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
          <li>PPT / PPTX 슬라이드에서 텍스트를 추출합니다</li>
          <li>첫 번째 슬라이드 텍스트를 제목으로 설정합니다</li>
          <li>첫 번째 이미지를 썸네일로 자동 설정합니다</li>
          <li>URL 링크를 자동으로 감지합니다</li>
          <li>편집 페이지로 이동합니다</li>
        </ul>
      </div>
    </div>
  )
}
