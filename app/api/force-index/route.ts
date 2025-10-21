// Force indexing for testing
export async function POST(request: Request) {
  console.log('🔍 API Route: force-index called')
  
  try {
    const { repoUrl } = await request.json()
    
    if (!repoUrl) {
      return Response.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    // Start indexing immediately
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/index-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl })
    })

    if (!response.ok) {
      throw new Error('Failed to start indexing')
    }

    const data = await response.json()
    
    return Response.json({
      success: true,
      repoId: data.repoId,
      message: 'Indexing started successfully',
      statusUrl: `/api/index-status`
    })

  } catch (error: any) {
    console.error('❌ Error in force-index API:', error)
    return Response.json(
      { error: 'Failed to start indexing' },
      { status: 500 }
    )
  }
}
