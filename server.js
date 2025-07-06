const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { WebScrapingService } = require('./scrapingService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        example: { url: 'https://example.com' }
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        example: { url: 'https://example.com' }
      });
    }

    console.log(`Scraping request received for: ${url}`);
    
    const scrapingService = new WebScrapingService();
    const result = await scrapingService.scrapeWebsite(url);
    
    console.log(`Scraping completed for: ${url}`);
    
    res.json({
      success: true,
      data: result,
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: ['GET /health', 'POST /api/scrape']
  });
});

app.listen(PORT, () => {
  console.log(`Scraping microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Scraping endpoint: http://localhost:${PORT}/api/scrape`);
});