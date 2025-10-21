"use client"

import { useState } from "react"
import LandingPage from "@/components/landing-page"
import RepoConsole from "@/components/repo-console"

export default function Home() {
  const [repoUrl, setRepoUrl] = useState<string | null>(null)

  return (
    <main className="w-full h-screen bg-background">
      {!repoUrl ? (
        <LandingPage onRepoSubmit={setRepoUrl} />
      ) : (
        <RepoConsole repoUrl={repoUrl} onBack={() => setRepoUrl(null)} />
      )}
    </main>
  )
}
