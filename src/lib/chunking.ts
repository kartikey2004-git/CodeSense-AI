// Production-grade text chunking utility for code embeddings

// Chunking configuration
export const CHUNK_CONFIG = {
  // Optimal chunk sizes for code (based on testing)
  DEFAULT_CHUNK_SIZE: 1800, // characters
  DEFAULT_OVERLAP: 250, // characters
  MIN_CHUNK_SIZE: 200, // minimum to avoid tiny chunks
  MAX_CHUNK_SIZE: 4000, // maximum to avoid embedding limits

  // Language-specific patterns
  PATTERNS: {
    // JavaScript/TypeScript
    JAVASCRIPT: [
      /\b(?:function|class|const|let|var|if|for|while|switch|try|catch)\b/g,
      /\b(?:export|import|default|async|await)\b/g,
      /(?:\{|\}|\(|\)|;|\s{2,})/g,
    ],

    // Python
    PYTHON: [
      /\b(?:def|class|if|for|while|try|except|with|import|from)\b/g,
      /(?:\{|\}|\(|\)|:|\s{2,})/g,
    ],

    // Generic code patterns
    GENERIC: [
      /\n\s*\n/g, // Empty lines
      /\n\s*\/\/.*$/gm, // Single-line comments
      /\n\s*\/\*[\s\S]*?\*\/\n/g, // Multi-line comments
      /\n\s*#.*$/gm, // Hash comments
      /\s{2,}/g, // Multiple spaces
    ],
  },
} as const;

// Chunk metadata interface
export interface ChunkMetadata {
  filePath: string;
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
  language?: string;
  functionName?: string;
  className?: string;
  sectionType?: "function" | "class" | "import" | "comment" | "general";
}

// Chunk result interface
export interface TextChunk {
  content: string;
  metadata: ChunkMetadata;
}

// Language detection based on file extension
export function detectLanguageFromExtension(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: "JAVASCRIPT",
    jsx: "JAVASCRIPT",
    ts: "JAVASCRIPT",
    tsx: "JAVASCRIPT",
    py: "PYTHON",
    java: "JAVA",
    cpp: "CPP",
    c: "C",
    cs: "CSHARP",
    go: "GO",
    rs: "RUST",
    php: "PHP",
    rb: "RUBY",
    swift: "SWIFT",
    kt: "KOTLIN",
    scala: "SCALA",
    sh: "SHELL",
    bash: "SHELL",
    zsh: "SHELL",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    scss: "CSS",
    sass: "CSS",
    less: "CSS",
    json: "JSON",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
    md: "MARKDOWN",
    txt: "TEXT",
  };

  return languageMap[ext || ""] || "TEXT";
}

// Basic character-based chunking with overlap
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE,
  overlap: number = CHUNK_CONFIG.DEFAULT_OVERLAP,
): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  // Adjust parameters if needed
  const effectiveChunkSize = Math.max(
    CHUNK_CONFIG.MIN_CHUNK_SIZE,
    Math.min(CHUNK_CONFIG.MAX_CHUNK_SIZE, chunkSize),
  );

  const effectiveOverlap = Math.min(
    overlap,
    Math.floor(effectiveChunkSize / 2),
  );

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + effectiveChunkSize, text.length);
    let chunk = text.substring(start, end);

    // Try to break at natural boundaries
    if (end < text.length) {
      const breakPoint = findNaturalBreakPoint(chunk);
      if (breakPoint > effectiveChunkSize * 0.7) {
        // Don't make chunks too small
        chunk = chunk.substring(0, breakPoint);
      }
    }

    chunks.push(chunk.trim());

    // Move start position with overlap
    start = start + chunk.length - effectiveOverlap;

    // Prevent infinite loop
    if (start >= text.length - effectiveOverlap) {
      break;
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

// Find natural break points in text (end of sentence, paragraph, etc.)
function findNaturalBreakPoint(text: string): number {
  const breakPoints = [
    /\n\s*\n/, // Paragraph breaks
    /\n[^\s]/, // Line breaks
    /[.!?]\s+/, // Sentence endings
    /[;,\]\})]\s+/, // Code statement endings
  ];

  let bestBreak = text.length;

  for (const pattern of breakPoints) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      bestBreak = Math.min(bestBreak, match.index + match[0].length);
    }
  }

  return bestBreak;
}

