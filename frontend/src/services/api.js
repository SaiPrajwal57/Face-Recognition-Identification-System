/**
 * Centralized API Service for FastAPI Face Recognition System.
 * Connects directly to backend endpoints using relative proxy URLs or configured base URL.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiService {
  async request(url, options = {}) {
    try {
      const res = await fetch(url, options);
      return await this.handleResponse(res);
    } catch (err) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed'))) {
        const networkErr = new Error('Cannot connect to FastAPI backend server (http://127.0.0.1:8000). Please verify that the backend is running.');
        networkErr.status = 503;
        throw networkErr;
      }
      throw err;
    }
  }

  /**
   * Helper to format API errors nicely
   */
  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(d => d.msg || d.loc?.join('.')).join(', ');
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // response was not JSON
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }
    return await response.json();
  }

  /**
   * GET /health - Check backend system health and database connection
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await this.handleResponse(res);
    } catch (err) {
      return {
        status: 'disconnected',
        database: 'unreachable',
        database_mode: 'offline',
        error: err.message,
      };
    }
  }

  /**
   * GET /api/v1/faces - List all enrolled people
   */
  async listPeople() {
    return await this.request(`${API_BASE_URL}/api/v1/faces`);
  }

  /**
   * GET /api/v1/faces/:person_id - Get details of a single person
   */
  async getPerson(personId) {
    return await this.request(`${API_BASE_URL}/api/v1/faces/${encodeURIComponent(personId)}`);
  }

  /**
   * DELETE /api/v1/faces/:person_id - Delete an enrolled person
   */
  async deletePerson(personId) {
    return await this.request(`${API_BASE_URL}/api/v1/faces/${encodeURIComponent(personId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * POST /api/v1/faces/enroll - Enroll person with image
   * @param {string} name - Full Name
   * @param {File|Blob} imageFile - Face image
   */
  async enrollPerson(name, imageFile) {
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('image', imageFile, 'enrollment.jpg');

    return await this.request(`${API_BASE_URL}/api/v1/faces/enroll`, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * POST /api/v1/faces/identify - Identify face from query image
   * @param {File|Blob} imageFile - Query face image
   * @param {number|null} threshold - Optional custom similarity threshold
   */
  async identifyFace(imageFile, threshold = null) {
    const formData = new FormData();
    formData.append('image', imageFile, 'query.jpg');

    let url = `${API_BASE_URL}/api/v1/faces/identify`;
    if (threshold !== null && threshold !== undefined) {
      url += `?threshold=${encodeURIComponent(threshold)}`;
    }

    return await this.request(url, {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiService();
export default api;
