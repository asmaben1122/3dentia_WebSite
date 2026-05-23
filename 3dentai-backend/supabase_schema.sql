-- 3DentAI Supabase PostgreSQL Schema DDL
-- Paste this script into your Supabase SQL Editor to initialize the database tables and relations.

-- Enable UUID extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- Stored as optional fallback / mock sandbox usage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ==========================================
-- 2. PATIENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0),
    gender VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for searching patient records owned by specific users
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(patient_name);

-- ==========================================
-- 3. RECONSTRUCTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reconstructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    pano_image_url TEXT,
    output_voxel_url TEXT,
    output_stl_url TEXT,
    preview_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'preprocessing', 'reconstructing', 'completed', 'failed')),
    confidence_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for patient reconstruction history
CREATE INDEX IF NOT EXISTS idx_reconstructions_patient_id ON public.reconstructions(patient_id);
CREATE INDEX IF NOT EXISTS idx_reconstructions_status ON public.reconstructions(status);

-- ==========================================
-- 4. STORAGE BUCKETS INSTRUCTIONS
-- ==========================================
-- You will need to create the following storage buckets in your Supabase project under Storage:
-- 1. 'panoramic-images' (Public access: true) - for uploaded panoramic dental images
-- 2. 'voxel-outputs' (Public access: true) - for 3D reconstructed voxel tensor/numpy files
-- 3. 'stl-meshes' (Public access: true) - for generated STL 3D dental models
-- 4. 'reconstruction-previews' (Public access: true) - for 2D renders/previews of the 3D output

-- Note: In Supabase, you can set up policies for RLS (Row Level Security) or keep buckets public for easier API access.
-- If Row Level Security (RLS) is enabled for tables, ensure you create appropriate CRUD policies:
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconstructions ENABLE ROW LEVEL SECURITY;

-- Allow public/anonymous reads & authenticated operations for development, or add specific clinic policies:
CREATE POLICY "Allow select for all authenticated users on users table" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for all authenticated users on patients table" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow select for all authenticated users on reconstructions table" ON public.reconstructions FOR ALL TO authenticated USING (true);

-- (During development, you may disable RLS or use the Supabase Service Key which bypasses RLS)
