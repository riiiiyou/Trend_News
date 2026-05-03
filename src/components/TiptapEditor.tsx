'use client'
// src/components/TiptapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

type Props = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function TiptapEditor({ content, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: placeholder || '본문을 입력하세요...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: { class: 'newsletter-content focus:outline-none min-h-[300px] px-1' },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!editor) return null

  const btn = (active: boolean) =>
    `px-2.5 py-1 text-sm rounded transition-colors ${
      active ? 'bg-[var(--point)] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`

  const setLink = () => {
    const url = window.prompt('링크 URL을 입력하세요')
    if (url) editor.chain().focus().setLink({ href: url }).run()
    else editor.chain().focus().unsetLink().run()
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}><u>U</u></button>
        <div className="w-px bg-gray-200 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))}>H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>H3</button>
        <div className="w-px bg-gray-200 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>• 목록</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>1. 목록</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>&ldquo;&rdquo;</button>
        <div className="w-px bg-gray-200 mx-1" />
        <button type="button" onClick={setLink} className={btn(editor.isActive('link'))}>🔗 링크</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className="px-2.5 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200">링크 제거</button>
      </div>
      <div className="p-4 bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
