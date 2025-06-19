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

**How It Works:**
- JSON files are automatically split into small chunks of 3 keys each
- Each chunk is translated separately in ~3-5 seconds
- No file size limits - chunking handles files of any size!
- Progress is shown in real-time as chunks are processed
- **Vercel Hobby Plan**: Works great for most files, just takes longer for huge files
- **Vercel Pro Plan ($20/month)**: Faster processing with 5-minute timeout

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. **Add environment variable in Vercel dashboard:**
   - Go to your project settings
   - Click "Environment Variables"
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Set it for "Production", "Preview", and "Development"
4. Deploy!

The `vercel.json` configuration file is set up for:
- **Hobby Plan**: 60-second function timeout (max 5 JSON keys)
- **Pro Plan**: Use `vercel-pro.json` for 300-second timeout (500+ keys)

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

## Vercel Deployment Limitations

**Vercel Hobby Plan:**
- 60-second function timeout
- Files are processed chunk by chunk (3 keys each)
- Larger files may timeout if they have too many chunks

**Vercel Pro Plan ($20/month):**
- 300-second function timeout  
- Can handle much larger files without timeout
- Recommended for production use with large translation files

**Performance:**
- Small files (< 50 keys): ~30 seconds
- Medium files (100-200 keys): Will work on Hobby plan but may timeout
- Large files (500+ keys): Recommend Pro plan or local development

**Troubleshooting:**
1. Check that your OpenAI API key is properly set in Vercel dashboard
2. Monitor Vercel function logs - you'll see "Processing chunk X/Y" progress
3. Each chunk should complete in 3-5 seconds
4. For very large files on Hobby plan, consider upgrading to Pro or use local development

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
