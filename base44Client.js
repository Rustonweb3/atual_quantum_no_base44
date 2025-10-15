import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68b93026faa4d05b1fc711d9", 
  requiresAuth: true // Ensure authentication is required for all operations
});
