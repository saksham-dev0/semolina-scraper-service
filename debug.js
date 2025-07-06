const axios = require('axios');
const cheerio = require('cheerio');

async function testScraping() {
  const url = 'https://coldpen.io/';
  
  try {
    console.log('Testing HTTP scraping...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 60000,
      maxRedirects: 15,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const html = response.data;
    console.log('HTML length:', html.length);
    console.log('First 500 chars:', html.substring(0, 500));
    
    const $ = cheerio.load(html);
    
    // Extract basic metadata
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    console.log('Title:', title);
    console.log('Description:', description);
    
    // Test content extraction
    $('script, style, nav, footer, header, .nav, .footer, .header, .sidebar, .menu').remove();
    
    const mainSelectors = [
      'main',
      '#main',
      '.main',
      'article',
      '.content',
      '#content',
      '.post',
      '.entry',
      '.page-content'
    ];

    let mainContent = '';
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContent = element.text().trim();
        console.log(`Found content with selector '${selector}':`, mainContent.length, 'chars');
        if (mainContent.length > 100) break;
      }
    }

    if (!mainContent || mainContent.length < 100) {
      mainContent = $('body').text().trim();
      console.log('Using body text:', mainContent.length, 'chars');
    }

    console.log('Final content length:', mainContent.length);
    console.log('Content preview:', mainContent.substring(0, 200));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

testScraping(); 