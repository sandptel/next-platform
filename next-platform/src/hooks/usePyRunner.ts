import { useState, useEffect, useRef, useCallback } from "react";
import { runCodeTask, taskClient } from "../utils/TaskClient";

export interface ConsoleEntry {
    id: number;
    content: string;
    type: 'output' | 'error' | 'input' | 'system';
    timestamp: Date;
}

export function usePyRunner() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleEntry[]>([]);
  const [plotSrc, setPlotSrc] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  // Terminal ref to hold non-react state callbacks if needed, or just closures
  
  const clearConsole = useCallback(() => {
    setConsoleOutput([]);
    setPlotSrc(null);
  }, []);

  const addConsoleEntry = useCallback((content: string, type: 'output' | 'error' | 'input' | 'system' = 'output') => {
    setConsoleOutput(prev => [...prev, { id: Date.now() + Math.random(), content, type, timestamp: new Date() }]);
  }, []);

  // Initialize Pyodide
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!mounted) return;
      setIsLoading(true);
      addConsoleEntry("Loading Python interpreter...", "system");
      try {
        await taskClient.call(taskClient.workerProxy.init);
        if(mounted) addConsoleEntry("Interpreter loaded.", "system");
      } catch (err: any) {
        if(mounted) {
            addConsoleEntry(`Failed to load: ${err.message}`, "error");
            addConsoleEntry(`Please refresh your page.`, "error");
        }
      } finally {
        if(mounted) setIsLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [addConsoleEntry]);

  const runCode = async (codeString: string) => {
    // Double check state to prevent race conditions
    if (isLoading || isRunning) {
        addConsoleEntry("System is busy...", "system");
        return;
    }
    
    setIsRunning(true);
    setErrorLine(null);
    setPlotSrc(null);
    addConsoleEntry(">>> Running...", "input");
    
    try {
      await runCodeTask(
        { input: codeString },
        (parts: any) => {
             // Stdout callback
             parts.forEach((part: any) => {
                if (part.type === 'show_image') {
                    setPlotSrc(`data:image/${part.format};base64,${part.data}`);
                } else if (part.type === 'input_prompt') {
                    addConsoleEntry(part.text, "system");
                    setWaitingForInput(true);
                } else if (part.type === 'internal_error') {
                    addConsoleEntry(part.text, "error");
                    const matches = [...part.text.matchAll(/File "\/main\.py", line (\d+)/g)];
                    if (matches.length > 0) {
                        const lastMatch = matches[matches.length - 1];
                        setErrorLine(parseInt(lastMatch[1]));
                    }
                } else {
                    addConsoleEntry(part.text, "output");
                }
             });
        },
        () => {
            // Focus callback
            inputRef.current?.focus();
        }
      );
      // Only show completed if we didn't end up waiting for input (which keeps us running)
      // Actually, if runCodeTask returns, we are done unless interrupted.
      addConsoleEntry(">>> Completed", "system");
    } catch (err: any) {
      if (err.type === "InterruptError") {
          addConsoleEntry(">>> Interrupted", "system");
      } else if (err.message && err.message.includes("State is running")) {
          addConsoleEntry("Error: System is busy (State mismatch). Retrying reset...", "error");
          // Optionally force reset or just let the user try again after a moment
      } else {
          addConsoleEntry(err.toString(), "error");
      }
    } finally {
      setIsRunning(false);
      setWaitingForInput(false); 
    }
  };

  const stopCode = async () => {
    addConsoleEntry(">>> Sending interrupt...", "system");
    await taskClient.interrupt();
    // The runCode functionality will handle the rejection/completion and clear isRunning
  };

  const submitInput = async (value: string) => {
    if (!waitingForInput) return;
    addConsoleEntry(value, "input");
    setWaitingForInput(false);
    await taskClient.writeMessage(value);
  };

  return {
    isLoading,
    isRunning,
    waitingForInput,
    consoleOutput,
    plotSrc,
    errorLine,
    inputRef,
    runCode,
    stopCode,
    submitInput,
    setConsoleOutput,
    clearConsole
  };
}
