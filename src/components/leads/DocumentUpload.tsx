'use client'

import { ChangeEvent } from 'react'
import { useUploadDoc } from '@/hooks/useLead'
import { toast } from '@/components/ui/use-toast'

export default function DocumentUpload({ leadId }: { leadId: string }) {
  const { mutate, isPending } = useUploadDoc(leadId)

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

  const handle = async (event: ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Only image uploads are supported', variant: 'destructive' })
      return
    }

    if (file.size > 1024 * 1024) {
      file = await compress(file)
    }

    mutate(file)
  }

  return (
    <div className="rounded-md border border-dashed border-brand-200 bg-brand-50/50 p-4">
      <p className="text-sm font-semibold text-gray-900">Upload document</p>
      <p className="mt-1 text-sm text-gray-500">Images larger than 1MB are compressed automatically before upload.</p>
      <input
        type="file"
        accept="image/*"
        disabled={isPending}
        onChange={handle}
        className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
      />
    </div>
  )
}
