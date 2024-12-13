import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptCompressor } from '../compressor';
import { CompressionLevel } from '../types';

describe('TypeScriptCompressor', () => {
  let compressor: TypeScriptCompressor;
  const testDir = path.join(__dirname, 'test-files');

  beforeEach(() => {
    compressor = new TypeScriptCompressor(false);
    
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  const createTestFile = (filename: string, content: string) => {
    fs.writeFileSync(path.join(testDir, filename), content);
  };

  test('compresses single file with minimal settings', () => {
    createTestFile('sample.ts', `
      // This is a comment
      const longVariableName = 'Hello World';
      function longFunctionName() {
        console.log(longVariableName);
      }
      longFunctionName();
    `);

    const result = compressor.compressFiles([testDir], {
      level: CompressionLevel.MINIMAL,
      outputFormat: 'single'
    });

    expect(result.outputFiles.length).toBe(1);
    expect(result.stats.compressionRatio).toBeGreaterThan(0);

    const compressedContent = fs.readFileSync(result.outputFiles[0], 'utf-8');
    expect(compressedContent).not.toContain('// This is a comment');
  });

  test('compresses multiple files with aggressive settings', () => {
    createTestFile('file1.ts', `
      const complexVariableName = 'First File';
      export function complexFunctionName() {
        return complexVariableName;
      }
    `);

    createTestFile('file2.ts', `
      const anotherComplexVariable = 'Second File';
      export function anotherComplexFunction() {
        return anotherComplexVariable;
      }
    `);

    const result = compressor.compressFiles([testDir], {
      level: CompressionLevel.AGGRESSIVE,
      outputFormat: 'multiple',
      generateSourceMaps: true
    });

    expect(result.outputFiles.length).toBe(2);
    expect(result.sourceMapFiles?.length).toBe(2);
    expect(result.stats.compressionRatio).toBeGreaterThan(0);
  });

  test('handles source map generation', () => {
    createTestFile('sourcemap.ts', `
      function originalFunction() {
        const originalVariable = 'Test';
        return originalVariable;
      }
    `);

    const result = compressor.compressFiles([testDir], {
      level: CompressionLevel.MINIMAL,
      outputFormat: 'single',
      generateSourceMaps: true
    });

    expect(result.sourceMapFiles?.length).toBe(1);
    
    const sourceMapContent = fs.readFileSync(result.sourceMapFiles![0], 'utf-8');
    expect(sourceMapContent).toBeTruthy();
  });

  test('excludes specified files', () => {
    createTestFile('include.ts', `
      const includeVar = 'Include Me';
    `);

    createTestFile('exclude.ts', `
      const excludeVar = 'Exclude Me';
    `);

    const result = compressor.compressFiles([testDir], {
      level: CompressionLevel.MINIMAL,
      outputFormat: 'multiple',
      excludePatterns: ['**/exclude.ts']
    });

    const outputFileNames = result.outputFiles.map(f => path.basename(f));
    expect(outputFileNames).toContain('include.ts');
    expect(outputFileNames).not.toContain('exclude.ts');
  });
});
