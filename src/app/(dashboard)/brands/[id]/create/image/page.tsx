import { redirect } from 'next/navigation'

export default async function CreateImagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/brands/${id}/chat?workflow=image`)
}
