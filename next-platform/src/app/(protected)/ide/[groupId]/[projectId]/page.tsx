"use client"

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, Edit2, Pencil, Highlighter, Eraser, Eye, EyeOff, Trash2, Send, Share2 } from "lucide-react";

// CodeMirror
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

// Y.js
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { Awareness } from 'y-protocols/awareness';

// Hooks & Components
import CodeLayout from "@/components/CodeLayout";
import { usePyRunner } from "@/hooks/usePyRunner";
import { useSharedCanvas } from "@/hooks/useSharedCanvas";
import { saveAs } from 'file-saver';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default function IDEPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const groupId = params.groupId as string;
  const projectId = params.projectId as string;
  const [projectName, setProjectName] = useState("Loading...");

  // State
  const [code, setCode] = useState('# Loading code...');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  
  // Refs
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const ytextRef = useRef<Y.Text | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const codeUndoManagerRef = useRef<Y.UndoManager | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Hooks
  const runner = usePyRunner();
  const canvas = useSharedCanvas(ydocRef, isConnected);

  // Fetch Project Info
  useEffect(() => {
     // TODO: Fetch project details to get name
     setProjectName(`Project ${projectId}`); 
     setTempName(`Project ${projectId}`);
  }, [projectId]);

  // WebSocket & Yjs
  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return;
    
    // Ensure we start with a fresh doc for this project if needed, 
    // or just reuse the ref if we want to keep it stable.
    // Actually, cleaning up old doc is good.
    if (ydocRef.current) ydocRef.current.destroy();
    ydocRef.current = new Y.Doc();

    const ydoc = ydocRef.current;
    const ytext = ydoc.getText('codetext');
    ytextRef.current = ytext;
    codeUndoManagerRef.current = new Y.UndoManager(ytext);

    // Helper to get Color
    const userColor = '#'+Math.floor(Math.random()*16777215).toString(16);

    // Dynamic Protocol (based on window protocol)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const roomName = `groups/${groupId}/projects/${projectId}`; 
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomName}`;

    // Dynamic import to avoid SSR issues with y-websocket
    import('y-websocket').then(({ WebsocketProvider }) => {
        const provider = new WebsocketProvider(wsUrl, roomName, ydoc);
        
        const awareness = provider.awareness;
        awarenessRef.current = awareness;

        provider.on('status', (event: any) => {
            console.log("WS Status:", event.status);
            setIsConnected(event.status === 'connected');
        });

        // Chat
        const ychat = ydoc.getArray<any>('chat'); // Generic type for TS
        ychat.observe(() => {
             setChatMessages(ychat.toArray());
        });

        // Awareness (Users)
        awareness.on('change', () => {
             const states = Array.from(awareness.getStates().values());
             setConnectedUsers(states.map((s: any) => s.user).filter(Boolean));
        });

        // Set local user info
        awareness.setLocalStateField('user', {
             id: session.user.id,
             email: session.user.email,
             color: userColor
        });
        
        // Save provider for cleanup
        // Note: we can't easily save it to a ref defined outside without causing issues inside the promise?
        // Let's attach it to ydoc or use a mutable var in effect closure (captured by cleanup).
        // Better: use a ref for provider if needed, or just cleanup function.
        
        // CLEANUP
        // We need to handle cleanup carefully since this is async.
        // We can assign to a ref that the cleanup function checks.
        (ydoc as any)._provider = provider;
    });

    return () => {
        // Cleanup logic
        if (ydocRef.current) {
             const doc: any = ydocRef.current;
             if (doc._provider) doc._provider.destroy();
             doc.destroy();
        }
        setIsConnected(false);
    }
  }, [groupId, projectId, session]);

  // Download Handler
  const handleDownload = (ext: string) => {
     if (!ytextRef.current) return;
     const content = ytextRef.current.toString();
     const filename = (projectName || 'main').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ext;
     
     if (ext === '.py') saveAs(new Blob([content], {type: 'text/python'}), filename);
     else if (ext === '.txt') saveAs(new Blob([content], {type: 'text/plain'}), filename);
     else if (ext === '.pdf') {
         const doc = new jsPDF();
         doc.setFontSize(10);
         doc.text(doc.splitTextToSize(content, 180), 10, 10);
         doc.save(filename);
     } else if (ext === '.docx') {
         const doc = new Document({ sections: [{ children: content.split('\n').map(l => new Paragraph({ children: [new TextRun({ text: l, font: "Courier New" })] })) }] });
         Packer.toBlob(doc).then(b => saveAs(b, filename));
     }
  };

  const sendChat = () => {
     if(!chatInput.trim()) return;
     const ychat = ydocRef.current.getArray('chat');
     ychat.push([{
        user: session?.user?.email,
        message: chatInput,
        timestamp: new Date().toISOString()
     }]);
     setChatInput("");
  };

  // UI Slots
  const headerSlot = isEditingName ? (
    <>
        <input value={tempName} onChange={e => setTempName(e.target.value)} className="bg-gray-700 text-white px-2 py-1 rounded text-center w-full" />
        <button onClick={() => { setProjectName(tempName); setIsEditingName(false); }} className="p-1 text-green-400"><Check className="h-4 w-4"/></button>
        <button onClick={() => setIsEditingName(false)} className="p-1 text-red-400"><X className="h-4 w-4"/></button>
    </>
  ) : (
    <>
        <h2 className="text-lg font-medium text-white truncate max-w-[200px]">{projectName}</h2>
        <button onClick={() => { setTempName(projectName); setIsEditingName(true); }} className="p-1 text-gray-400 hover:text-gray-200"><Edit2 className="h-4 w-4"/></button>
        <button className="p-1.5 ml-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-md transition-colors flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium hidden sm:inline">Share</span>
        </button>
    </>
  );

  const editorSlot = (
    <div ref={canvas.containerRef} className="h-full relative">
         {isConnected && ytextRef.current && awarenessRef.current && (
          <CodeMirror
             height="100%"
             className="h-full text-sm"
             theme={oneDark}
             extensions={[
               python(),
               yCollab(ytextRef.current, awarenessRef.current, { undoManager: codeUndoManagerRef.current || false })
             ]}
             onCreateEditor={(view) => { editorViewRef.current = view; }}
          />
         )}
         <canvas 
            ref={canvas.canvasRef}
            className="absolute top-0 left-0 z-10"
            style={{ 
              pointerEvents: canvas.drawingMode !== 'none' ? 'auto' : 'none',
              cursor: canvas.drawingMode !== 'none' ? 'crosshair' : 'default' 
            }}
            onMouseDown={canvas.handlers.onMouseDown}
            onMouseMove={canvas.handlers.onMouseMove}
            onMouseUp={canvas.handlers.onMouseUp}
            onMouseLeave={canvas.handlers.onMouseLeave}
          />
    </div>
  );

  const consoleSlot = runner.consoleOutput.length === 0 ? (
      <div className="text-gray-500 italic">Console output will appear here...</div>
  ) : (
      runner.consoleOutput.map(e => (
        <div key={e.id} className="flex items-start space-x-2 py-1">
            <span className="text-gray-500 text-xs mt-0.5 min-w-[60px]">{e.timestamp.toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
            <span className="text-xs mt-0.5">{e.type==='error'?'❌':e.type==='input'?'▶️':e.type==='system'?'⚙️':''}</span>
            <pre className={`flex-1 whitespace-pre-wrap break-words ${e.type === 'error' ? 'text-red-400' : e.type === 'input' ? 'text-blue-400' : e.type === 'system' ? 'text-yellow-400' : 'text-white'}`}>{e.content}</pre>
        </div>
      ))
  );

  const chatSlot = (
     <>
       {chatMessages.map((msg, i) => (
         <div key={i} className="flex flex-col space-y-1">
             <div className="flex items-baseline space-x-2">
                 <span className="text-xs font-semibold text-blue-400">{msg.user?.split('@')[0]}</span>
                 <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
             </div>
             <div className="text-sm text-gray-200">{msg.message}</div>
         </div>
       ))}
     </>
  );

  const drawingSlot = (
      <div className="flex items-center space-x-1 p-1 bg-gray-800 rounded-lg">
          <input type="color" value={canvas.drawColor} onChange={e => canvas.setDrawColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer" />
          <button onClick={() => canvas.setDrawingMode(m => m === 'draw' ? 'none' : 'draw')} className={`p-1.5 rounded ${canvas.drawingMode === 'draw' ? 'bg-blue-500 text-white' : 'hover:bg-gray-700'}`}><Pencil className="h-4 w-4"/></button>
          <button onClick={() => canvas.setDrawingMode(m => m === 'erase' ? 'none' : 'erase')} className={`p-1.5 rounded ${canvas.drawingMode === 'erase' ? 'bg-blue-500 text-white' : 'hover:bg-gray-700'}`}><Eraser className="h-4 w-4"/></button>
          <button onClick={() => canvas.setShowDrawings(!canvas.showDrawings)} className="p-1.5 hover:bg-gray-700 rounded">{canvas.showDrawings ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
          <button onClick={() => canvas.clearDrawings()} className="p-1.5 hover:bg-gray-700 rounded text-red-400"><Trash2 className="h-4 w-4"/></button>
      </div>
  );

  return (
    <CodeLayout 
        headerContent={headerSlot}
        editorContent={editorSlot}
        consoleContent={consoleSlot}
        chatContent={chatSlot}
        chatInputContent={
            <div className="p-3 border-t border-gray-700 flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} className="flex-1 bg-gray-800 rounded px-2 text-sm" placeholder="Type..." />
                <button onClick={sendChat}><Send className="h-4 w-4 text-blue-400"/></button>
            </div>
        }
        plotContent={runner.plotSrc ? <img src={runner.plotSrc} alt="Plot" className="max-w-full max-h-full" /> : null}
        inputContent={
            runner.waitingForInput && (
              <div className="border-t border-gray-700 p-2 bg-gray-800 flex gap-2">
                  <input ref={runner.inputRef} onKeyDown={e => e.key === 'Enter' && (runner.submitInput(e.currentTarget.value), e.currentTarget.value='')} className="flex-1 bg-gray-700 px-2 rounded" placeholder="Input..." />
                  <button onClick={() => runner.inputRef.current && runner.submitInput(runner.inputRef.current.value)} className="px-2 bg-blue-600 rounded">Send</button>
              </div>
            )
        }
        drawingControls={drawingSlot}
        
        onBack={() => router.push('/dashboard')}
        isConnected={isConnected}
        isLoading={runner.isLoading}
        isRunning={runner.isRunning}
        onRun={() => runner.runCode(ytextRef.current?.toString() || "")}
        onStop={runner.stopCode}
        onClearConsole={runner.clearConsole}
        connectedUsers={connectedUsers}
        onDownloadOption={handleDownload}
    />
  )
}
