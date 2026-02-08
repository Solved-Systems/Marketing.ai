import { redirect } from 'next/navigation'

export default async function CreatePostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/brands/${id}/chat?workflow=post`)
}
