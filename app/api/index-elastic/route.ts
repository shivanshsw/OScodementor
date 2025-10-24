

export async function POST(request: Request) {
  const { repoUrl } = await request.json()

  // Simulate indexing delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  return Response.json({
    repoUrl,
    status: "indexed",
  })
}
