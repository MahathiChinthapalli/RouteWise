import type { DistanceMatrix, OptimizationResult } from '../types';

/**
 * Brute Force TSP - Guaranteed optimal for 2-7 stops
 * Time complexity: O(n!)
 */
export function bruteForceOptimal(
  matrix: DistanceMatrix,
  startIndex: number,
  endIndex: number | null
): OptimizationResult {
  const n = matrix.length;
  const cities = Array.from({ length: n }, (_, i) => i).filter(i => i !== startIndex);

  let bestRoute: number[] = [];
  let bestDistance = Infinity;

  function permute(arr: number[], current: number[] = []) {
    if (arr.length === 0) {
      // Calculate total distance for this permutation
      const route = [startIndex, ...current];

      let distance = 0;
      for (let i = 0; i < route.length - 1; i++) {
        distance += matrix[route[i]][route[i + 1]].duration;
      }

      // Handle ending point
      if (endIndex !== null && endIndex !== startIndex) {
        // Different end point - add it
        route.push(endIndex);
        distance += matrix[route[route.length - 2]][endIndex].duration;
      } else if (endIndex === startIndex) {
        // Return to start - add the return leg
        distance += matrix[route[route.length - 1]][startIndex].duration;
        route.push(startIndex);
      } else {
        // No specific end point (endIndex === null) - also return to start
        distance += matrix[route[route.length - 1]][startIndex].duration;
        route.push(startIndex);
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestRoute = [...route];
      }
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      permute(remaining, [...current, arr[i]]);
    }
  }

  permute(cities);

  return calculateRouteMetrics(bestRoute, matrix);
}

/**
 * Held-Karp Dynamic Programming - Exact solution for 8-10 stops
 * Time complexity: O(n² * 2ⁿ)
 */
export function heldKarpDP(
  matrix: DistanceMatrix,
  startIndex: number,
  endIndex: number | null
): OptimizationResult {
  const n = matrix.length;
  const allCities = Array.from({ length: n }, (_, i) => i);
  const cities = allCities.filter(i => i !== startIndex);

  // DP table: dp[mask][i] = min cost to visit cities in mask ending at i
  const dp = new Map<string, number>();
  const parent = new Map<string, number>();

  // Base case: direct paths from start
  for (const city of cities) {
    const mask = 1 << city;
    const key = `${mask},${city}`;
    dp.set(key, matrix[startIndex][city].duration);
    parent.set(key, startIndex);
  }

  // Build up subsets
  for (let size = 2; size <= cities.length; size++) {
    const subsets = generateSubsets(cities, size);

    for (const subset of subsets) {
      const mask = getMask(subset);

      for (const last of subset) {
        const prevMask = mask ^ (1 << last);
        let minCost = Infinity;
        let bestPrev = -1;

        for (const prev of subset) {
          if (prev === last) continue;

          const prevKey = `${prevMask},${prev}`;
          const prevCost = dp.get(prevKey) || Infinity;
          const cost = prevCost + matrix[prev][last].duration;

          if (cost < minCost) {
            minCost = cost;
            bestPrev = prev;
          }
        }

        const key = `${mask},${last}`;
        dp.set(key, minCost);
        parent.set(key, bestPrev);
      }
    }
  }

  // Find best ending city
  const fullMask = getMask(cities);
  let minCost = Infinity;
  let bestLast = -1;

  for (const city of cities) {
    const key = `${fullMask},${city}`;
    const cost = dp.get(key) || Infinity;
    const totalCost = endIndex !== null && endIndex !== startIndex
      ? cost + matrix[city][endIndex].duration
      : cost + matrix[city][startIndex].duration;

    if (totalCost < minCost) {
      minCost = totalCost;
      bestLast = city;
    }
  }

  // Reconstruct path
  const route = reconstructPath(parent, fullMask, bestLast, startIndex, cities);

  // Handle ending point
  if (endIndex !== null && endIndex !== startIndex) {
    route.push(endIndex);
  } else {
    // Return to start (both when endIndex === startIndex and endIndex === null)
    route.push(startIndex);
  }

  return calculateRouteMetrics(route, matrix);
}

/**
 * Nearest Neighbor + 2-opt - Heuristic for 11-15 stops
 * Fast approximate solution
 */
export function nearestNeighbor2Opt(
  matrix: DistanceMatrix,
  startIndex: number,
  endIndex: number | null
): OptimizationResult {
  const route = nearestNeighborGreedy(matrix, startIndex, endIndex);
  const optimizedRoute = twoOptImprove(route, matrix);
  return calculateRouteMetrics(optimizedRoute, matrix);
}

