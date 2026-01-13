# Data Refinery - Frontend

A modern Next.js dashboard for intelligent data ingestion and processing.

## Features

- 📤 **Multi-Source Upload**: CSV, JSON, Excel, XML, PDF, TXT files
- 🔗 **API Integration**: Ingest data from REST APIs
- 🗄️ **Database Connection**: Query PostgreSQL/MySQL databases
- 🧹 **Data Cleaning**: Remove duplicates, fill missing values, normalize text
- 🗺️ **Schema Mapping**: Auto-detect fields with AI-powered confidence scores
- ✅ **Validation**: Schema validation with detailed error reports
- 📊 **Real-Time Status**: Live job tracking with progress indicators
- ⬇️ **Export**: Download as CSV, JSON, or Parquet

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS + Shadcn/UI
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Setup

### Prerequisites
- Node.js 18+
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main dashboard
│   │   └── globals.css     # Premium dark theme
│   ├── components/
│   │   ├── DownloadButton.tsx    # Export functionality
│   │   ├── ErrorReport.tsx       # Validation error viewer
│   │   ├── SchemaManager.tsx     # Target schema management
│   │   ├── SchemaMapper.tsx      # Field mapping editor
│   │   └── SourceIngestion.tsx   # API/DB ingestion
│   └── lib/
│       └── api.ts          # API client configuration
└── package.json
```

## UI Features

- 🌙 Premium dark theme with gradients
- ✨ Glassmorphism effects
- 🎯 Animated status badges
- 📱 Responsive design

## Environment Variables

Create `.env.local` if you need to customize:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## License

MIT
