// Admin API for clearing repository cache
import { clearRepositoryCache } from '@/lib/database'
import { deleteRepositoryFromIndex } from '@/lib/elasticsearch'

export async function POST(request: Request) {
  console.log('🔍 API Route: admin/clear-cache called')
  
  try {
    const { repoId } = await request.json()
    
    if (!repoId) {
      return Response.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    // Clear from database
    await clearRepositoryCache(repoId)
    
    // Clear from Elasticsearch
    try {
      await deleteRepositoryFromIndex(repoId)
    } catch (elasticError) {
      console.error('Error clearing from Elasticsearch:', elasticError)
      // Don't fail the request if Elasticsearch fails
    }
    
    console.log(`✅ Cleared cache for repository: ${repoId}`)
    
    return Response.json({
      success: true,
      message: 'Repository cache cleared successfully'
    })
  } catch (error: any) {
    console.error('❌ Error in admin/clear-cache API:', error)
    return Response.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
