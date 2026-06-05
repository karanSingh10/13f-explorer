# 13F Explorer

Live institutional holdings dashboard — real-time data from SEC EDGAR.

## Local development

```bash
npm install
npm start          # → http://localhost:3000
```

## Hosting online

The app needs a server to proxy SEC EDGAR requests (browsers can't call sec.gov directly due to CORS). A production Express server is included.

### Option 1: Render.com (free tier)

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node server.js`
   - **Environment:** Node
5. Deploy — you'll get a URL like `https://your-app.onrender.com`

### Option 2: Railway.app

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. It auto-detects Node.js. Set:
   - **Build:** `npm install && npm run build`
   - **Start:** `node server.js`
4. Deploy

### Option 3: Fly.io

```bash
# Install flyctl: https://fly.io/docs/getting-started/installing-flyctl/
fly launch
fly deploy
```

### Option 4: VPS (DigitalOcean, etc.)

```bash
npm install
npm run build      # builds React → /build folder
npm run serve      # starts Express on PORT (default 3000)
```

Use nginx or caddy as reverse proxy for HTTPS.

### Option 5: Docker

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t 13f-explorer .
docker run -p 3000:3000 13f-explorer
```

## How it works

All data comes from SEC EDGAR (free, no API key):
1. `data.sec.gov/submissions/` → filing history
2. `www.sec.gov/Archives/` → XML holdings data
3. `efts.sec.gov/LATEST/search-index` → fund manager search

The Express server proxies these requests and adds the required User-Agent header.

Data is cached in the browser's localStorage so repeat visits load instantly.

## Adding managers

Use the "Add Manager" tab to search SEC EDGAR for any fund that files 13F reports. You can add unlimited managers.

## Important

Update the User-Agent in `server.js` and `setupProxy.js` with your name/email before heavy use. SEC requires this for their API.
