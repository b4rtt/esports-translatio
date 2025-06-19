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

**Important Limitations (Vercel Hobby Plan):**
- Maximum 5 JSON keys per file (due to 60-second Vercel Hobby limit)
- Files larger than this will be rejected with a helpful error message
- Translation timeout is set to 45 seconds per request (60 seconds total)
- **To translate larger files, upgrade to Vercel Pro plan ($20/month)**
- Local development supports much larger files

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Add your `OPENAI_API_KEY` environment variable in Vercel dashboard
4. Deploy!

The `vercel.json` configuration file is already set up for optimal performance with:
- 5-minute function timeout for translation API (300 seconds)
- 2-minute timeout per OpenAI request (120 seconds)
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

## Vercel Deployment Limitations

**Vercel Hobby Plan:**
- Maximum 5 JSON keys per file
- 60-second function timeout
- Free tier limitations

**Vercel Pro Plan ($20/month):**
- Maximum 500+ JSON keys per file
- 300-second function timeout
- Much better for larger translations

**Workarounds for Hobby Plan:**
1. **Split large JSON files** into smaller chunks of 5 keys each
2. **Use local development** for larger files (`npm run dev`)
3. **Upgrade to Vercel Pro** for production use
4. **Use the app multiple times** - translate 5 keys at a time and merge results

**Troubleshooting:**
1. Ensure your JSON files have max 5 keys for Hobby plan
2. Check that your OpenAI API key is properly set in Vercel dashboard
3. Monitor Vercel function logs for timeout issues
4. Consider local development for larger files

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
