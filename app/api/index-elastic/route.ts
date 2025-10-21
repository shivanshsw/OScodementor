// Mocked API route for Elastic indexing
// Comment: "Simulates Elastic indexing; replace with real Elastic API later."

export async function POST(request: Request) {
  const { repoUrl } = await request.json()

  // Simulate indexing delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  return Response.json({
    message: "Elastic indexing is mocked in V0",
    repoUrl,
    status: "indexed",
  })
}
