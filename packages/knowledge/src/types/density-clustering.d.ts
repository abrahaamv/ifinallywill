/**
 * Type definitions for density-clustering
 * DBSCAN clustering algorithm implementation
 */

declare module 'density-clustering' {
  export default class DBSCAN {
    /**
     * Run DBSCAN clustering algorithm
     *
     * @param dataset - Array of data points (each point is an array of numbers)
     * @param epsilon - Maximum distance between two points to be considered neighbors
     * @param minPoints - Minimum number of points required to form a dense region
     * @param distanceFunction - Function to calculate distance between two points
     * @returns Array of clusters, where each cluster is an array of point indices
     */
    run(
      dataset: number[][],
      epsilon: number,
      minPoints: number,
      distanceFunction?: (a: number[], b: number[]) => number
    ): number[][];

    /**
     * Noise points (outliers) from last clustering run
     */
    noise: number[];
  }
}