// Language-aware chunking for code
export function chunkCode(
  text: string,
  filePath: string,
  chunkSize: number = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE,
  overlap: number = CHUNK_CONFIG.DEFAULT_OVERLAP,
): TextChunk[] {
  const language = detectLanguageFromExtension(filePath);
  const chunks: TextChunk[] = [];

  // For now, use basic chunking with language metadata
  // TODO: Implement AST-based chunking for JavaScript/TypeScript
  const textChunks = chunkText(text, chunkSize, overlap);

  textChunks.forEach((content, index) => {
    const metadata: ChunkMetadata = {
      filePath,
      chunkIndex: index,
      totalChunks: textChunks.length,
      startChar: 0, // TODO: Calculate actual positions
      endChar: content.length,
      language,
      sectionType: "general",
    };

    // Try to extract function/class names for JavaScript/TypeScript
    if (language === "JAVASCRIPT") {
      const functionMatch = content.match(/(?:function|const|let|var)\s+(\w+)/);
      if (functionMatch) {
        metadata.functionName = functionMatch[1];
        metadata.sectionType = "function";
      }

      const classMatch = content.match(/class\s+(\w+)/);
      if (classMatch) {
        metadata.className = classMatch[1];
        metadata.sectionType = "class";
      }

      const importMatch = content.match(/import\s+.*from\s+['"](.+)['"]/);
      if (importMatch) {
        metadata.sectionType = "import";
      }
    }

    chunks.push({ content, metadata });
  });

  return chunks;
}

// Smart chunking that combines language-aware and semantic approaches
export function smartChunkText(
  text: string,
  filePath: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    preserveStructure?: boolean;
  } = {},
): TextChunk[] {
  const {
    chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE,
    overlap = CHUNK_CONFIG.DEFAULT_OVERLAP,
    preserveStructure = true,
  } = options;

  // If text is small, return as single chunk
  if (text.length <= chunkSize) {
    return [
      {
        content: text.trim(),
        metadata: {
          filePath,
          chunkIndex: 0,
          totalChunks: 1,
          startChar: 0,
          endChar: text.length,
          language: detectLanguageFromExtension(filePath),
          sectionType: "general",
        },
      },
    ];
  }

  // Use language-aware chunking for code files
  const isCodeFile =
    /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|go|rs|php|rb|swift|kt|scala|sh|bash|zsh|sql)$/i.test(
      filePath,
    );

  if (isCodeFile && preserveStructure) {
    return chunkCode(text, filePath, chunkSize, overlap);
  }

  // Fall back to basic chunking for other files
  const chunks = chunkText(text, chunkSize, overlap);

  return chunks.map((content, index) => ({
    content: content.trim(),
    metadata: {
      filePath,
      chunkIndex: index,
      totalChunks: chunks.length,
      startChar: 0, // TODO: Calculate actual positions
      endChar: content.length,
      language: detectLanguageFromExtension(filePath),
      sectionType: "general",
    },
  }));
}

// Utility to merge overlapping chunks for context assembly
export function mergeOverlappingChunks(
  chunks: TextChunk[],
  maxTokens: number = 8000,
): string {
  // Simple concatenation with deduplication
  const seenContent = new Set<string>();
  const mergedContent: string[] = [];

  for (const chunk of chunks) {
    const content = chunk.content.trim();
    if (!seenContent.has(content)) {
      seenContent.add(content);
      mergedContent.push(content);
    }
  }

  const combined = mergedContent.join("\n\n---\n\n");

  // Token-based truncation (rough estimate: 1 token ≈ 4 characters)
  if (combined.length > maxTokens * 4) {
    return combined.substring(0, maxTokens * 4) + "\n\n[...truncated...]";
  }

  return combined;
}

// Calculate chunk statistics for monitoring
export function calculateChunkStats(chunks: TextChunk[]) {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgChunkSize: 0,
      minChunkSize: 0,
      maxChunkSize: 0,
      totalCharacters: 0,
    };
  }

  const sizes = chunks.map((c) => c.content.length);
  const totalCharacters = sizes.reduce((sum, size) => sum + size, 0);

  return {
    totalChunks: chunks.length,
    avgChunkSize: Math.round(totalCharacters / chunks.length),
    minChunkSize: Math.min(...sizes),
    maxChunkSize: Math.max(...sizes),
    totalCharacters,
  };
}

// Validation utilities with enhanced fallback for small files
export function validateChunk(chunk: TextChunk): boolean {
  const { content, metadata } = chunk;

  // Basic validation
  if (!content || content.trim().length === 0) {
    return false;
  }

  if (content.length > CHUNK_CONFIG.MAX_CHUNK_SIZE) {
    return false;
  }

  // Enhanced validation: allow smaller chunks for config files and important small files
  const isConfigFile =
    /\.(gitignore|env|json|yaml|yml|toml|ini|conf|config|md|txt)$/i.test(
      metadata.filePath,
    );
  const isImportantFile =
    /(readme|license|changelog|contributing|security|authors|requirements)/i.test(
      metadata.filePath,
    );

  // Dynamic minimum size based on file type
  let minSize: number = 200; // Default minimum

  if (isConfigFile || isImportantFile) {
    minSize = 5; // Very small minimum for config/docs
  } else if (metadata.language === "TEXT" || metadata.language === "MARKDOWN") {
    minSize = 20; // Lower minimum for text files
  }

  if (content.length < minSize) {
    console.log(
      `Small chunk analysis: ${metadata.filePath} (${content.length} chars, type: ${isConfigFile ? "config" : isImportantFile ? "important" : "code"}, language: ${metadata.language})`,
    );

    // Allow very small config and important files
    if (isConfigFile || isImportantFile) {
      return true;
    }

    // For code files, be more lenient if they contain meaningful content
    const hasMeaningfulContent = /\w+/.test(content) && content.length > 10;
    return hasMeaningfulContent;
  }

  // Metadata validation
  if (
    !metadata.filePath ||
    metadata.chunkIndex < 0 ||
    metadata.totalChunks <= 0
  ) {
    return false;
  }

  return true;
}

export function validateChunks(chunks: TextChunk[]): {
  valid: TextChunk[];
  invalid: TextChunk[];
  stats: ReturnType<typeof calculateChunkStats>;
} {
  const valid: TextChunk[] = [];
  const invalid: TextChunk[] = [];

  chunks.forEach((chunk) => {
    if (validateChunk(chunk)) {
      valid.push(chunk);
    } else {
      invalid.push(chunk);
    }
  });

  return {
    valid,
    invalid,
    stats: calculateChunkStats(valid),
  };
}
