const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

class WebScrapingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getChromePath() {
    // Try to find Chrome in common locations
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/usr/bin/google-chrome-stable'
    ];

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    // If no Chrome found, let Puppeteer use its bundled version
    return undefined;
  }

  async scrapeWebsite(url) {
    let browser;
    
    try {
      console.log('Attempting to launch browser...');
      
      // First try with bundled Chrome
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ]
      });

      console.log('Browser launched successfully');
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      console.log('Navigating to:', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const html = await page.content();
      const title = await page.title();
      const $ = cheerio.load(html);

      // Extract metadata
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];
      const author = $('meta[name="author"]').attr('content') || 
                    $('meta[property="article:author"]').attr('content');
      const publishedDate = $('meta[property="article:published_time"]').attr('content');

      // Extract contact information
      const email = this.extractEmail($);
      const phone = this.extractPhone($);
      const address = this.extractAddress($);

      // Main visible text
      const textContent = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, footer, header');
        scripts.forEach(el => el.remove());
        // Get main content areas
        const mainContent = document.querySelector('main') || 
                          document.querySelector('#main') || 
                          document.querySelector('.main') ||
                          document.querySelector('article') ||
                          document.body;
        return mainContent ? mainContent.innerText : document.body.innerText;
      });

      // Extract pricing and testimonial snippets from the live DOM (dynamic content)
      const pricingSelectors = [
        '[class*="price"]', '[id*="price"]', '[class*="plan"]', '[id*="plan"]', '[class*="subscription"]', '[id*="subscription"]', '[class*="package"]', '[id*="package"]', '[class*="billing"]', '[id*="billing"]', '[class*="amount"]', '[id*="amount"]', '[class*="cost"]', '[id*="cost"]', '[class*="tier"]', '[id*="tier"]'
      ];
      const testimonialSelectors = [
        '[class*="testimonial"]', '[id*="testimonial"]', '[class*="review"]', '[id*="review"]', '[class*="customer"]', '[id*="customer"]', '[class*="quote"]', '[id*="quote"]', '[class*="feedback"]', '[id*="feedback"]'
      ];
      const pricingSnippets = await page.evaluate((pricingSelectors) => {
        const snippets = [];
        pricingSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const txt = el.textContent?.trim();
            if (txt && txt.length > 2 && !snippets.includes(txt)) snippets.push(txt);
          });
        });
        return snippets;
      }, pricingSelectors);
      const testimonialSnippets = await page.evaluate((testimonialSelectors) => {
        const snippets = [];
        testimonialSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            const txt = el.textContent?.trim();
            if (txt && txt.length > 2 && !snippets.includes(txt)) snippets.push(txt);
          });
        });
        return snippets;
      }, testimonialSelectors);

      await browser.close();

      // Use GPT-4 to analyze and structure the content
      const analyzedContent = await this.analyzeContentWithGPT(
        title,
        description,
        textContent,
        url,
        pricingSnippets,
        testimonialSnippets
      );

      return {
        title,
        description,
        metadata: {
          keywords,
          author,
          publishedDate
        },
        businessInfo: {
          name: analyzedContent.businessName,
          description: analyzedContent.businessDescription,
          services: analyzedContent.services,
          contactInfo: {
            email,
            phone,
            address
          },
          pricing: analyzedContent.pricing,
          testimonials: analyzedContent.testimonials
        },
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Scraping error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to scrape website: ${errorMessage}`);
    }
  }

  extractEmail($) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const text = $.text();
    const emails = text.match(emailRegex);
    return emails ? emails[0] : undefined;
  }

  extractPhone($) {
    const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
    const text = $.text();
    const phones = text.match(phoneRegex);
    return phones ? phones[0].trim() : undefined;
  }

  extractAddress($) {
    const addressSelectors = [
      '[itemtype*="PostalAddress"]',
      '.address',
      '#address',
      '[class*="address"]'
    ];
    for (const selector of addressSelectors) {
      const address = $(selector).text().trim();
      if (address && address.length > 10) {
        return address;
      }
    }
    return undefined;
  }

  async analyzeContentWithGPT(title, description, content, url, pricingSnippets, testimonialSnippets) {
    const prompt = `Analyze the following website content and extract structured business information.\n\n---\nWEBSITE TITLE: ${title}\nDESCRIPTION: ${description}\nURL: ${url}\n\nMAIN CONTENT (first 4000 chars):\n${content.substring(0, 4000)}\n\n---\nPRICING SECTIONS (if any):\n${pricingSnippets.join('\n') || 'None found'}\n\n---\nTESTIMONIAL/REVIEW SECTIONS (if any):\n${testimonialSnippets.join('\n') || 'None found'}\n\n---\n\nReturn a JSON object with the following structure:\n{\n  "businessName": "string",\n  "businessDescription": "string",\n  "services": ["array of services offered"],\n  "pricing": "string describing pricing if available (include all plan names, prices, and features if possible)",\n  "testimonials": ["array of testimonials or customer reviews if found"]\n}\n\nIf there are multiple pricing plans, list each with its price and features. If no pricing is found, return an empty string. For testimonials, include any customer quotes, reviews, or feedback.\n\nReturn only valid JSON without any additional text.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business information extraction specialist. Extract structured business data from website content and return it as JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }
    } catch (error) {
      console.error('GPT analysis error:', error);
    }

    // Fallback response if GPT analysis fails
    return {
      businessName: title,
      businessDescription: description,
      services: [],
      pricing: '',
      testimonials: []
    };
  }
}

module.exports = { WebScrapingService };