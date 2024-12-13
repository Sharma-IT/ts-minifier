export enum CompressionLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  AGGRESSIVE = 'aggressive'
}

export interface CompressOptions {
  level: CompressionLevel;
  outputFormat: 'single' | 'multiple';
  generateSourceMaps?: boolean;
  customNamePatterns?: RegExp[];
  excludePatterns?: string[];
  input?: string[];
}

export interface CompressResult {
  outputFiles: string[];
  sourceMapFiles?: string[];
  stats: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}
