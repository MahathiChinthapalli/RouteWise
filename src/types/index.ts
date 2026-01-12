// Core data models for RouteWise application

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OperatingHours {
  open: string;  // Time in HH:MM format
  close: string; // Time in HH:MM format
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  placeId?: string;
  category?: string;
  operatingHours?: OperatingHours[];
  estimatedDuration?: number; // minutes
  userNotes?: string;
}

export type TransportMode = 'walk' | 'transit' | 'rideshare' | 'bike' | 'drive';

export interface CostEstimate {
  min: number;
  max: number;
}

export interface RouteLeg {
  fromDestinationId: string;
  toDestinationId: string;
  transportMode: TransportMode;
  duration: number; // minutes
  distance: number; // meters
  cost: CostEstimate;
  polyline?: string;
  instructions?: string[];
}

export type OptimizationMode = 'fastest' | 'cheapest' | 'balanced';

export interface Route {
  id: string;
  userId?: string;
  destinations: Destination[];
  orderedStops: string[]; // destination IDs in optimized order
  startPoint: Destination;
  endPoint: Destination | null;
  optimizationMode: OptimizationMode;
  totalDuration: number; // minutes
  totalDistance: number; // meters
  totalCost: CostEstimate;
  createdAt: number;
  legs: RouteLeg[];
}

export interface DistanceMatrixElement {
  duration: number; // seconds
  distance: number; // meters
  cost?: CostEstimate;
}

export type DistanceMatrix = DistanceMatrixElement[][];

export interface OptimizationResult {
  orderedStops: string[];
  totalDuration: number;
  totalDistance: number;
  totalCost: CostEstimate;
}
