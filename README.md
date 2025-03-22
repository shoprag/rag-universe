# `@shoprag/rag-universe`

A RAG plugin for [ShopRAG](https://github.com/shoprag/core) that manages files within a [Universe](https://github.com/shoprag/universe) server, leveraging its vector embedding capabilities.

## Installation

```bash
npm install @shoprag/rag-universe
```

## Configuration

Add the following to the `RAGs` array in your `shoprag.json`:

```json
{
  "to": "universe",
  "config": {
    "serverUrl": "http://your-universe-server.com",
    "universe": "your-universe-name"
  }
}
```

- **`serverUrl`**: The URL of the Universe server (required).
- **`universe`**: The name of the universe to manage files in (required).

## Credentials

This plugin requires a bearer token for authentication with the Universe server. 

## Usage

The plugin integrates with ShopRAG to:
- **Add Files**: Stores new files with `fileId` as the ID and content as text.
- **Update Files**: Overwrites existing files using the same `fileId`.
- **Delete Files**: Removes files by `fileId`.
- **Delete All Files**: Clears all files in the specified universe.

Run `shoprag` to execute the pipeline, ensuring the Universe server is running and accessible.

## Prerequisites

- A running [Universe](https://github.com/shoprag/universe) server.
- Node.js with `fetch` support (v18+ recommended).

## License

This project is licensed under the MIT License.
