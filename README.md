# 🌹 Rose Sale 2026 API Server

A Node.js/Express API server for the Celadon Rose Sale 2026 website. Handles product data, orders, authentication, and analytics with Google Sheets as the backend database.

## Features

- 🔄 **Automatic Caching** - Updates every 30 seconds to avoid spamming Google Sheets API
- 🔐 **Google OAuth** - Secure authentication with Google Sign-In
- 📦 **Product Management** - Fetch products from Google Sheets with filtering
- � **Order Processing** - Submit orders with automatic stock updates
- 📎 **File Uploads** - Payment proof uploads to Google Drive
- 📊 **Analytics** - Track page views, orders, revenue, and unique users
- 🌐 **CORS Support** - Configurable allowed origins
- 💾 **Stale-While-Revalidate** - Serves cached data even when refresh fails

## Setup

### 1. Install Dependencies

```bash
cd rose-sale-api
npm install
```

### 2. Configure Environment

Create a `.env` file with the following:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_API_KEY=your_api_key_here

# Sheet names
PRODUCTS_SHEET_NAME=Products
ORDERS_SHEET_NAME=Orders

# Server Configuration
PORT=3001

# Cache Configuration (in milliseconds)
CACHE_TTL=30000

# CORS - comma separated origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Session secret (use a long random string in production!)
SESSION_SECRET=your-secure-random-string-here

# Google OAuth Client ID
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Google Service Account (Base64 encoded JSON key)
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=your_base64_encoded_service_account_key
```

### 3. Google Cloud Setup

1. **Google Sheets API** - Enable in Google Cloud Console
2. **Google Drive API** - Enable for payment proof uploads
3. **Service Account** - Create for writing to Sheets/Drive
4. **OAuth Client ID** - Create for user authentication

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

### Health & Cache
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with cache statistics |
| POST | `/api/refresh` | Force refresh cache from Google Sheets |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Login with Google ID token |
| POST | `/api/auth/logout` | Logout and destroy session |
| GET | `/api/auth/me` | Get current authenticated user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all available products |
| GET | `/api/products/:id` | Get a single product by ID |
| GET | `/api/filters` | Get filter options (categories, tags, price range) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Submit a new order (requires auth) |
| GET | `/api/orders` | Get orders for authenticated user |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get analytics snapshot |
| POST | `/api/analytics/pageview` | Track a page view |
| POST | `/api/analytics/reset` | Reset all analytics |

## Analytics Data

The analytics system tracks:
- **Page Views**: Home page, shop page, product views
- **Users**: Unique users and total sessions
- **Orders**: Total orders and revenue
- **API Usage**: Total API calls

Data is stored in `data/analytics.json` and persists across server restarts.

## Project Structure

```
rose-sale-api/
├── src/
│   ├── index.ts      # Express server & routes
│   ├── analytics.ts  # Analytics tracking module
│   ├── auth.ts       # Google OAuth authentication
│   ├── cache.ts      # Cache manager with auto-refresh
│   ├── sheets.ts     # Google Sheets/Drive integration
│   └── types.ts      # TypeScript interfaces
├── data/
│   └── analytics.json # Persisted analytics data
├── .env              # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### Render.com (Recommended)

1. Push to GitHub
2. Create new Web Service on Render
3. Connect your repo
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables from `.env`

### Environment Variables for Production

Make sure to update:
- `SESSION_SECRET` - Use a secure random string
- `ALLOWED_ORIGINS` - Add your production frontend URL
