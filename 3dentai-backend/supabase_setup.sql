-- ============================================================
-- 3DentAI Complete Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    clinic_name VARCHAR(255) NOT NULL DEFAULT 'My Clinic',
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================
-- 2. PATIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0),
    gender VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(patient_name);

-- ============================================================
-- 3. RECONSTRUCTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reconstructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    pano_image_url TEXT,
    output_voxel_url TEXT,
    output_stl_url TEXT,
    preview_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL
        CHECK (status IN ('pending', 'preprocessing', 'reconstructing', 'completed', 'failed')),
    confidence_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reconstructions_patient_id ON public.reconstructions(patient_id);

-- ============================================================
-- 4. AUTO-CREATE USER PROFILE ON SIGNUP (trigger)
--    When someone signs up via the frontend, this automatically
--    creates their row in public.users so they can add patients.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, clinic_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(
      NEW.raw_user_meta_data->>'clinic',
      NEW.raw_user_meta_data->>'clinic_name',
      'My Clinic'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconstructions ENABLE ROW LEVEL SECURITY;

-- Users: each user can only read/update their own profile
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Patients: each user manages only their own patients
DROP POLICY IF EXISTS "Users manage own patients" ON public.patients;
CREATE POLICY "Users manage own patients" ON public.patients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reconstructions: accessible via patient ownership
DROP POLICY IF EXISTS "Users access own reconstructions" ON public.reconstructions;
CREATE POLICY "Users access own reconstructions" ON public.reconstructions
  FOR ALL TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE user_id = auth.uid()
    )
  );
