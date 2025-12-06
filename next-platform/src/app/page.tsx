import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
       <div className="max-w-3xl text-center space-y-8">
           <h1 className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                PyTogether
           </h1>
           <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Real-time Collaborative Python IDE. Code together, execute instantly, and visualize output in your browser.
           </p>
           
           <div className="flex gap-4 justify-center mt-8">
               <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-500/20">
                    Get Started
               </Link>
               <Link href="/about" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-lg transition">
                    Learn More
               </Link>
           </div>
           
           <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
               <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                   <h3 className="text-xl font-bold mb-2">Real-time Sync</h3>
                   <p className="text-gray-400">Collaborate with your team with live cursors and instant updates powered by Yjs.</p>
               </div>
               <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                   <h3 className="text-xl font-bold mb-2">Live Execution</h3>
                   <p className="text-gray-400">Run Python code directly in your browser with Pyodide WebAssembly.</p>
               </div>
               <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                   <h3 className="text-xl font-bold mb-2">Interactive Output</h3>
                   <p className="text-gray-400">View plots, text output, and handle user input seamlessly.</p>
               </div>
           </div>
       </div>
    </div>
  )
}
