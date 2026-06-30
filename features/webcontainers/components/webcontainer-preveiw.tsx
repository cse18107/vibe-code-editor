"use client";

import React, { useEffect, useState, useRef } from "react";
import type { TemplateFolder } from "@/features/playground/libs/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import TerminalComponent from "./terminal";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { WebContainer } from "@webcontainer/api";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean; // Optional prop to force re-setup
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  writeFileSync,
  forceResetup = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  
  // Ref to access terminal methods
  const terminalRef = useRef<any>(null);

  // Manual command runner (the embedded xterm input is unreliable, so we run
  // commands directly via instance.spawn and stream output to the terminal).
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Bumping this remounts the preview iframe, forcing a fresh reload.
  const [reloadKey, setReloadKey] = useState(0);

  const runCommand = async (raw: string) => {
    const cmd = raw.trim();
    if (!instance || !cmd || running) return;
    const parts = cmd.split(/\s+/);
    setRunning(true);
    terminalRef.current?.writeToTerminal(`\r\n$ ${cmd}\r\n`);
    try {
      const proc = await instance.spawn(parts[0], parts.slice(1));
      proc.output.pipeTo(
        new WritableStream({
          write(data) {
            terminalRef.current?.writeToTerminal(data);
          },
        })
      );
      await proc.exit;
    } catch (e) {
      terminalRef.current?.writeToTerminal(
        `\r\n❌ ${(e as Error).message}\r\n`
      );
    } finally {
      setRunning(false);
    }
  };

  // Reset setup state when forceResetup changes
  useEffect(() => {
    if (forceResetup) {
      setIsSetupComplete(false);
      setIsSetupInProgress(false);
      setPreviewUrl("");
      setCurrentStep(0);
      setLoadingState({
        transforming: false,
        mounting: false,
        installing: false,
        starting: false,
        ready: false,
      });
    }
  }, [forceResetup]);

  useEffect(() => {
    async function setupContainer() {
      // Don't run setup if it's already complete or in progress
      if (!instance || isSetupComplete || isSetupInProgress) return;

      try {
        setIsSetupInProgress(true);
        setSetupError(null);
        
        // Check if server is already running by testing if files are already mounted
        try {
          const packageJsonExists = await instance.fs.readFile('package.json', 'utf8');
          if (packageJsonExists) {
            // Files are already mounted, just reconnect to existing server
            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal("🔄 Reconnecting to existing WebContainer session...\r\n");
            }
            
            // Check if server is already running
            instance.on("server-ready", (port: number, url: string) => {
              console.log(`Reconnected to server on port ${port} at ${url}`);
              if (terminalRef.current?.writeToTerminal) {
                terminalRef.current.writeToTerminal(`🌐 Reconnected to server at ${url}\r\n`);
              }
              setPreviewUrl(url);
              setLoadingState((prev) => ({
                ...prev,
                starting: false,
                ready: true,
              }));
              setIsSetupComplete(true);
              setIsSetupInProgress(false);
            });
            
            setCurrentStep(4);
            setLoadingState((prev) => ({ ...prev, starting: true }));
            return;
          }
        } catch (e) {
          // Files don't exist, proceed with normal setup
        }
        
        // Step 1: Transform data
        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);
        
        // Write to terminal
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("🔄 Transforming template data...\r\n");
        }

        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);

        setLoadingState((prev) => ({
          ...prev,
          transforming: false,
          mounting: true,
        }));
        setCurrentStep(2);

        // Step 2: Mount files
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("📁 Mounting files to WebContainer...\r\n");
        }
        
        await instance.mount(files);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("✅ Files mounted successfully\r\n");
        }

        setLoadingState((prev) => ({
          ...prev,
          mounting: false,
          installing: true,
        }));
        setCurrentStep(3);

        // Files are mounted. We intentionally do NOT auto-install dependencies
        // or auto-start a server — imported projects vary too much (static
        // sites, different scripts, build steps). The user runs commands
        // manually in the terminal below.

        // Whenever the user starts a dev server, surface it in the preview pane.
        instance.on("server-ready", (port: number, url: string) => {
          console.log(`Server ready on port ${port} at ${url}`);
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(`\r\n🌐 Server ready at ${url}\r\n`);
          }
          setPreviewUrl(url);
          setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
        });

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "\r\n✅ Files mounted. Run your project from this terminal:\r\n" +
              "   • npm install   (if the project has a package.json)\r\n" +
              "   • npm run dev   or   npm start   to launch a dev server\r\n" +
              "   • static site?   npx serve .\r\n"
          );
        }

        setLoadingState((prev) => ({
          ...prev,
          installing: false,
          starting: false,
          ready: true,
        }));
        setIsSetupComplete(true);
        setIsSetupInProgress(false);
      } catch (err) {
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        }
        
        setSetupError(errorMessage);
        setIsSetupInProgress(false);
        setLoadingState({
          transforming: false,
          mounting: false,
          installing: false,
          starting: false,
          ready: false,
        });
      }
    }

    setupContainer();
  }, [instance, templateData, isSetupComplete, isSetupInProgress]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Don't kill processes or cleanup when component unmounts
      // The WebContainer should persist across component re-mounts
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;
    
    return (
      <span className={`text-sm font-medium ${
        isComplete ? 'text-green-600' : 
        isActive ? 'text-blue-600' : 
        'text-gray-500'
      }`}>
        {label}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-5 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <div className="flex items-center gap-3 mb-2">
              {loadingState.ready ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
              <h3 className="text-sm font-semibold">
                {loadingState.ready ? "Project ready" : "Mounting project…"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Files are loaded. Run your project from the terminal below — e.g.{" "}
              <code className="px-1 rounded bg-muted">npm install</code> then{" "}
              <code className="px-1 rounded bg-muted">npm run dev</code> (or{" "}
              <code className="px-1 rounded bg-muted">npx serve .</code> for a
              static site). The preview appears here once a server starts.
            </p>
          </div>

          {/* Command bar */}
          <div className="px-4 space-y-2">
            <div className="flex gap-2">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    runCommand(command);
                    setCommand("");
                  }
                }}
                placeholder="Type a command, e.g. npm install"
                disabled={running}
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm font-mono outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="sm"
                onClick={() => {
                  runCommand(command);
                  setCommand("");
                }}
                disabled={running || !command.trim()}
              >
                <Play className="h-3.5 w-3.5 mr-1" /> Run
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => runCommand("npm install --legacy-peer-deps")}
              >
                npm install
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => runCommand("npm run dev")}
              >
                npm run dev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => runCommand("npm start")}
              >
                npm start
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => runCommand("npx -y serve .")}
              >
                npx serve
              </Button>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div
          className={
            isFullscreen
              ? "fixed inset-0 z-50 bg-background flex flex-col"
              : "h-full flex flex-col"
          }
        >
          {/* Preview header */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-muted/40">
            <span className="text-xs text-muted-foreground truncate font-mono">
              {previewUrl}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                title="Reload preview"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setIsFullscreen((f) => !f)}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 mr-1" /> Exit
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 mr-1" /> Fullscreen
                  </>
                )}
              </Button>
            </div>
          </div>

          {isFullscreen ? (
            /* Fullscreen: just the preview */
            <div className="flex-1 min-h-0">
              <iframe
                key={reloadKey}
                src={previewUrl}
                className="w-full h-full border-none"
                title="WebContainer Preview"
              />
            </div>
          ) : (
            /* Vertical split: preview on top, terminal below (drag to resize).
               Using the resizable panels gives each pane a properly bounded
               height, so the terminal stays on-screen and scrolls correctly. */
            <ResizablePanelGroup
              direction="vertical"
              className="flex-1 min-h-0"
            >
              <ResizablePanel defaultSize={60} minSize={20} className="min-h-0">
                <iframe
                  key={reloadKey}
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title="WebContainer Preview"
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={40}
                minSize={15}
                className="flex flex-col min-h-0 border-t"
              >
                {/* Command bar — the embedded terminal's input is unreliable,
                    so commands are run via this input even while live. */}
                <div className="flex gap-2 p-2 border-b bg-muted/30 shrink-0">
                  <input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        runCommand(command);
                        setCommand("");
                      }
                    }}
                    placeholder="Type a command, e.g. npm run dev"
                    disabled={running}
                    className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm font-mono outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      runCommand(command);
                      setCommand("");
                    }}
                    disabled={running || !command.trim()}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" /> Run
                  </Button>
                </div>
                <div className="flex-1 min-h-0">
                  <TerminalComponent
                    ref={terminalRef}
                    webContainerInstance={instance}
                    theme="dark"
                    className="h-full"
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;