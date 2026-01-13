# Data Refinery

**Data Refinery** is an enterprise-grade data ingestion, processing, and structuring platform designed to handle messy data with ease. It leverages high-performance data libraries (Polars) and modern AI (Google Gemini) to clean, validate, and standardize large datasets.

![Data Refinery Logo](frontend/src/app/icon.png)

## 🚀 Features

### 1. Robust Data Ingestion
*   **Multi-format Support:** Upload CSV, Excel (XLSX), JSON, XML, and Parquet files.
*   **Large File Handling:** Optimized for files up to 500MB+ using streaming and async processing.
*   **Automatic Parsing:** Intelligent detection of file formats and encodings.

### 2. Intelligent Data Cleaning
*   **Standardization:** Automatically standardizes dates (ISO, US, EU formats) and phone numbers.
*   **Deduplication:** Merges case-insensitive duplicate headers (e.g., "Email" vs "EMAIL") and removes duplicate rows.
*   **Smart Header Fix:** Automatically removes unnamed or empty columns.
*   **Missing Value Handling:** Batched strategies for filling missing values (Median for numbers, Mode/N/A for text).

### 3. AI-Powered Smart Repair (Gemini Integration)
*   **Context-Aware Cleaning:** Uses Google Gemini 2.0 Flash to repair inconsistent categorical data (e.g., "M", "Male", "male" → "Male").
*   **Auto-Fix:** One-click automated repair of validation errors using AI suggestions.
*   **Column-Specific Repair:** Targeted AI instructions for specific columns (e.g., "Standardize job titles").

### 4. Schema Validation & Mapping
*   **Schema Enforcement:** Validate data against predefined schemas (strict typing, required fields).
*   **Visual Mapping:** Drag-and-drop or dropdown interface to map uploaded columns to target schema fields.
*   **Validation Reports:** Detailed summary of valid vs. invalid rows and specific error logs.

### 5. Advanced Profiling & Analytics
*   **Data Health Score:** Instant visibility into the quality of your dataset.
*   **Column Stats:** Distribution, cardinality, and null check visualizations.
*   **Processing Analytics:** Track job success rates, processing times, and volumetric data.

### 6. Flexible Export
*   **Multi-format Export:** Download processed data as CSV, JSON, Parquet, or SQL dump.
*   **Bulk Actions:** Zip export of multiple processed jobs.
*   **JSON Interoperability:** Clean row-oriented JSON output for web app integration.

## 🛠 Tech Stack

### Frontend
-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** TailwindCSS, Shadcn UI
-   **State/Data:** TanStack Query (React Query)
-   **Icons:** Lucide React

### Backend
-   **Framework:** FastAPI (Python 3.10+)
-   **Database:** MongoDB (via Beanie ODM / Motor)
-   **Data Processing:** Polars (Rust-based Python library for high performance)
-   **AI Engine:** Google GenAI SDK (Gemini 2.0 Flash)
-   **Task Queue:** FastAPI BackgroundTasks (Asyncio)

## 📦 Prerequisites

-   **Node.js** (v18 or higher)
-   **Python** (v3.10 or higher)
-   **MongoDB** (Local instance or Atlas URI)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/abhijeetrogye/data-refinery.git
cd data-refinery
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment.

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables:**
Create a `.env` file in the `backend/` directory:

```env
PROJECT_NAME="Data Refinery API"
MONGODB_URL="mongodb://localhost:27017"
DB_NAME="data_refinery"
CORS_ORIGINS=["http://localhost:3000"]
GOOGLE_API_KEY="your_google_gemini_api_key"
```

**Run the Backend:**
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at: http://localhost:8000/docs

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory.

```bash
cd frontend
npm install
```

**Run the Frontend:**
```bash
npm run dev
```
The application will be available at: http://localhost:3000

## 📖 Usage Guide

1.  **Dashboard:** Check the "Data Health Overview" to see system stats.
2.  **Ingestion:** Click "New Job" to upload a dataset. Select the source format (CSV/Excel).
3.  **Mapping:** If you have a target schema, map your file columns to the schema fields.
4.  **Processing:** The system automatically cleans headers and standardizes formats.
5.  **Review & Repair:**
    *   Click on a job to view its details.
    *   Use **Profiler** to see column statistics.
    *   Use **Smart Repair** to fix specific columns using AI.
    *   Use **Auto-Fix** to verify and repair validation errors.
6.  **Export:** Download the cleaned dataset in your preferred format.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🌐 Connect

*   [GitHub](https://github.com/abhijeetrogye/)
*   [LinkedIn](https://www.linkedin.com/in/abhijeetrogye/)
*   [Instagram](https://instagram.com/abhijeetrogye)
