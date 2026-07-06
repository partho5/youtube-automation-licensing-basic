// server.js

const http = require('http');
const path = require('path');
const url = require('url');

const server = http.createServer(async (req, res) => {
  // Simple helper to add standard Vercel response helper methods
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle your clean vercel.json rewrites manually for local development
  if (pathname === '/admin') pathname = '/api/admin';
  if (pathname === '/gist') pathname = '/api/gist';
  if (pathname === '/validate') pathname = '/api/validate';


  try {
    // Route to the correct file inside the api folder
    if (pathname.startsWith('/api/')) {
      const filePath = path.join(__dirname, pathname + '.js');
      
      // Clear cache for a seamless local development experience
      delete require.cache[require.resolve(filePath)];
      const handler = require(filePath);
      
      return handler(req, res);
    }

    // Fallback 404
    res.status(404).json({ error: "Not Found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`> Local dev server running at http://localhost:${PORT}`);
});

