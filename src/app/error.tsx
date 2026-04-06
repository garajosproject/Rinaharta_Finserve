'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Keep browser/devtools logs with the original stack for debugging.
    console.error('App route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 text-[#111]">
      <div className="mx-auto max-w-3xl rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold">Application Error</h1>
        <p className="mt-1 text-sm text-gray-600">
          The app threw an exception on this route. Details are below.
        </p>

        <div className="mt-4 rounded-md bg-[#f5f5f5] p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Message</p>
          <p className="mt-1 break-words font-mono text-sm">{error.message || 'Unknown error'}</p>
        </div>

        {error.digest && (
          <div className="mt-3 rounded-md bg-[#f5f5f5] p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Digest</p>
            <p className="mt-1 break-words font-mono text-sm">{error.digest}</p>
          </div>
        )}

        {error.stack && (
          <div className="mt-3 rounded-md bg-[#f5f5f5] p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Stack</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-700">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => reset()}
            className="rounded-md bg-[#111] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
