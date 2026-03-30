/**
 * FreeIPAPI response structure
 */
export interface FreeIPAPIResponse {
  ipVersion: number;
  ipAddress: string;
  latitude: number;
  longitude: number;
  countryName: string;
  countryCode: string;
  timeZones: string[];
  zipCode: string;
  cityName: string;
  regionName: string;
  isProxy: boolean;
  continent: string;
  continentCode: string;
}

/**
 * Fetches geographic coordinates and location details for a specific IP.
 * Uses FreeIPAPI.com (no API key required).
 * 
 * @param ipAddress The IP address to look up.
 * @returns Geolocation data or null if the lookup fails.
 */
export async function getGeoLocation(ipAddress: string): Promise<FreeIPAPIResponse | null> {
  // FreeIPAPI.com endpoint
  const url = `https://freeipapi.com/api/json/${ipAddress}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[Geolocation] FreeIPAPI error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as FreeIPAPIResponse;
    return data;
  } catch (error) {
    console.error("[Geolocation] Failed to fetch data from FreeIPAPI:", error);
    return null;
  }
}
