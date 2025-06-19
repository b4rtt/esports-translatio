# Esports Translatio

A powerful JSON translation tool designed for esports and gaming applications. Built with Next.js, OpenAI, and Tailwind CSS.

## Features

- 🌐 **Multi-language Support**: Translate JSON files to 100+ languages
- 🎮 **Esports Optimized**: Specialized for gaming and esports terminology
- 🚀 **Fast & Reliable**: Optimized for performance with timeout handling
- 📱 **Modern UI**: Beautiful, responsive interface with drag-and-drop support
- 🔧 **Smart Processing**: Preserves JSON structure, placeholders, and formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create a .env.local file in the root directory
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Translation Tool

Upload an i18n JSON file, describe your app, and pick a target language. The translated file will be downloaded automatically.

**Important Limitations:**
- Maximum 1000 JSON keys per file (to prevent timeouts)
- Files larger than this will be rejected with a helpful error message
- Translation timeout is set to 60 seconds for reliability

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Add your `OPENAI_API_KEY` environment variable in Vercel dashboard
4. Deploy!

The `vercel.json` configuration file is already set up for optimal performance with:
- 60-second function timeout for translation API
- Proper environment variable configuration

### Manual Deployment

Make sure to set the following environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to `production`

## API Reference

### POST /api/translate

Translates a JSON file to the specified language.

**Request Body:**
```json
{
  "json": "stringified JSON content",
  "language": "target language name", 
  "prompt": "application context description"
}
```

**Response:**
```json
{
  "result": "translated JSON string"
}
```

**Error Handling:**
- `408`: Translation timeout - file too large or API issues
- `413`: File too large - reduce JSON complexity
- `422`: AI translation failed - try again
- `500`: Server error

## Troubleshooting

If you encounter deployment timeouts:
1. Ensure your JSON files have fewer than 1000 keys
2. Check that your OpenAI API key is properly set
3. Verify you're using the latest deployment with timeout optimizations

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
