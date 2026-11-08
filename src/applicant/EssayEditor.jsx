import React, { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// TipTap v3 named exports. On v2 use: import Table from '@tiptap/extension-table', etc.
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { CButton, CButtonGroup } from '@coreui/react'
import '../scss/EssayEditor.css'

// Only what the exam needs: bold/italic, lists, tables. The server sanitizer
// (EssayHtml.cs) allows the same set, so what the applicant sees is what is kept.
const Toolbar = ({ editor }) => {
  if (!editor) return null
  const run = (fn) => () => fn(editor.chain().focus()).run()
  const can = (fn) => fn(editor.can().chain().focus())
  const inTable = editor.isActive('table')

  const btn = (label, onClick, { active = false, disabled = false, title } = {}) => (
    <CButton
      key={label}
      type="button"
      size="sm"
      color="secondary"
      variant={active ? undefined : 'outline'}
      active={active}
      disabled={disabled}
      title={title ?? label}
      // mousedown preventDefault keeps the text selection while clicking the toolbar
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </CButton>
  )

  return (
    <div className="essay-editor__toolbar d-flex flex-wrap gap-2 p-2 border-bottom bg-body-tertiary">
      <CButtonGroup size="sm" role="group" aria-label="Text style">
        {btn('B', run((c) => c.toggleBold()), { active: editor.isActive('bold'), title: 'Bold' })}
        {btn('I', run((c) => c.toggleItalic()), {
          active: editor.isActive('italic'),
          title: 'Italic',
        })}
      </CButtonGroup>

      <CButtonGroup size="sm" role="group" aria-label="Lists">
        {btn('Bullets', run((c) => c.toggleBulletList()), {
          active: editor.isActive('bulletList'),
        })}
        {btn('Numbered', run((c) => c.toggleOrderedList()), {
          active: editor.isActive('orderedList'),
        })}
      </CButtonGroup>

      <CButtonGroup size="sm" role="group" aria-label="Table">
        {btn(
          'Table',
          run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
          { disabled: inTable, title: 'Insert a 3 × 3 table' },
        )}
        {inTable && (
          <>
            {btn('+ Row', run((c) => c.addRowAfter()), {
              disabled: !can((c) => c.addRowAfter()),
              title: 'Add row below',
            })}
            {btn('+ Col', run((c) => c.addColumnAfter()), {
              disabled: !can((c) => c.addColumnAfter()),
              title: 'Add column to the right',
            })}
            {btn('− Row', run((c) => c.deleteRow()), {
              disabled: !can((c) => c.deleteRow()),
              title: 'Delete row',
            })}
            {btn('− Col', run((c) => c.deleteColumn()), {
              disabled: !can((c) => c.deleteColumn()),
              title: 'Delete column',
            })}
            {btn('Delete table', run((c) => c.deleteTable()), { title: 'Delete the whole table' })}
          </>
        )}
      </CButtonGroup>
    </div>
  )
}

/**
 * value    – the saved HTML string ('' when empty). Only read as the INITIAL content:
 *            the editor owns its state while mounted (re-setting content on every
 *            keystroke would make the cursor jump).
 * onChange – called with the HTML string, or '' when the editor is empty.
 */
const EssayEditor = ({ value, onChange, ariaLabel }) => {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      // Links are off: the exam has no use for them and the sanitizer drops them anyway.
      StarterKit.configure({ link: false }),
      Table.configure({ resizable: false }), // resizing adds inline styles the sanitizer strips
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    shouldRerenderOnTransaction: true, // keeps the toolbar's active states current
    editorProps: {
      attributes: {
        class: 'essay-editor__content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel ?? 'Essay answer',
      },
      // Uncomment to block pasting text from outside the editor (anti-cheating).
      // handlePaste: () => true,
      // handleDrop: () => true,
    },
    onUpdate: ({ editor: ed }) => {
      // An empty doc serialises to '<p></p>'; send '' so "unanswered" stays unanswered.
      onChangeRef.current(ed.isEmpty ? '' : ed.getHTML())
    },
  })

  return (
    <div className="essay-editor border rounded">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

export default EssayEditor
