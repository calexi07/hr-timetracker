'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ processed: number; errors?: string[] } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); setUploadError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || 'Eroare la incarcare')
      } else {
        setResult(data)
      }
    } catch {
      setUploadError('Eroare de retea — incearca din nou')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Incarca date pontaj</h1>
        <p className="text-slate-500 mt-1">
          Incarca fisierul Excel exportat din sistemul de control acces.
          Parserul calculeaza automat orele zilnice pe baza primei intrari si ultimei iesiri.
        </p>
      </div>

      <div className="card p-5 mb-6 bg-blue-50 border-blue-100">
        <p className="text-sm font-semibold text-blue-800 mb-2">Format Excel asteptat</p>
        <div className="overflow-x-auto">
          <table className="text-xs text-blue-700 w-full">
            <thead>
              <tr className="border-b border-blue-200">
                {['Time', 'Person ID', 'Name', 'Department', '…'].map(h => (
                  <th key={h} className="text-left pb-1.5 pr-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['2026-04-01 08:05:22', '21', 'Califar Daniela', 'Krka Romania', '…'].map((v, i) => (
                  <td key={i} className="pr-4 py-1 opacity-75">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Orele = <strong>ultima pontare − prima pontare</strong> pe angajat pe zi.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'card p-10 border-2 border-dashed cursor-pointer transition-all text-center',
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        )}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet size={40} className={cn('mx-auto mb-3', isDragActive ? 'text-blue-500' : 'text-slate-300')} />
        {file ? (
          <div>
            <p className="font-medium text-slate-700">{file.name}</p>
            <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-slate-600">
              {isDragActive ? 'Elibereaza fisierul' : 'Trage fisierul .xlsx aici'}
            </p>
            <p className="text-sm text-slate-400 mt-1">sau click pentru a selecta — max 20 MB</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary"
        >
          {uploading ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
            </svg>Se proceseaza…</>
          ) : (
            <><Upload size={16} />Incarca si proceseaza</>
          )}
        </button>
        {file && (
          <button
            onClick={() => { setFile(null); setResult(null); setUploadError(null) }}
            className="btn-secondary"
          >
            <X size={16} />Anuleaza
          </button>
        )}
      </div>

      {result && (
        <div className="card p-5 mt-6 bg-green-50 border-green-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Incarcare reusita</p>
              <p className="text-sm text-green-700 mt-1">
                Au fost procesate <strong>{result.processed}</strong> inregistrari de pontaj.
              </p>
              {result.errors?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Avertismente ({result.errors.length}):</p>
                  <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="card p-5 mt-6 bg-red-50 border-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Eroare la incarcare</p>
              <p className="text-sm text-red-700 mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
