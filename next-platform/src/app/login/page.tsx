"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })
      if (res?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An error occurred")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-2xl font-bold text-center">Sign In</h2>
        {error && <div className="p-3 bg-red-500/20 text-red-500 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required 
                 className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required 
                 className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none" />
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition">Sign In</button>
        </form>
        <div className="text-center text-sm text-gray-400">
            Don't have an account? <Link href="/register" className="text-blue-400 hover:underline">Register</Link>
        </div>
      </div>
    </div>
  )
}
