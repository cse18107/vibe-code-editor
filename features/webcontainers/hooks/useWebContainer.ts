import { useState, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { TemplateFolder } from '@/features/playground/libs/path-to-json';

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void; // Added destroy function
}

// WebContainer allows only ONE booted instance per page. Keep a module-level
// singleton (and boot promise) so re-mounts / HMR / navigation reuse it instead
// of calling boot() again (which throws "Only a single WebContainer instance
// can be booted").
let webcontainerSingleton: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

function bootWebContainer(): Promise<WebContainer> {
  if (webcontainerSingleton) return Promise.resolve(webcontainerSingleton);
  if (!bootPromise) {
    bootPromise = WebContainer.boot()
      .then((inst) => {
        webcontainerSingleton = inst;
        return inst;
      })
      .catch((err) => {
        bootPromise = null; // allow a retry after a failed boot
        throw err;
      });
  }
  return bootPromise;
}

export const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        const webcontainerInstance = await bootWebContainer();

        if (!mounted) return;

        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize WebContainer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
      // Do NOT teardown the shared singleton on unmount — other mounts reuse it.
    };
  }, []);

  const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
    if (!instance) {
      throw new Error('WebContainer instance is not available');
    }

    try {
      // Ensure the folder structure exists
      const pathParts = path.split('/');
      const folderPath = pathParts.slice(0, -1).join('/'); // Extract folder path

      if (folderPath) {
        await instance.fs.mkdir(folderPath, { recursive: true }); // Create folder structure recursively
      }

      // Write the file
      await instance.fs.writeFile(path, content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
      console.error(`Failed to write file at ${path}:`, err);
      throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
    }
  }, [instance]);

  // Added destroy function
  const destroy = useCallback(() => {
    if (webcontainerSingleton) {
      webcontainerSingleton.teardown();
      webcontainerSingleton = null;
      bootPromise = null;
    }
    setInstance(null);
    setServerUrl(null);
  }, []);

  return { serverUrl, isLoading, error, instance, writeFileSync, destroy };
};