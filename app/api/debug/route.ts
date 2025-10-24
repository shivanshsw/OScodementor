// Debug endpoint to check indexing status and GitHub API
import { getIndexingProgress } from '@/lib/database'
import { getRateLimit } from '@/lib/github'

export async function GET() {
  console.log('🔍 Debug endpoint called')
  
  try {
    // Get rate limit status
    const rateLimit = await getRateLimit()
    
    return Response.json({
      timestamp: new Date().toISOString(),
      github: {
        rateLimit: rateLimit,
        tokenConfigured: !!process.env.GITHUB_TOKEN
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasDatabase: !!process.env.DATABASE_URL,
        hasElasticsearch: !!process.env.ELASTICSEARCH_URL,
        hasGemini: !!process.env.GEMINI_API_KEY
      }
    })
  } catch (error: any) {
    console.error('❌ Debug endpoint error:', error)
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { repoId } = await request.json()
    
    if (!repoId) {
      return Response.json({ error: 'Repository ID required' }, { status: 400 })
    }
    
    const progress = await getIndexingProgress(repoId)
    
    return Response.json({
      repoId,
      progress: progress || null,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Debug POST error:', error)
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
