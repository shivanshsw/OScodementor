// Quick database test to see if the connection is working
import { pool } from '@/lib/database'

export async function GET() {
  console.log('🔍 Quick database test...')
  
  try {
    console.log('📝 Attempting to connect to database...')
    const client = await pool.connect()
    console.log('✅ Database connection successful')
    
    console.log('📝 Testing simple query...')
    const result = await client.query('SELECT 1 as test')
    console.log('✅ Query successful:', result.rows[0])
    
    client.release()
    console.log('✅ Client released')
    
    return Response.json({
      status: 'success',
      message: 'Database connection working',
      testResult: result.rows[0]
    })
    
  } catch (error: any) {
    console.error('❌ Database test failed:', error)
    return Response.json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
