import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { SourceMapGenerator } from 'source-map';

import { CompressOptions, CompressResult, CompressionLevel } from './types';
import { Logger } from './logger';

export class TypeScriptCompressor {
  private logger: Logger;

  constructor(verbose = false) {
    this.logger = new Logger(verbose);
  }

  compressFiles(inputPaths: string[], options: CompressOptions): CompressResult {
    this.logger.info(`Starting compression with level: ${options.level}`);

    // Resolve input files using glob
    const inputFiles = this.resolveInputFiles(inputPaths, options.excludePatterns);
    
    this.logger.info(`Found ${inputFiles.length} files to compress`);

    // Parse and transform TypeScript files
    const transformedFiles = inputFiles.map((file, index) => 
      this.compressFile(file, options, index, inputFiles.length)
    );

    // Combine or output files based on configuration
    const outputResult = this.generateOutput(transformedFiles, options);

    this.logger.info('Compression completed');
    return outputResult;
  }

  private resolveInputFiles(inputPaths: string[], excludePatterns?: string[]): string[] {
    let files: string[] = [];

    inputPaths.forEach(inputPath => {
      const stats = fs.statSync(inputPath);
      
      if (stats.isDirectory()) {
        const dirFiles = glob.sync(`${inputPath}/**/*.ts`, {
          ignore: excludePatterns || []
        });
        files = [...files, ...dirFiles];
      } else if (stats.isFile() && path.extname(inputPath) === '.ts') {
        files.push(inputPath);
      }
    });

    return files;
  }

  private compressFile(
    filePath: string, 
    options: CompressOptions, 
    currentIndex: number, 
    totalFiles: number
  ): { 
    originalContent: string, 
    transformedContent: string, 
    sourceMap?: string,
    originalPath: string
  } {
    this.logger.progress(currentIndex + 1, totalFiles, `Compressing ${path.basename(filePath)}`);

    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath, 
      sourceCode, 
      ts.ScriptTarget.Latest, 
      true
    );

    // Create source map generator
    const sourceMapGenerator = new SourceMapGenerator({
      file: path.basename(filePath)
    });

    // Transform based on compression level
    const transformedContent = this.transformSourceFile(
      sourceFile, 
      options, 
      sourceMapGenerator
    );

    return {
      originalContent: sourceCode,
      transformedContent,
      sourceMap: options.generateSourceMaps 
        ? sourceMapGenerator.toString() 
        : undefined,
      originalPath: filePath
    };
  }

  private transformSourceFile(
    sourceFile: ts.SourceFile, 
    options: CompressOptions,
    sourceMapGenerator: SourceMapGenerator
  ): string {
    const transformer = this.createTransformer(options, sourceMapGenerator);
    
    const result = ts.transform(sourceFile, [transformer]);
    const printer = ts.createPrinter({ 
      removeComments: options.level !== CompressionLevel.NONE 
    });

    return printer.printFile(result.transformed[0]);
  }

  private createTransformer(
    options: CompressOptions,
    sourceMapGenerator: SourceMapGenerator
  ): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
      return (sourceFile: ts.SourceFile): ts.SourceFile => {
        const visitor = (node: ts.Node): ts.Node => {
          // Implement compression logic based on compression level
          switch (options.level) {
            case CompressionLevel.MINIMAL:
              // Remove comments, minimal transformations
              return this.minimalCompression(node, context);
            
            case CompressionLevel.AGGRESSIVE:
              // Aggressive name shortening, more aggressive removals
              return this.aggressiveCompression(node, context);
            
            default:
              return ts.visitEachChild(node, visitor, context);
          }
        };

        return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
      };
    };
  }

  private minimalCompression(
    node: ts.Node,
    context: ts.TransformationContext
  ): ts.Node {
    if (ts.isJSDocCommentContainingNode(node) || node.kind === ts.SyntaxKind.JSDoc) {
      return node;
    }
    return ts.visitEachChild(node, child => this.minimalCompression(child, context), context);
  }

  private aggressiveCompression(
    node: ts.Node,
    context: ts.TransformationContext
  ): ts.Node {
    if (ts.isIdentifier(node) && ts.isVariableDeclaration(node.parent)) {
      // Implement variable name shortening logic
      return ts.factory.createIdentifier(this.shortenName(node.text));
    }
    return ts.visitEachChild(node, child => this.aggressiveCompression(child, context), context);
  }

  private shortenName(name: string): string {
    // Simple implementation - could be made more sophisticated
    return `_${name.length}`;
  }

  private generateOutput(
    transformedFiles: Array<{ 
      originalContent: string, 
      transformedContent: string, 
      sourceMap?: string,
      originalPath: string
    }>, 
    options: CompressOptions
  ): CompressResult {
    const outputFiles: string[] = [];
    const sourceMapFiles: string[] = [];

    const totalOriginalSize = transformedFiles.reduce(
      (sum, file) => sum + file.originalContent.length, 
      0
    );
    const totalCompressedSize = transformedFiles.reduce(
      (sum, file) => sum + file.transformedContent.length, 
      0
    );

    const outputDir = path.join(process.cwd(), 'dist');
    fs.mkdirSync(outputDir, { recursive: true });

    if (options.outputFormat === 'single') {
      // Combine all files into one
      const combinedContent = transformedFiles
        .map(file => file.transformedContent)
        .join('\n');
      
      const outputPath = path.join(outputDir, 'compressed.ts');
      fs.writeFileSync(outputPath, combinedContent);
      outputFiles.push(outputPath);

      if (options.generateSourceMaps) {
        const sourceMapPath = `${outputPath}.map`;
        fs.writeFileSync(
          sourceMapPath, 
          transformedFiles
            .map(file => file.sourceMap)
            .filter(Boolean)
            .join('\n')
        );
        sourceMapFiles.push(sourceMapPath);
      }
    } else {
      // Output multiple files with original names
      transformedFiles.forEach((file, index) => {
        const outputPath = path.join(
          outputDir, 
          path.basename(file.originalPath || `compressed_${index}.ts`)
        );
        fs.writeFileSync(outputPath, file.transformedContent);
        outputFiles.push(outputPath);

        if (options.generateSourceMaps && file.sourceMap) {
          const sourceMapPath = `${outputPath}.map`;
          fs.writeFileSync(sourceMapPath, file.sourceMap);
          sourceMapFiles.push(sourceMapPath);
        }
      });
    }

    return {
      outputFiles,
      sourceMapFiles: options.generateSourceMaps ? sourceMapFiles : undefined,
      stats: {
        originalSize: totalOriginalSize,
        compressedSize: totalCompressedSize,
        compressionRatio: 1 - (totalCompressedSize / totalOriginalSize)
      }
    };
  }
}
