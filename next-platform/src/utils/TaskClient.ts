/* eslint-disable */
import * as Comlink from 'comlink';
import { PyodideClient } from "pyodide-worker-runner";

export let taskClient: PyodideClient;

if (typeof window !== 'undefined') {
    // Dynamic require to avoid SSR crash from sync-message accessing 'self'
    const { makeChannel } = require("sync-message");
    const channel = makeChannel({serviceWorker: {scope: "/"}});

    const WorkerProxy = () => {
        // Webpack / Next.js should handle this import
        // @ts-ignore
        return new Worker(new URL('../workers/py-worker.ts', import.meta.url));
    };

    taskClient = new PyodideClient(WorkerProxy, channel);
}

export async function runCodeTask(entry: any, outputCallback: any, inputCallback: any) {
  if (!taskClient) throw new Error("TaskClient not available (SSR)");
  
  let running = true;

  function wrappedOutputCallback(...args: any[]) {
    if (running) {
      outputCallback(...args);
    }
  }

  try {
    return await taskClient.call(
      taskClient.workerProxy.runCode,
      entry,
      Comlink.proxy(wrappedOutputCallback),
      Comlink.proxy(inputCallback),
    );
  } catch (e: any) {
    if (e.type === "InterruptError") {
      return {
        interrupted: true,
        error: null,
        passed: false,
        message_sections: [],
      }
    }
    throw e;
  } finally {
    running = false;
  }
}
