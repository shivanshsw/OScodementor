// Check environment variables and basic connectivity
export async function GET() {
  console.log('🔍 Checking environment variables...')
  
  const envCheck = {
    DATABASE_URL: {
      present: !!process.env.DATABASE_URL,
      value: process.env.DATABASE_URL ? '***hidden***' : 'missing',
      length: process.env.DATABASE_URL?.length || 0
    },
    ELASTICSEARCH_URL: {
      present: !!process.env.ELASTICSEARCH_URL,
      value: process.env.ELASTICSEARCH_URL || 'missing'
    },
    ELASTICSEARCH_USERNAME: {
      present: !!process.env.ELASTICSEARCH_USERNAME,
      value: process.env.ELASTICSEARCH_USERNAME || 'missing'
    },
    ELASTICSEARCH_PASSWORD: {
      present: !!process.env.ELASTICSEARCH_PASSWORD,
      value: process.env.ELASTICSEARCH_PASSWORD ? '***hidden***' : 'missing'
    },
    GITHUB_TOKEN: {
      present: !!process.env.GITHUB_TOKEN,
      value: process.env.GITHUB_TOKEN ? '***hidden***' : 'missing'
    },
    GEMINI_API_KEY: {
      present: !!process.env.GEMINI_API_KEY,
      value: process.env.GEMINI_API_KEY ? '***hidden***' : 'missing'
    }
  }
  
  const allPresent = Object.values(envCheck).every(env => env.present)
  
  console.log('Environment check results:', envCheck)
  
  return Response.json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    overall: {
      status: allPresent ? 'healthy' : 'unhealthy',
      message: allPresent ? 'All environment variables present' : 'Some environment variables missing'
    }
  })
}
