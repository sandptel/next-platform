"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Plus, Users, Code, ArrowRight } from "lucide-react"
import { signOut } from "next-auth/react"

export default function DashboardClient({ user, initialGroups }: { user: any, initialGroups: any[] }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState(initialGroups)

  const handleLogout = () => signOut()

  const handleCreateGroup = async () => {
      if(!newGroupName) return
      setLoading(true)
      try {
          const res = await fetch("/api/groups", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ group_name: newGroupName })
          })
          if (res.ok) {
              const group = await res.json()
              // Optimistically update or refresh
              setGroups([...groups, { ...group, _count: { members: 1, projects: 0 }, projects: [] }])
              setShowCreateModal(false)
              setNewGroupName("")
          }
      } catch (error) { console.error(error) }
      finally { setLoading(false) }
  }

  const handleJoinGroup = async () => {
      if(!joinCode) return
      setLoading(true)
      try {
          const res = await fetch("/api/groups/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ access_code: joinCode })
          })
          if (res.ok) {
               router.refresh() // Refresh server data
               window.location.reload() // Hard reload to get new data for now
          } else {
              alert("Invalid code")
          }
      } catch (error) { console.error(error) }
      finally { setLoading(false) }
  }

  // Project creation is slightly complex as it needs a modal per group or a global one.
  // For now, let's just make the "New Project" button prompt for a name
  const handleCreateProject = async (groupId: string) => {
      const name = prompt("Enter project name:")
      if (!name) return
      try {
          const res = await fetch(`/api/groups/${groupId}/projects`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_name: name })
          })
          if (res.ok) {
              const project = await res.json()
              setGroups(groups.map(g => {
                  if (g.id === groupId) {
                      return { ...g, projects: [...g.projects, project], _count: { ...g._count, projects: g._count.projects + 1 } }
                  }
                  return g
              }))
          }
      } catch (error) { console.error(error) }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <div>
           <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">PyTogether</h1>
           <p className="text-gray-400">Welcome back, {user.email}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
           <LogOut size={18} /> Logout
        </button>
      </header>

      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Groups</h2>
            <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
                    <Plus size={18}/> Create Group
                </button>
                 <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                    Join Group
                </button>
            </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 w-96 space-y-4">
                    <h3 className="text-lg font-bold">Create Group</h3>
                    <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group Name" className="w-full bg-gray-800 p-2 rounded border border-gray-700"/>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowCreateModal(false)} className="px-3 py-1 text-gray-400">Cancel</button>
                        <button onClick={handleCreateGroup} disabled={loading} className="px-3 py-1 bg-blue-600 rounded text-white">{loading ? '...' : 'Create'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Join Modal */}
        {showJoinModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 w-96 space-y-4">
                    <h3 className="text-lg font-bold">Join Group</h3>
                    <input autoFocus value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Access Code" className="w-full bg-gray-800 p-2 rounded border border-gray-700"/>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowJoinModal(false)} className="px-3 py-1 text-gray-400">Cancel</button>
                        <button onClick={handleJoinGroup} disabled={loading} className="px-3 py-1 bg-green-600 rounded text-white">{loading ? '...' : 'Join'}</button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
                <div key={group.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-100">{group.group_name}</h3>
                        <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-400 select-all">Code: {group.access_code}</span>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-400 mb-6">
                        <div className="flex items-center gap-1"><Users size={14}/> {group._count.members} Members</div>
                        <div className="flex items-center gap-1"><Code size={14}/> {group._count.projects} Projects</div>
                    </div>

                    <div className="space-y-2">
                        {group.projects.map((p: any) => (
                            <Link href={`/ide/${group.id}/${p.id}`} key={p.id} className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition flex justify-between group">
                                <span className="text-sm">{p.project_name}</span>
                                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        ))}
                         <button onClick={() => handleCreateProject(group.id)} className="w-full py-2 text-sm text-center text-blue-400 hover:text-blue-300 border border-dashed border-gray-700 rounded-lg hover:border-blue-500/50 transition">
                            + New Project
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </section>
    </div>
  )
}