/**
 * Greedy nearest neighbor algorithm
 */
function nearestNeighborGreedy(
  matrix: DistanceMatrix,
  startIndex: number,
  endIndex: number | null
): number[] {
  const n = matrix.length;
  const unvisited = new Set(Array.from({ length: n }, (_, i) => i));
  unvisited.delete(startIndex);
  if (endIndex !== null && endIndex !== startIndex) {
    unvisited.delete(endIndex);
  }

  const route = [startIndex];
  let current = startIndex;

  while (unvisited.size > 0) {
    let nearest = -1;
    let minDistance = Infinity;

    for (const city of unvisited) {
      const distance = matrix[current][city].duration;
      if (distance < minDistance) {
        minDistance = distance;
        nearest = city;
      }
    }

    route.push(nearest);
    unvisited.delete(nearest);
    current = nearest;
  }

  // Handle ending point
  if (endIndex !== null && endIndex !== startIndex) {
    route.push(endIndex);
  } else {
    // Return to start (both when endIndex === startIndex and endIndex === null)
    route.push(startIndex);
  }

  return route;
}

/**
 * 2-opt local optimization
 * Improves route by reversing segments
 */
function twoOptImprove(route: number[], matrix: DistanceMatrix): number[] {
  let improved = true;
  let bestRoute = [...route];

  while (improved) {
    improved = false;

    for (let i = 1; i < bestRoute.length - 2; i++) {
      for (let j = i + 1; j < bestRoute.length - 1; j++) {
        const newRoute = twoOptSwap(bestRoute, i, j);

        if (calculateTotalDistance(newRoute, matrix) < calculateTotalDistance(bestRoute, matrix)) {
          bestRoute = newRoute;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Perform 2-opt swap by reversing segment between i and j
 */
function twoOptSwap(route: number[], i: number, j: number): number[] {
  const newRoute = [
    ...route.slice(0, i),
    ...route.slice(i, j + 1).reverse(),
    ...route.slice(j + 1)
  ];
  return newRoute;
}

/**
 * Calculate total distance for a route
 */
function calculateTotalDistance(route: number[], matrix: DistanceMatrix): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += matrix[route[i]][route[i + 1]].duration;
  }
  return total;
}

/**
 * Calculate complete route metrics
 */
function calculateRouteMetrics(route: number[], matrix: DistanceMatrix): OptimizationResult {
  let totalDuration = 0;
  let totalDistance = 0;
  let minCost = 0;
  let maxCost = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const element = matrix[route[i]][route[i + 1]];
    totalDuration += element.duration;
    totalDistance += element.distance;
    if (element.cost) {
      minCost += element.cost.min;
      maxCost += element.cost.max;
    }
  }

  return {
    orderedStops: route.map(String),
    totalDuration: Math.round(totalDuration / 60), // Convert to minutes
    totalDistance,
    totalCost: { min: minCost, max: maxCost }
  };
}

/**
 * Helper: Generate all subsets of given size
 */
function generateSubsets(arr: number[], size: number): number[][] {
  const result: number[][] = [];

  function generate(start: number, current: number[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      generate(i + 1, current);
      current.pop();
    }
  }

  generate(0, []);
  return result;
}

/**
 * Helper: Convert city array to bitmask
 */
function getMask(cities: number[]): number {
  let mask = 0;
  for (const city of cities) {
    mask |= (1 << city);
  }
  return mask;
}

/**
 * Helper: Reconstruct path from parent map
 */
function reconstructPath(
  parent: Map<string, number>,
  mask: number,
  last: number,
  start: number,
  _cities: number[]
): number[] {
  const path: number[] = [];
  let current = last;
  let currentMask = mask;

  while (current !== start) {
    path.unshift(current);
    const key = `${currentMask},${current}`;
    const prev = parent.get(key);
    if (prev === undefined) break;

    currentMask ^= (1 << current);
    current = prev;
  }

  path.unshift(start);
  return path;
}

/**
 * Main optimization function that selects algorithm based on problem size
 */
export function optimizeRoute(
  matrix: DistanceMatrix,
  startIndex: number,
  endIndex: number | null
): OptimizationResult {
  const n = matrix.length;

  if (n <= 7) {
    return bruteForceOptimal(matrix, startIndex, endIndex);
  } else if (n <= 10) {
    return heldKarpDP(matrix, startIndex, endIndex);
  } else {
    return nearestNeighbor2Opt(matrix, startIndex, endIndex);
  }
}
