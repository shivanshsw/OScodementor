// Admin API for getting all indexed repositories
import { getAllIndexedRepositories } from '@/lib/database'

export async function GET() {
  console.log('🔍 API Route: admin/repositories called')
  
  try {
    const repositories = await getAllIndexedRepositories()
    
    console.log(`✅ Retrieved ${repositories.length} repositories for admin`)
    
    return Response.json(repositories)
  } catch (error: any) {
    console.error('❌ Error in admin/repositories API:', error)
    return Response.json(
      { error: 'Failed to get repositories' },
      { status: 500 }
    )
  }
}
