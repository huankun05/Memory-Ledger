import { Location, LocationMapNode, LocationLayout } from '../types';

interface BuildTreeOptions {
  parentId?: string;
  level?: number;
}

function buildTree(
  locations: Location[],
  itemCountMap: Record<string, number>,
  options: BuildTreeOptions = {}
): LocationMapNode[] {
  const { parentId, level = 0 } = options;
  const children = locations.filter((l) => l.parentId === parentId);

  return children.map((loc) => {
    const childNodes = buildTree(locations, itemCountMap, {
      parentId: loc.id,
      level: level + 1,
    });
    const childItemCount = childNodes.reduce((sum, n) => sum + n.itemCount, 0);
    return {
      ...loc,
      level,
      children: childNodes,
      itemCount: (itemCountMap[loc.id] || 0) + childItemCount,
      layout: loc.layout || {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        shape: 'rounded' as const,
      },
    };
  });
}

function calculateGridLayout(
  nodes: LocationMapNode[],
  containerX: number,
  containerY: number,
  containerW: number,
  containerH: number,
  padding: number = 3
): void {
  const count = nodes.length;
  if (count === 0) return;

  if (count === 1) {
    nodes[0].layout = {
      x: containerX + padding,
      y: containerY + padding,
      width: containerW - padding * 2,
      height: containerH - padding * 2,
      shape: 'rounded',
    };
    return;
  }

  let cols = Math.ceil(Math.sqrt(count));
  let rows = Math.ceil(count / cols);

  if (containerW > containerH * 1.5) {
    cols = Math.min(count, Math.ceil(Math.sqrt(count * 2)));
    rows = Math.ceil(count / cols);
  } else if (containerH > containerW * 1.5) {
    rows = Math.min(count, Math.ceil(Math.sqrt(count * 2)));
    cols = Math.ceil(count / rows);
  }

  const cellW = (containerW - padding * (cols + 1)) / cols;
  const cellH = (containerH - padding * (rows + 1)) / rows;

  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    node.layout = {
      x: containerX + padding + col * (cellW + padding),
      y: containerY + padding + row * (cellH + padding),
      width: cellW,
      height: cellH,
      shape: 'rounded',
    };
  });
}

function layoutRecursive(
  nodes: LocationMapNode[],
  containerX: number,
  containerY: number,
  containerW: number,
  containerH: number,
  level: number = 0
): void {
  if (nodes.length === 0) return;

  const innerPadding = 2 + level * 0.5;

  calculateGridLayout(nodes, containerX, containerY, containerW, containerH, innerPadding);

  nodes.forEach((node) => {
    if (node.children.length > 0) {
      const titleAreaH = Math.min(16, node.layout.height * 0.18);
      layoutRecursive(
        node.children,
        node.layout.x + 1,
        node.layout.y + titleAreaH + 1,
        node.layout.width - 2,
        node.layout.height - titleAreaH - 2,
        level + 1
      );
    }
  });
}

export function generateAutoLayout(
  locations: Location[],
  items: { locationId?: string }[]
): LocationMapNode[] {
  const itemCountMap: Record<string, number> = {};
  items.forEach((item) => {
    if (item.locationId) {
      itemCountMap[item.locationId] = (itemCountMap[item.locationId] || 0) + 1;
    }
  });

  const rootNodes = buildTree(locations, itemCountMap);

  if (rootNodes.length === 0) {
    return [];
  }

  layoutRecursive(rootNodes, 0, 0, 100, 100, 0);

  return rootNodes;
}

export function findNodeById(nodes: LocationMapNode[], id: string): LocationMapNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function getAncestorIds(nodes: LocationMapNode[], targetId: string): string[] {
  const path: string[] = [];

  function dfs(currentNodes: LocationMapNode[], trail: string[]): boolean {
    for (const node of currentNodes) {
      const newTrail = [...trail, node.id];
      if (node.id === targetId) {
        path.push(...trail);
        return true;
      }
      if (dfs(node.children, newTrail)) {
        return true;
      }
    }
    return false;
  }

  dfs(nodes, []);
  return path;
}

export function getLocationBreadcrumb(
  locations: Location[],
  locationId?: string
): Location[] {
  if (!locationId) return [];
  const result: Location[] = [];
  let currentId: string | undefined = locationId;

  while (currentId) {
    const loc = locations.find((l) => l.id === currentId);
    if (!loc) break;
    result.unshift(loc);
    currentId = loc.parentId;
  }

  return result;
}

export function getSingleLevelLayout(
  locations: Location[],
  items: { locationId?: string }[],
  parentId?: string
): LocationMapNode[] {
  const itemCountMap: Record<string, number> = {};
  items.forEach((item) => {
    if (item.locationId) {
      itemCountMap[item.locationId] = (itemCountMap[item.locationId] || 0) + 1;
    }
  });

  const childLocations = locations.filter((l) => l.parentId === parentId);

  const nodes: LocationMapNode[] = childLocations.map((loc) => {
    const childLocs = locations.filter((l) => l.parentId === loc.id);
    const childItemCount = childLocs.reduce((sum, cl) => {
      return sum + (itemCountMap[cl.id] || 0);
    }, 0);

    return {
      ...loc,
      level: 0,
      children: [],
      itemCount: (itemCountMap[loc.id] || 0) + childItemCount,
      layout: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        shape: 'rounded',
      },
    };
  });

  if (nodes.length > 0) {
    calculateGridLayout(nodes, 0, 0, 100, 100, 4);
  }

  return nodes;
}

export function hasChildren(locations: Location[], locationId: string): boolean {
  return locations.some((l) => l.parentId === locationId);
}
