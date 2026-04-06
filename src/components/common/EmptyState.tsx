export default function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-md border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      <p className="text-3xl">{icon}</p>
      <h3 className="mt-3 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}
