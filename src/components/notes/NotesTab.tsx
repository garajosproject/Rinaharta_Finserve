'use client'

import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { useAddNote } from '@/hooks/useLead'
import type { LeadNote } from '@/types/lead'

export default function NotesTab({
  leadId,
  notes,
}: {
  leadId: string
  notes: LeadNote[]
}) {
  const [message, setMessage] = useState('')
  const { mutate, isPending } = useAddNote(leadId)
  const orderedNotes = useMemo(() => [...notes], [notes])

  return (
    <div className="flex flex-col">
      <div className="max-h-[420px] min-h-[200px] flex-1 space-y-4 overflow-y-auto p-4">
        {orderedNotes.map((note) => (
          <div key={note.id} className="rounded-md border border-black/5 bg-[#faf7f7] p-4">
            <p className="text-sm text-gray-700">{note.text}</p>
            <p className="mt-2 text-xs text-gray-400">{note.author} · {note.time}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-gray-100 p-4">
        <div className="flex gap-2">
          <input
            className="w-full rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Add a note..."
          />
          <button
            disabled={!message.trim() || isPending}
            onClick={() =>
              mutate(message, {
                onSuccess: () => setMessage(''),
              })
            }
            className="rounded-md bg-brand-500 p-2.5 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
