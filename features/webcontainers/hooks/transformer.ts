interface TemplateItem {
  filename: string;
  fileExtension: string;
  content: string;
  folderName?: string;
  items?: TemplateItem[];
}

interface WebContainerFile {
  file: {
    contents: string | Uint8Array;
  };
}

// Decode a base64 data URI (e.g. "data:image/png;base64,...") to bytes so the
// WebContainer mounts it as a real binary file. Returns null if not a data URI.
function decodeDataUri(content: string): Uint8Array | null {
  const match = /^data:[^;]*;base64,(.*)$/s.exec(content);
  if (!match) return null;
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;

export function transformToWebContainerFormat(template: { folderName: string; items: TemplateItem[] }): WebContainerFileSystem {
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    if (item.folderName && item.items) {
      // This is a directory
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach(subItem => {
        const key = subItem.fileExtension 
          ? `${subItem.filename}.${subItem.fileExtension}`
          : subItem.folderName!;
        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    } else {
      // This is a file. Binary assets are stored as base64 data URIs — decode
      // them back to bytes so images/fonts mount correctly.
      const binary =
        typeof item.content === "string" ? decodeDataUri(item.content) : null;
      return {
        file: {
          contents: binary ?? item.content,
        },
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  template.items.forEach(item => {
    const key = item.fileExtension 
      ? `${item.filename}.${item.fileExtension}`
      : item.folderName!;
    result[key] = processItem(item);
  });

  return result;
}1