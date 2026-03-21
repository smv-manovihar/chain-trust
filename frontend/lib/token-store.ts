// In-memory store for the access token to allow cross-service calls (e.g. to the AI service)
// without storing the token in localStorage. This persists for the duration of the page session.

let accessToken: string | null = null;

export const tokenStore = {
  setToken: (token: string | null) => {
    accessToken = token;
  },
  getToken: () => {
    return accessToken;
  },
  clearToken: () => {
    accessToken = null;
  }
};
