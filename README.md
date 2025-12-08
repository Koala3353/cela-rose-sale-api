# Rose Sale API Server

A Node.js/Express API server that fetches product data from Google Sheets with built-in caching to avoid API rate limits.

## Features

- 🔄 **Automatic Caching** - Updates every 30 seconds to avoid spamming Google Sheets API
- 🌐 **CORS Support** - Configurable allowed origins
- 📦 **Product Endpoints** - Get all products, single product, and filter options
- 📝 **Order Submission** - Submit orders (can be extended to write to sheets)
- 💾 **Stale-While-Revalidate** - Serves cached data even when refresh fails

## Setup

### 1. Install Dependencies

```bash
cd rose-sale-api
npm install
```

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Your Google Sheet ID (from the URL)
GOOGLE_SHEET_ID=1zroV5ASCbTRLWnkl1k1eKkJG992OZqhetdH9u48QZeU

# Your Google API Key
GOOGLE_API_KEY=your_api_key_here

# Sheet tab names
PRODUCTS_SHEET_NAME=Products
ORDERS_SHEET_NAME=Orders

# Server port
PORT=3001

# Cache TTL in milliseconds (30 seconds)
CACHE_TTL=30000

# Allowed origins for CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Google Sheets Setup

1. Create a Google Sheet with the following structure:

#### Products Sheet Layout

| Column | Header | Required | Description |
|--------|--------|----------|-------------|
| A | `id` | ✅ | Unique product ID (e.g., `rose-red`) |
| B | `name` | ✅ | Product name |
| C | `price` | ✅ | Price (number) |
| D | `category` | ✅ | Category for grouping |
| E | `stock` | ✅ | Available quantity |
| F | `imageUrl` | ❌ | Image URL (auto-generated if empty) |
| G | `description` | ❌ | Product description |
| H | `tags` | ❌ | Comma-separated tags |
| I | `available` | ❌ | `true`/`false` to show/hide |

2. Make the sheet public: **Share → Anyone with link → Viewer**

3. Get your API key from [Google Cloud Console](https://console.cloud.google.com/):
   - Create/select a project
   - Enable "Google Sheets API"
   - Create an API key under Credentials

### 4. Run the Server

Development (with hot reload):
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### `GET /health`
Health check with cache statistics.

### `GET /api/products`
Get all available products.

**Response:**
```json
{
  "success": true,
  "data": [...products],
  "cached": true,
  "cacheAge": 15000
}
```

### `GET /api/products/:id`
Get a single product by ID.

### `GET /api/filters`
Get available filter options (categories, tags, price range).

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["Single", "Bouquet", "Bundle"],
    "tags": ["flower", "romantic", "gift"],
    "priceRange": { "min": 100, "max": 1000 }
  }
}
```

### `POST /api/refresh`
Force refresh the cache from Google Sheets.

### `POST /api/orders`
Submit a new order.

**Body:**
```json
{
  "email": "customer@email.com",
  "purchaserName": "John Doe",
  "cartItems": "Red Rose x2, Pink Tulip x1",
  "total": 450
}
```

## Cache Behavior

- **TTL**: 30 seconds by default (configurable via `CACHE_TTL`)
- **Auto-refresh**: Background updates every 30 seconds
- **Stale-while-revalidate**: Returns cached data even if refresh fails
- **Force refresh**: Use `POST /api/refresh` to manually update

## Project Structure

```
rose-sale-api/
├── src/
│   ├── index.ts      # Express server & routes
│   ├── cache.ts      # Cache manager with auto-refresh
│   ├── sheets.ts     # Google Sheets integration
│   └── types.ts      # TypeScript interfaces
├── .env.example      # Environment template
├── package.json
├── tsconfig.json
└── README.md
```
