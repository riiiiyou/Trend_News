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
    window.location.href = `/admin/edit/${id}`
  } catch (err) {
    setError(`업로드 중 오류: ${err instanceof Error ? err.message : String(err)}`)
    setUploading(false)
  }
}

export default function UploadPage() {
  // PPT section
  const pptRef = useRef<HTMLInputElement>(null)
  const [pptDragging, setPptDragging] = useState(false)
  const [pptUploading, setPptUploading] = useState(false)
  const [pptFileName, setPptFileName] = useState('')

  // Image section
  const imgRef = useRef<HTMLInputElement>(null)
  const [imgDragging, setImgDragging] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgFileName, setImgFileName] = useState('')

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

  const handleImgFile = (file: File) => {
    const nameLower = file.name.toLowerCase()
    const valid = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(e => nameLower.endsWith(e))
    if (!valid) {
      setError('JPG, PNG 등 이미지 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('이미지 크기는 10MB 이하여야 합니다')
      return
    }
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setImgPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setImgFileName(file.name)
    setError('')
    uploadAndNavigate(file, setError, setImgUploading, setImgFileName)
  }

  const onPptDrop = (e: DragEvent) => { e.preventDefault(); setPptDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePptFile(f) }
  const onImgDrop = (e: DragEvent) => { e.preventDefault(); setImgDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImgFile(f) }
  const onPptChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePptFile(f) }
  const onImgChange = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleImgFile(f) }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📤 파일 업로드</h1>
        <p className="text-sm text-gray-500 mt-1">PPT/PPTX 또는 이미지를 업로드해 뉴스레터를 만들 수 있습니다</p>
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

      {/* Divider */}
      <div className="flex items-center gap-3 text-gray-300">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">또는</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Image Upload */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">🖼️ 이미지 업로드 (JPG / PNG)</h2>
        <div
          className={`border-2 border-dashed rounded-2xl transition-colors cursor-pointer overflow-hidden ${
            imgDragging ? 'border-[var(--point)] bg-[var(--point-light)]' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setImgDragging(true) }}
          onDragLeave={() => setImgDragging(false)}
          onDrop={onImgDrop}
          onClick={() => imgRef.current?.click()}
        >
          <input ref={imgRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={onImgChange} />
          {imgPreview ? (
            <div className="relative">
              <img
                src={imgPreview}
                alt="미리보기"
                className="w-full max-h-72 object-contain bg-gray-50"
              />
              {imgUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-sm text-gray-600 animate-pulse">업로드 중...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center">
              {imgUploading ? (
                <div>
                  <div className="text-3xl mb-3 animate-pulse">⏳</div>
                  <p className="font-medium text-gray-700 text-sm">{imgFileName}</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">🖼️</div>
                  <p className="font-medium text-gray-700 text-sm mb-1">이미지를 드래그하거나 클릭</p>
                  <p className="text-xs text-gray-400">JPG · PNG · GIF · WebP · 최대 10MB · 자동 맞춤</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
