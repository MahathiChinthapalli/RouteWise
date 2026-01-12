import axios from 'axios';
import type { Destination, DistanceMatrix, Coordinates, TransportMode } from '../types';

// OpenRouteService API (free alternative to Google Maps)
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || '5b3ce3597851110001cf6248YOUR_KEY_HERE';
const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Nominatim for geocoding (free, no API key needed)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Search for places using Nominatim geocoding
 */
export async function searchPlaces(query: string): Promise<Destination[]> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'RouteWise/1.0'
      }
    });

    return response.data.map((place: any) => ({
      id: place.place_id.toString(),
      name: place.display_name.split(',')[0],
      address: place.display_name,
      coordinates: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon)
      },
      placeId: place.place_id.toString(),
      category: place.type || 'location'
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

/**
 * Get current user location
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        resolve(null);
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(coords: Coordinates): Promise<Destination | null> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: coords.lat,
        lon: coords.lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'RouteWise/1.0'
      }
    });

    return {
      id: response.data.place_id.toString(),
      name: 'Current Location',
      address: response.data.display_name,
      coordinates: coords,
      placeId: response.data.place_id.toString()
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Convert transport mode to ORS profile
 */
function getORSProfile(mode: TransportMode): string {
  switch (mode) {
    case 'walk':
      return 'foot-walking';
    case 'bike':
      return 'cycling-regular';
    case 'drive':
      return 'driving-car';
    default:
      return 'driving-car';
  }
}

/**
 * Fetch distance matrix using OpenRouteService
 */
export async function fetchDistanceMatrix(
  destinations: Destination[],
  transportMode: TransportMode = 'drive'
): Promise<DistanceMatrix> {
  const n = destinations.length;
  const matrix: DistanceMatrix = Array(n).fill(null).map(() => Array(n).fill(null));

  try {
    // Build coordinates array
    const locations = destinations.map(d => [d.coordinates.lng, d.coordinates.lat]);

    const profile = getORSProfile(transportMode);

    const response = await axios.post(
      `${ORS_BASE_URL}/v2/matrix/${profile}`,
      {
        locations,
        metrics: ['distance', 'duration'],
        units: 'm'
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const durations = response.data.durations;
    const distances = response.data.distances;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = {
          duration: durations[i][j], // seconds
          distance: distances[i][j], // meters
          cost: estimateCost(distances[i][j], transportMode)
        };
      }
    }

    return matrix;
  } catch (error) {
    console.error('Error fetching distance matrix:', error);
    // Fallback: use straight-line distance × 1.4 factor
    return generateFallbackMatrix(destinations, transportMode);
  }
}

/**
 * Estimate transportation cost
 */
function estimateCost(distanceMeters: number, mode: TransportMode): { min: number; max: number } {
  const distanceMiles = distanceMeters * 0.000621371;

  switch (mode) {
    case 'walk':
      return { min: 0, max: 0 };
    case 'bike':
      return { min: 0, max: 0 };
    case 'drive':
      // Assume $0.50-$0.70 per mile for gas
      return {
        min: Math.round(distanceMiles * 0.5 * 100) / 100,
        max: Math.round(distanceMiles * 0.7 * 100) / 100
      };
    case 'rideshare':
      // Assume base $2.50 + $1.50-$2.50 per mile
      return {
        min: Math.round((2.5 + distanceMiles * 1.5) * 100) / 100,
        max: Math.round((2.5 + distanceMiles * 2.5) * 100) / 100
      };
    case 'transit':
      // Assume flat $2.50-$3.50 per ride
      return { min: 2.5, max: 3.5 };
    default:
      return { min: 0, max: 0 };
  }
}

/**
 * Generate fallback distance matrix using straight-line distance
 */
function generateFallbackMatrix(
  destinations: Destination[],
  transportMode: TransportMode
): DistanceMatrix {
  const n = destinations.length;
  const matrix: DistanceMatrix = Array(n).fill(null).map(() => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = {
          duration: 0,
          distance: 0,
          cost: { min: 0, max: 0 }
        };
      } else {
        const distance = haversineDistance(
          destinations[i].coordinates,
          destinations[j].coordinates
        );
        // Apply 1.4 factor for road distance and estimate speed
        const roadDistance = distance * 1.4;
        const speedMPS = transportMode === 'walk' ? 1.4 : 10; // m/s
        const duration = roadDistance / speedMPS;

        matrix[i][j] = {
          duration,
          distance: roadDistance,
          cost: estimateCost(roadDistance, transportMode)
        };
      }
    }
  }

  return matrix;
}

/**
 * Calculate haversine distance between two coordinates (in meters)
 */
function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Fetch detailed directions for a route
 */
export async function fetchDirections(
  waypoints: Coordinates[],
  transportMode: TransportMode = 'drive'
): Promise<any> {
  try {
    const profile = getORSProfile(transportMode);
    const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);

    const response = await axios.post(
      `${ORS_BASE_URL}/v2/directions/${profile}/geojson`,
      {
        coordinates,
        instructions: true,
        geometry: true
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
}
