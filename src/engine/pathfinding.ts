// A* Pathfinding on walkable polygon
// The Marble Swindle - Engine Module

import { Point, Polygon } from '@/types/game';

interface PathNode {
  point: Point;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to end)
  f: number; // g + h
  parent: PathNode | null;
}

// Check if a point is inside a polygon using ray casting
export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { points } = polygon;
  let inside = false;
  const n = points.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

// Get the closest point inside the polygon to a given point
export function getClosestPointInPolygon(point: Point, polygon: Polygon): Point {
  if (isPointInPolygon(point, polygon)) {
    return point;
  }

  const { points } = polygon;
  let closestPoint = points[0];
  let minDist = Infinity;

  // Check each edge of the polygon
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    const closest = closestPointOnLineSegment(point, p1, p2);
    const dist = distance(point, closest);

    if (dist < minDist) {
      minDist = dist;
      closestPoint = closest;
    }
  }

  // Move slightly inside the polygon
  const center = getPolygonCenter(polygon);
  const dx = center.x - closestPoint.x;
  const dy = center.y - closestPoint.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len > 0) {
    return {
      x: closestPoint.x + (dx / len) * 2,
      y: closestPoint.y + (dy / len) * 2,
    };
  }

  return closestPoint;
}

function closestPointOnLineSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return a;

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
}

function getPolygonCenter(polygon: Polygon): Point {
  const { points } = polygon;
  let x = 0;
  let y = 0;

  for (const p of points) {
    x += p.x;
    y += p.y;
  }

  return {
    x: x / points.length,
    y: y / points.length,
  };
}

export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if line segment intersects polygon boundary
function lineIntersectsPolygonBoundary(
  start: Point,
  end: Point,
  polygon: Polygon
): boolean {
  const { points } = polygon;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    if (lineSegmentsIntersect(start, end, p1, p2)) {
      return true;
    }
  }

  return false;
}

function lineSegmentsIntersect(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;

  return false;
}

function direction(a: Point, b: Point, c: Point): number {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    Math.min(a.x, b.x) <= c.x &&
    c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y &&
    c.y <= Math.max(a.y, b.y)
  );
}

// Check if can walk directly from point A to point B
export function canWalkDirectly(
  start: Point,
  end: Point,
  polygon: Polygon
): boolean {
  // Both points must be inside polygon
  if (!isPointInPolygon(start, polygon) || !isPointInPolygon(end, polygon)) {
    return false;
  }

  // Check midpoint is also inside (for concave polygons)
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  if (!isPointInPolygon(mid, polygon)) {
    return false;
  }

  // More thorough check: sample points along line
  const samples = 5;
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const sample = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    if (!isPointInPolygon(sample, polygon)) {
      return false;
    }
  }

  return true;
}

// Generate navigation mesh nodes from polygon
function generateNavNodes(polygon: Polygon, gridSize: number = 30): Point[] {
  const { points } = polygon;
  const nodes: Point[] = [];

  // Find bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  // Add grid points inside polygon
  for (let x = minX; x <= maxX; x += gridSize) {
    for (let y = minY; y <= maxY; y += gridSize) {
      const point = { x, y };
      if (isPointInPolygon(point, polygon)) {
        nodes.push(point);
      }
    }
  }

  // Add polygon vertices (slightly inset)
  const center = getPolygonCenter(polygon);
  for (const p of points) {
    const dx = center.x - p.x;
    const dy = center.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const inset = {
        x: p.x + (dx / len) * 15,
        y: p.y + (dy / len) * 15,
      };
      if (isPointInPolygon(inset, polygon)) {
        nodes.push(inset);
      }
    }
  }

  return nodes;
}

// A* pathfinding
export function findPath(
  start: Point,
  end: Point,
  polygon: Polygon
): Point[] {
  // Make sure points are inside polygon
  const actualStart = getClosestPointInPolygon(start, polygon);
  const actualEnd = getClosestPointInPolygon(end, polygon);

  // Can we walk directly?
  if (canWalkDirectly(actualStart, actualEnd, polygon)) {
    return [actualStart, actualEnd];
  }

  // Generate nav mesh
  const nodes = generateNavNodes(polygon);
  nodes.push(actualStart);
  nodes.push(actualEnd);

  // A* algorithm
  const openSet: PathNode[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: PathNode = {
    point: actualStart,
    g: 0,
    h: distance(actualStart, actualEnd),
    f: distance(actualStart, actualEnd),
    parent: null,
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.point.x},${current.point.y}`;

    // Found the goal?
    if (distance(current.point, actualEnd) < 5) {
      // Reconstruct path
      const path: Point[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift(node.point);
        node = node.parent;
      }
      return smoothPath(path, polygon);
    }

    closedSet.add(currentKey);

    // Check all potential neighbors
    for (const neighborPoint of nodes) {
      const neighborKey = `${neighborPoint.x},${neighborPoint.y}`;

      if (closedSet.has(neighborKey)) continue;
      if (!canWalkDirectly(current.point, neighborPoint, polygon)) continue;

      const g = current.g + distance(current.point, neighborPoint);
      const h = distance(neighborPoint, actualEnd);
      const f = g + h;

      // Check if already in open set with better score
      const existing = openSet.find(
        (n) => n.point.x === neighborPoint.x && n.point.y === neighborPoint.y
      );

      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openSet.push({
          point: neighborPoint,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  // No path found, return direct line (will be clamped to polygon)
  return [actualStart, actualEnd];
}

// Smooth path by removing unnecessary waypoints
function smoothPath(path: Point[], polygon: Polygon): Point[] {
  if (path.length <= 2) return path;

  const smoothed: Point[] = [path[0]];
  let current = 0;

  while (current < path.length - 1) {
    // Find furthest visible point
    let furthest = current + 1;

    for (let i = path.length - 1; i > current + 1; i--) {
      if (canWalkDirectly(path[current], path[i], polygon)) {
        furthest = i;
        break;
      }
    }

    smoothed.push(path[furthest]);
    current = furthest;
  }

  return smoothed;
}

// Get direction from point A to point B
export function getDirection(from: Point, to: Point): 'left' | 'right' {
  return to.x < from.x ? 'left' : 'right';
}

// Interpolate position along path
export function interpolatePath(
  path: Point[],
  distanceTraveled: number
): { position: Point; segmentIndex: number; finished: boolean } {
  if (path.length < 2) {
    return { position: path[0] || { x: 0, y: 0 }, segmentIndex: 0, finished: true };
  }

  let remaining = distanceTraveled;

  for (let i = 0; i < path.length - 1; i++) {
    const segmentLength = distance(path[i], path[i + 1]);

    if (remaining <= segmentLength) {
      const t = remaining / segmentLength;
      return {
        position: {
          x: path[i].x + (path[i + 1].x - path[i].x) * t,
          y: path[i].y + (path[i + 1].y - path[i].y) * t,
        },
        segmentIndex: i,
        finished: false,
      };
    }

    remaining -= segmentLength;
  }

  return {
    position: path[path.length - 1],
    segmentIndex: path.length - 2,
    finished: true,
  };
}

// Calculate total path length
export function getPathLength(path: Point[]): number {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    length += distance(path[i], path[i + 1]);
  }
  return length;
}
