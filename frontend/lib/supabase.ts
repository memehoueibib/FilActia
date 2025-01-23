import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../backend/types/database.types';

const supabaseUrl = 'https://ccjtbokqahxmtvlbitak.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjanRib2txYWh4bXR2bGJpdGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2MzQ1NDgsImV4cCI6MjA1MzIxMDU0OH0.oTauTYeXDRS4LOo7rSzNazvXxCuITiNvsGp8mq9EA4E';

const customStorage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});