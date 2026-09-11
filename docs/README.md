# Project Katch-Up: Quick Start Guide

This guide covers how to quickly start the server locally and test its endpoints.

## Startup Instructions

1. **Install Dependencies**
   Navigate to the `server` directory and install the necessary packages:
   ```bash
   cd server
   npm install
   ```

2. **Environment Setup**
   Copy the example environment file from the root directory into the `server` directory and fill in your Supabase credentials:
   ```bash
   cp ../.env.example .env
   ```
   *Note: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are populated in `.env`.*

3. **Start the Server**
   Run the development server:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5050`.

---