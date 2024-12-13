#!/usr/bin/env node

import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import { TypeScriptor } from './or';
import { Options, ionLevel } from './types';
import { Logger } from './logger';

const program = new commander.Command();

program
  .name('ts-minifier')
  .description('Advanced TypeScript code ion tool')
  .version('1.0.0')
  .option('-i, --input <paths...>', 'Input TypeScript files or directories')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('-l, --level <level>', 'ion level (none, minimal, aggressive)', 'minimal')
  .option('-f, --format <format>', 'Output format (single, multiple)', 'single')
  .option('-m, --source-maps', 'Generate source maps', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-c, --config <path>', 'Path to configuration file')
  .parse(process.argv);

async function main() {
  const opts = program.opts();
  const logger = new Logger(opts.verbose);

  // Load configuration from file if provided
  let config: Partial<Options> = {};
  if (opts.config) {
    try {
      const configPath = path.resolve(process.cwd(), opts.config);
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      logger.info(`Loaded configuration from ${configPath}`);
    } catch (error) {
      logger.error(`Failed to load config file: ${error}`);
      process.exit(1);
    }
  }

  // Merge CLI options with config file
  const Options: Options = {
    level: opts.level in ionLevel 
      ? ionLevel[opts.level as keyof typeof ionLevel] 
      : ionLevel.MINIMAL,
    outputFormat: opts.format === 'multiple' ? 'multiple' : 'single',
    generateSourceMaps: opts.sourceMaps || config.generateSourceMaps || false,
    excludePatterns: config.excludePatterns,
    customNamePatterns: config.customNamePatterns
  };

  // Validate input paths
  const inputPaths = opts.input || config.input || [];
  if (inputPaths.length === 0) {
    logger.error('No input files or directories specified');
    process.exit(1);
  }

  // Resolve input paths to absolute paths
  const resolvedInputPaths = inputPaths.map((p: string) => path.resolve(process.cwd(), p));

  // Ensure output directory exists
  const outputDir = path.resolve(process.cwd(), opts.output);
  fs.mkdirSync(outputDir, { recursive: true });

  // Perform ion
  const or = new TypeScriptor(opts.verbose);
  try {
    const result = or.Files(resolvedInputPaths, Options);
    
    logger.info('ion completed successfully');
    logger.info(`Original Size: ${result.stats.originalSize} bytes`);
    logger.info(`ed Size: ${result.stats.edSize} bytes`);
    logger.info(`ion Ratio: ${(result.stats.ionRatio * 100).toFixed(2)}%`);
    
    logger.info('Output Files:');
    result.outputFiles.forEach(file => logger.info(`  - ${file}`));
    
    if (result.sourceMapFiles) {
      logger.info('Source Map Files:');
      result.sourceMapFiles.forEach(file => logger.info(`  - ${file}`));
    }
  } catch (error) {
    logger.error(`ion failed: ${error}`);
    process.exit(1);
  }
}

main();
