// Check if repository is cached and return status
import { getRepositoryByUrl, updateRepositoryAccess } from '@/lib/database'
import { ApiError } from '@/lib/types'

export async function POST(request: Request) {
  console.log('🔍 API Route: check-cache called')
  
  try {
    const { repoUrl } = await request.json()
    
    if (!repoUrl) {
      return Response.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    // Check if repository exists in cache
    const cachedRepo = await getRepositoryByUrl(repoUrl)
    
    if (!cachedRepo) {
      return Response.json({
        cached: false,
        message: 'Repository not found in cache'
      })
    }

    // Check if cache is still valid (within TTL)
    const now = new Date()
    const lastIndexed = new Date(cachedRepo.indexed_at)
    const ttlHours = cachedRepo.cache_ttl_hours || 24
    const cacheExpiry = new Date(lastIndexed.getTime() + (ttlHours * 60 * 60 * 1000))
    
    const isCacheValid = now < cacheExpiry
    const isIndexing = cachedRepo.index_status === 'indexing'
    const isCompleted = cachedRepo.index_status === 'completed'
    
    // Update access count if cache is valid and completed
    if (isCacheValid && isCompleted) {
      await updateRepositoryAccess(cachedRepo.id)
    }

    return Response.json({
      cached: isCacheValid && isCompleted,
      indexing: isIndexing,
      completed: isCompleted,
      repo: cachedRepo,
      cacheExpiry: cacheExpiry.toISOString(),
      message: isCacheValid && isCompleted 
        ? 'Repository found in cache' 
        : isIndexing 
          ? 'Repository is currently being indexed'
          : 'Repository cache has expired'
    })

  } catch (error: any) {
    console.error('❌ Error in check-cache API:', error)
    return Response.json(
      { error: 'Failed to check cache status' },
      { status: 500 }
    )
  }
}
