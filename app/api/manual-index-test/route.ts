// Manual test of the indexing process
import { createRepository, updateRepositoryStatus } from '@/lib/database'
import { fetchCompleteRepositoryData } from '@/lib/github'

export async function GET() {
  console.log('🔍 Manual indexing test...')
  
  try {
    // Create a test repository
    console.log('📝 Creating test repository...')
    const testRepo = {
      repo_url: 'https://github.com/octocat/Hello-World',
      repo_name: 'Hello-World',
      repo_owner: 'octocat',
      repo_description: 'Test repository for manual indexing',
      repo_stars: 0,
      repo_language: null,
      repo_languages: [],
      repo_default_branch: 'main',
      repo_updated_at: new Date().toISOString(),
      index_status: 'pending' as const,
      index_progress: 0,
      total_files: 0,
      indexed_files: 0,
      error_message: null,
      cache_ttl_hours: 24,
      is_popular: false
    }
    
    const repo = await createRepository(testRepo)
    console.log('✅ Test repository created:', repo.id)
    
    // Test status update
    console.log('📝 Testing status update...')
    await updateRepositoryStatus(repo.id, 'indexing', 5, 'Manual test - fetching from GitHub...')
    console.log('✅ Status update successful')
    
    // Test GitHub API
    console.log('📝 Testing GitHub API...')
    const repoData = await fetchCompleteRepositoryData('https://github.com/octocat/Hello-World')
    console.log('✅ GitHub API successful:', repoData.name, 'Files:', repoData.files?.length || 0)
    
    // Update progress
    console.log('📝 Updating progress...')
    await updateRepositoryStatus(repo.id, 'indexing', 20, 'Manual test - analyzing structure...')
    console.log('✅ Progress update successful')
    
    // Complete
    console.log('📝 Marking as completed...')
    await updateRepositoryStatus(repo.id, 'completed', 100, 'Manual test completed')
    console.log('✅ Completion successful')
    
    return Response.json({
      status: 'success',
      message: 'Manual indexing test completed successfully',
      repositoryId: repo.id,
      repositoryData: {
        name: repoData.name,
        filesCount: repoData.files?.length || 0,
        stars: repoData.stars
      }
    })
    
  } catch (error: any) {
    console.error('❌ Manual indexing test failed:', error)
    return Response.json({
      status: 'error',
      message: 'Manual indexing test failed',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
