import api from './api';

/**
 * Service to fetch backend health status
 */
export const checkBackendHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
