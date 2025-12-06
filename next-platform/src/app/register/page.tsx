"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" }
      })
      
      if (res.ok) {
        router.push("/login")
      } else {
        const data = await res.json()
        setError(data.error || "Registration failed")
      }
    } catch (err) {
      setError("An error occurred")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        {error && <div className="p-3 bg-red-500/20 text-red-500 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required 
                 className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required 
                 className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 outline-none" />
          <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 rounded font-semibold transition">Register</button>
        </form>
         <div className="text-center text-sm text-gray-400">
            Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  )
}
