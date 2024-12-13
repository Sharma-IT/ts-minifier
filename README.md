# TypeScript Minifier

`ts-minifier` is an advanced TypeScript compression tool that provides flexible code minification with comprehensive configuration options.

## Features

- 🚀 Multiple Compression Levels
- 📦 Single and Multiple File Output
- 🗺️ Source Map Generation
- 🔍 Detailed Logging
- 💻 CLI and Programmatic APIs

## Installation

```bash
npm install ts-minifier
```

## CLI Usage

```bash
# Basic usage
npx ts-minifer -i src/**/*.ts

# Specify compression level
npx ts-minifer -i src -l aggressive

# Generate source maps
npx ts-minifer -i src -m

# Use configuration file
npx ts-minifer -c compress.config.json
```

## Programmatic Usage

```typescript
import { 
  TypeScriptCompressor, 
  CompressionLevel 
} from 'ts-minifier';

const compressor = new TypeScriptCompressor(true);
const result = compressor.compressFiles(['src'], {
  level: CompressionLevel.MINIMAL,
  outputFormat: 'single',
  generateSourceMaps: true
});

console.log(result.stats);
```

## Configuration Options

- `level`: Compression intensity (`none`, `minimal`, `aggressive`)
- `outputFormat`: Output style (`single`, `multiple`)
- `generateSourceMaps`: Enable/disable source map generation
- `excludePatterns`: Files/directories to ignore
- `customNamePatterns`: Custom renaming rules

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License, see [LICENSE](LICENSE) for more details.
