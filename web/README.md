# Monix Web Interface

Web-based UI for Monix security analysis tool. This interface allows users to analyze URLs for security threats through a clean, modern web interface.

## Architecture

- **Backend**: Python Flask API server (`api/server.py`) that exposes Monix core functionality
- **Frontend**: Next.js React application with TypeScript
- **Separation of Concerns**: All security logic remains in Monix core modules. The web interface is purely a UI layer.

## Setup

### Backend API Server

1. Install Python dependencies:
```bash
cd /path/to/monix
pip install -r requirements.txt
```

2. Start the API server:
```bash
python api/server.py
```

The API server will run on `http://localhost:3030` by default.

### Frontend

1. Navigate to the Next.js app:
```bash
cd web/my-app
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variable (optional, defaults to localhost:3030):
```bash
# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3030" > .env.local
```

4. Start the development server:
```bash
npm run dev
```

The web interface will be available at `http://localhost:3000`.

## Usage

1. Open the web interface in your browser
2. Enter a URL to analyze (e.g., `https://example.com/admin`)
3. Click "Analyze" to check for security threats
4. View results including:
   - Threat level and score
   - Domain and IP information
   - Geolocation data
   - Map visualization of threat location
   - Detected suspicious patterns

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze-url` - Analyze a URL for threats
  - Body: `{ "url": "https://example.com/path" }`
- `POST /api/analyze-ip` - Analyze an IP address
  - Body: `{ "ip": "192.168.1.1" }`
- `GET /api/threat-info` - Get threat pattern information

## Features

- **URL Analysis**: Detects high-risk endpoints and suspicious patterns
- **Threat Scoring**: Calculates threat scores based on multiple factors
- **Geolocation**: Shows IP geolocation information
- **Map Visualization**: Displays threat locations on an interactive map
- **Real-time Analysis**: Fast, responsive analysis interface

## Development

The codebase follows strict separation of concerns:
- Security logic: `core/` modules
- API layer: `api/server.py`
- UI components: `web/my-app/src/components/`
- API client: `web/my-app/src/lib/api.ts`

All security analysis logic remains in the Python core modules and is never reimplemented in the frontend.

