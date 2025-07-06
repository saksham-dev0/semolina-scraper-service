# Scraper Microservice

A web scraping microservice built with Node.js, Puppeteer, and OpenAI for extracting business information from websites.

## Features

- **Puppeteer-based scraping**: Handles JavaScript-heavy and dynamic websites
- **OpenAI GPT-4 integration**: Intelligent content analysis and structuring
- **Business information extraction**: Services, pricing, testimonials, contact info
- **RESTful API**: Simple HTTP endpoints for integration

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

3. Start the development server:
```bash
npm run dev
```

4. Test the service:
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Deployment on Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` configuration
4. The service will build and deploy automatically

### Option 2: Manual Configuration

1. Create a new Web Service on Render
2. Connect your Git repository
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NODE_ENV`: `production`
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `false`

## Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key for content analysis
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `PORT`: Server port (default: 3001)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: Set to "false" to ensure Chrome is downloaded

## API Endpoints

### Health Check
```
GET /health
```

### Scrape Website
```
POST /api/scrape
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "Website Title",
    "description": "Website description",
    "metadata": {
      "keywords": [],
      "author": null,
      "publishedDate": null
    },
    "businessInfo": {
      "name": "Business Name",
      "description": "Business description",
      "services": ["Service 1", "Service 2"],
      "contactInfo": {
        "email": "contact@example.com",
        "phone": "+1234567890",
        "address": null
      },
      "pricing": "Pricing information",
      "testimonials": ["Testimonial 1", "Testimonial 2"]
    },
    "scrapedAt": "2025-07-06T11:27:46.350Z"
  },
  "scrapedAt": "2025-07-06T11:27:46.356Z"
}
```

## Troubleshooting

### Chrome Installation Issues on Render

If you encounter Chrome installation errors:

1. **Check the build logs** for any installation errors
2. **Ensure PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is set to "false"**
3. **The service will automatically download Chrome on first run**

### Common Issues

1. **"Could not find Chrome"**: Chrome is being downloaded automatically on first run
2. **"Maximum redirects exceeded"**: Website has anti-bot protection
3. **"Timeout"**: Website is slow or has heavy JavaScript

### Performance Optimization

- The service uses headless Chrome with optimized flags
- Content is analyzed using GPT-4 for intelligent extraction
- Memory and performance optimizations are included

## License

MIT 