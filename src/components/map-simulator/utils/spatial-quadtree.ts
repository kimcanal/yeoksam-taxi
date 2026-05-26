export type QuadPoint<Value> = {
  x: number;
  y: number;
  value: Value;
};

export type QuadBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type QuadNode<Value> = {
  bounds: QuadBounds;
  depth: number;
  points: QuadPoint<Value>[];
  children: QuadNode<Value>[] | null;
};

const DEFAULT_MAX_POINTS = 32;
const DEFAULT_MAX_DEPTH = 8;

function contains(bounds: QuadBounds, point: Pick<QuadPoint<unknown>, "x" | "y">) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

function intersects(left: QuadBounds, right: QuadBounds) {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

function subdivide<Value>(node: QuadNode<Value>) {
  const midX = (node.bounds.minX + node.bounds.maxX) / 2;
  const midY = (node.bounds.minY + node.bounds.maxY) / 2;

  node.children = [
    {
      bounds: { minX: node.bounds.minX, minY: node.bounds.minY, maxX: midX, maxY: midY },
      depth: node.depth + 1,
      points: [],
      children: null,
    },
    {
      bounds: { minX: midX, minY: node.bounds.minY, maxX: node.bounds.maxX, maxY: midY },
      depth: node.depth + 1,
      points: [],
      children: null,
    },
    {
      bounds: { minX: node.bounds.minX, minY: midY, maxX: midX, maxY: node.bounds.maxY },
      depth: node.depth + 1,
      points: [],
      children: null,
    },
    {
      bounds: { minX: midX, minY: midY, maxX: node.bounds.maxX, maxY: node.bounds.maxY },
      depth: node.depth + 1,
      points: [],
      children: null,
    },
  ];
}

export class QuadTree<Value> {
  private readonly root: QuadNode<Value>;

  constructor(
    bounds: QuadBounds,
    private readonly maxPoints = DEFAULT_MAX_POINTS,
    private readonly maxDepth = DEFAULT_MAX_DEPTH,
  ) {
    this.root = {
      bounds,
      depth: 0,
      points: [],
      children: null,
    };
  }

  insert(point: QuadPoint<Value>) {
    this.insertIntoNode(this.root, point);
  }

  query(bounds: QuadBounds) {
    const results: QuadPoint<Value>[] = [];
    this.queryNode(this.root, bounds, results);
    return results;
  }

  private insertIntoNode(
    node: QuadNode<Value>,
    point: QuadPoint<Value>,
  ): boolean {
    if (!contains(node.bounds, point)) {
      return false;
    }

    if (
      (node.points.length < this.maxPoints || node.depth >= this.maxDepth) &&
      !node.children
    ) {
      node.points.push(point);
      return true;
    }

    if (!node.children) {
      subdivide(node);
      const currentPoints = node.points.splice(0, node.points.length);
      currentPoints.forEach((currentPoint) => {
        node.children?.some((child) => this.insertIntoNode(child, currentPoint));
      });
    }

    return node.children?.some((child) => this.insertIntoNode(child, point)) ?? false;
  }

  private queryNode(
    node: QuadNode<Value>,
    bounds: QuadBounds,
    results: QuadPoint<Value>[],
  ): void {
    if (!intersects(node.bounds, bounds)) {
      return;
    }

    node.points.forEach((point) => {
      if (contains(bounds, point)) {
        results.push(point);
      }
    });

    node.children?.forEach((child) => {
      this.queryNode(child, bounds, results);
    });
  }
}
