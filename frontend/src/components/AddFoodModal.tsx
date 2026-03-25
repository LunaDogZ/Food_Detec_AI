import { useCallback, useState } from 'react'
import type { DragEvent } from 'react'
import { useFood } from '../context/FoodContext'
import { buildLogEntryFromAnalysis } from '../lib/entryFromApi'

function DropzoneIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AddFoodModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { patchState, dateKeyStr } = useFood()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const reset = useCallback(() => {
    setFile(null)
    setPreview(null)
    setStatus('')
    setBusy(false)
    setError(false)
    setDragActive(false)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const onFileChange = (f: File | null) => {
    setFile(f)
    setError(false)
    setStatus('')
    if (preview) {
      URL.revokeObjectURL(preview)
      setPreview(null)
    }
    if (f) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    }
  }

  const pickImageFile = (list: FileList | null) => {
    const f = list?.[0]
    if (!f || !f.type.startsWith('image/')) return
    onFileChange(f)
  }

  const onDropZoneDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDropZoneDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDropZoneDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDragActive(false)
  }

  const onDropZoneDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    pickImageFile(e.dataTransfer.files)
  }

  const analyze = async () => {
    if (!file) return
    setBusy(true)
    setStatus('กำลังวิเคราะห์…')
    setError(false)
    try {
      const { entry, data } = await buildLogEntryFromAnalysis(file)
      patchState((s) => {
        const key = dateKeyStr
        const arr = s.logsByDate[key] ? [...s.logsByDate[key]] : []
        arr.unshift(entry)
        return { ...s, logsByDate: { ...s.logsByDate, [key]: arr } }
      })
      if (!data.total_nutrition) {
        setStatus(String(data.message || 'บันทึกผลการสแกนแล้ว (ไม่มีข้อมูลโภชนาการจากภาพนี้)'))
        setError(false)
      } else {
        setStatus('')
      }
      handleClose()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-add-title">
      <button type="button" className="modal__backdrop" aria-label="ปิด" onClick={handleClose} />
      <div className="modal__card modal__card--add-food">
        <div className="modal__head">
          <div>
            <h3 id="modal-add-title">เพิ่มมื้ออาหาร</h3>
            <p className="modal__subtitle muted small">อัปโหลดภาพมื้อนี้ แล้วให้ AI ประเมินโภชนาการ</p>
          </div>
          <button type="button" className="icon-btn modal__close" onClick={handleClose} aria-label="ปิด">
            ×
          </button>
        </div>
        <label className="modal__drop">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(ev) => pickImageFile(ev.target.files)}
          />
          <div
            className={`modal__drop-surface${dragActive ? ' modal__drop-surface--drag' : ''}${preview ? ' modal__drop-surface--filled' : ''}`}
            onDragOver={onDropZoneDragOver}
            onDragEnter={onDropZoneDragEnter}
            onDragLeave={onDropZoneDragLeave}
            onDrop={onDropZoneDrop}
          >
            {preview ? (
              <>
                <div className="modal__drop-thumb-wrap">
                  <img src={preview} alt="" className="modal__drop-thumb" />
                </div>
                {file && <p className="modal__file-name small">{file.name}</p>}
                <p className="modal__drop-rehint muted small">คลิกหรือวางภาพใหม่เพื่อเปลี่ยน</p>
              </>
            ) : (
              <>
                <DropzoneIllustration className="modal__drop-icon" />
                <p className="modal__drop-title">
                  <strong>ลากวางภาพอาหารที่นี่</strong>
                </p>
                <p className="muted small modal__drop-line2">หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG, WebP</p>
              </>
            )}
          </div>
        </label>
        {status && <p className={`modal__status${error ? ' error' : ''}`}>{status}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary btn--modal-secondary" onClick={handleClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn--primary" onClick={analyze} disabled={!file || busy}>
            วิเคราะห์ &amp; บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}
