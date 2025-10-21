// Check indexing status and progress
import { getIndexingProgress } from '@/lib/database'

export async function POST(request: Request) {
  console.log('🔍 API Route: index-status called')
  
  try {
    const { repoId } = await request.json()
    
    if (!repoId) {
      return Response.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    const progress = await getIndexingProgress(repoId)
    
    if (!progress) {
      return Response.json({
        found: false,
        message: 'No indexing progress found for this repository'
      })
    }

    return Response.json({
      found: true,
      status: progress.status,
      progress: progress.progress,
      currentStep: progress.current_step,
      totalFiles: progress.total_files,
      indexedFiles: progress.indexed_files,
      errorMessage: progress.error_message,
      startedAt: progress.started_at,
      completedAt: progress.completed_at
    })

  } catch (error: any) {
    console.error('❌ Error in index-status API:', error)
    return Response.json(
      { error: 'Failed to get indexing status' },
      { status: 500 }
    )
  }
}
