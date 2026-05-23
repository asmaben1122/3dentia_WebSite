# 3DentAI FastAPI Backend Scaffolding

3DentAI is an AI-powered medical SaaS platform designed to reconstruct **3D dental voxel structures** and export **STL volumetric meshes** from standard **2D panoramic dental X-Rays** using advanced deep learning.

This repository contains the complete production-ready, asynchronous, and modular **FastAPI backend architecture** configured to connect seamlessly to your existing React/TypeScript frontend.

---

## 🛠️ Tech Stack & Architecture

- **Web Framework**: FastAPI (Asynchronous endpoints, clean modular architecture, Pydantic v2 data validation).
- **Database & Storage**: Supabase (PostgreSQL relational storage, Supabase storage buckets for dental medical imaging files).
- **Identity & Security**: Local JWT access token authentication, secure password hashing using `passlib` + `bcrypt`.
- **Background Tasks**: Local async background processing for computationally intensive volumetric AI model inference.
- **Documentation**: Swagger/OpenAPI interactive API playground, ReDoc layout.

---

## 📂 Project Directory Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application initialization & middleware
│   ├── config.py               # Env configuration loaded via pydantic-settings
│   ├── database/
│   │   └── connection.py       # Supabase Client connection manager
│   ├── auth/
│   │   └── security.py         # Passlib password hashing & JWT encoding utilities
│   ├── models/
│   │   └── __init__.py         # Reserved for future ORM models
│   ├── schemas/
│   │   ├── auth.py             # Validation schemas for auth payloads
│   │   ├── patients.py         # Validation schemas for CRM patients
│   │   └── reconstructions.py  # Validation schemas for 3D reconstructions
│   ├── services/
│   │   ├── auth_service.py     # Users database operations & mock fallbacks
│   │   ├── patient_service.py  # Patient CRM database operations
│   │   ├── reconstruction_service.py # Core file upload management & AI worker orchestrator
│   │   └── supabase_service.py # Wrapper for Supabase Storage (uploads & public URLs)
│   ├── ai/
│   │   ├── preprocessing.py    # Pillow-based contrast enhancement & normalization
│   │   ├── mesh_generation.py  # Voxel array extraction to STL mesh file
│   │   └── inference.py        # Volumetric neural prediction task simulation (PyTorch)
│   ├── routes/
│   │   ├── auth.py             # Login, register, me endpoints
│   │   ├── patients.py         # CRM CRUD endpoints
│   │   └── reconstructions.py  # File uploads, AI triggers & download redirect endpoints
│   └── utils/
│       └── logger.py           # Configured rotating logger (console & backend.log file)
│
├── uploads/                    # Local temporary folder for uploaded images
├── outputs/                    # Local temporary folder for reconstructed assets
├── logs/                       # Server operation logs
├── .env                        # Local active configuration values
├── .env.example                # Configuration blueprint template
├── requirements.txt            # Python dependencies
├── supabase_schema.sql         # SQL Database DDL scripts
└── README.md                   # Installation & deployment handbook
```

---

## 🚀 Setup & Installation Instructions

### 1. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com) and spin up a new project.
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Paste and run the entire SQL code from [supabase_schema.sql](file:///C:/Users/aaaa/.gemini/antigravity/scratch/3dentai-backend/supabase_schema.sql) in this directory. This automatically:
   - Configures the `users`, `patients`, and `reconstructions` tables with correct relations.
   - Adds optimal database indexes for fast query execution.
   - Activates Row Level Security (RLS) policies.
4. Go to **Storage** in Supabase and create the following **public buckets**:
   - `panoramic-images` (For uploaded patient X-Rays)
   - `voxel-outputs` (For 3D voxel `.npy`/numpy models)
   - `stl-meshes` (For generated 3D printable `.stl` mesh structures)
   - `reconstruction-previews` (For 2D renders/previews of 3D outcomes)

### 2. Local Environment Setup
1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install package dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Environment Variables
1. Copy `.env.example` to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your actual Supabase URL, Anon Key, and secure JWT configurations:
   ```env
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_KEY="your-anon-or-service-role-key"
   JWT_SECRET_KEY="generate-a-secure-32-byte-hex-string"
   ```

> [!TIP]
> **Scaffolding Standalone Mock Database Fallback**:
> This backend is built with advanced **Local Mock DB Fallbacks**. If your `.env` contains placeholder keys or Supabase is temporarily offline, the server will **not crash**. Instead, it uses secure in-memory datastores allowing you to test logins, register patients, upload images, and trigger AI 3D reconstructions locally in the Swagger UI straight away!

---

## 💻 Running the Server

Start the local development server using `uvicorn`:
```bash
uvicorn app.main:app --reload
```

- **API Root**: `http://127.0.0.1:8000/`
- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Deep Learning Model Integration (PyTorch)

Inside the `app/ai/` directory, you will find complete, structured hooks where you can connect your custom AI dental models:
- **Image Processing**: Update `app/ai/preprocessing.py` using Pillow/OpenCV to modify target dimensions, dental orientation alignment, or contrast values.
- **Inference Pipeline**: Replace the simulated network calculations inside `app/ai/inference.py` (marked with comments) with your actual PyTorch model call:
  ```python
  import torch
  # Load model
  model = DentalReconstructionNetwork()
  model.load_state_dict(torch.load("weights/model.pth"))
  model.eval()
  
  # Forward pass
  with torch.no_grad():
      predicted_voxels = model(preprocessed_tensor)
  ```
- **3D Boundary Polygon Extraction**: Custom marching cubes extraction thresholds can be configured inside `app/ai/mesh_generation.py`.

---

## 🔐 Connecting the React Frontend

The API is fully structured for your React, shadcn/ui dashboard integration:
- **Authentication**: Set the `Authorization` header to `Bearer <access_token>` returned by `POST /api/v1/auth/login`.
- **CORS Support**: Edit `BACKEND_CORS_ORIGINS` in your `.env` file to include your React dev server address (e.g. `http://localhost:5173`) to allow full API communication.
- **File Uploading**: Submit panoramic X-Rays via multipart forms using `POST /api/v1/upload-pano` passing `patient_id` as form data.
- **Progress Tracking & Renders**: Query `GET /api/v1/reconstructions/{id}` to pull real-time statuses (`preprocessing`, `reconstructing`, `completed`, `failed`) to render spinner states, confidence meters, and fetch 2D preview frame public URLs.
