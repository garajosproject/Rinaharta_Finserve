'use client'

import { ChangeEvent, useRef, useState } from 'react'
import { useUploadDoc } from '@/hooks/useLead'
import { formatFileSize } from '@/lib/lead-detail'
import { toast } from '@/components/ui/use-toast'

export default function DocumentUpload({ leadId }: { leadId: string }) {
  const { mutate, isPending } = useUploadDoc(leadId)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryFile, setRetryFile] = useState<File | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const compress = async (file: File) => {
    const image = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = (image.height / image.width) * 800

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return new Promise<File>((resolve) =>
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file)
          return
        }

        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.7)
    )
  }

  const upload = async (initialFile: File) => {
    let file = initialFile

    if (!file.type.startsWith('image/')) {
      setSelectedFile(file)
      setRetryFile(file)
      setErrorMessage('Only image uploads are supported.')
      toast({ title: 'Only image uploads are supported', variant: 'destructive' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      file = await compress(file)
    }

    setSelectedFile(file)
    setRetryFile(file)
    setErrorMessage('')
    setProgress(8)

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + 12))
    }, 160)

    mutate(file, {
      onSuccess: () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setProgress(100)
        setTimeout(() => {
          setSelectedFile(null)
          setRetryFile(null)
          setProgress(0)
        }, 500)
      },
      onError: (error) => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setProgress(0)
        setErrorMessage(error.message || 'Upload failed. Please retry.')
      },
    })
  }

  const handle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await upload(file)
  }

  return (
    <div className="rounded-md border border-dashed border-brand-200 bg-brand-50/50 p-4">
      <p className="text-sm font-semibold text-gray-900">Upload document</p>
      <p className="mt-1 text-sm text-gray-500">Image formats only. Max 2MB. Larger files are compressed automatically before upload.</p>
      <input
        type="file"
        accept="image/*"
        disabled={isPending}
        onChange={handle}
        className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
      />
      {selectedFile && (
        <div className="mt-3 rounded-md border border-black/5 bg-white p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
            <span>{selectedFile.name}</span>
            <span>{formatFileSize(selectedFile.size)}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">{isPending ? `Uploading... ${progress}%` : progress === 100 ? 'Upload complete' : 'Ready to upload'}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{errorMessage}</p>
          {retryFile && (
            <button
              type="button"
              onClick={() => upload(retryFile)}
              className="mt-2 inline-flex rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700"
            >
              Retry upload
            </button>
          )}
        </div>
      )}
    </div>
  )
}
