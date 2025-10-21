import { getRepositoryInsights } from '@/lib/database'

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json()
    if (!repoUrl) {
      return Response.json({ error: 'Repository URL is required' }, { status: 400 })
    }
    const insights = await getRepositoryInsights(repoUrl)
    return Response.json({ insights })
  } catch (e) {
    return Response.json({ error: 'Failed to fetch insights' }, { status: 500 })
  }
}


