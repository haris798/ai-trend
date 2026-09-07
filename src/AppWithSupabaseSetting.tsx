import React from 'react';
import App from './App';

/**
 * Reserved wrapper for future deployment-level configuration screens.
 * Kept separate so runtime configuration can evolve without exposing secrets.
 */
export default function AppWithSupabaseSetting() {
  return <App />;
}
