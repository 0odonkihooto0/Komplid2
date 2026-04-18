/** Вспомогательные типы и функции для иерархических справочников */

export type TreeRow = Record<string, unknown> & {
  __children: TreeRow[];
  __depth: number;
};

export function buildTree(flat: Record<string, unknown>[], parentKey: string): TreeRow[] {
  const map = new Map<string, TreeRow>();
  for (const item of flat) {
    map.set(item.id as string, { ...item, __children: [], __depth: 0 });
  }
  const roots: TreeRow[] = [];
  for (const item of flat) {
    const node = map.get(item.id as string)!;
    const parentId = item[parentKey] as string | null | undefined;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.__children.push(node);
    } else {
      roots.push(node);
    }
  }
  const assignDepth = (nodes: TreeRow[], depth: number) => {
    for (const n of nodes) {
      n.__depth = depth;
      assignDepth(n.__children, depth + 1);
    }
  };
  assignDepth(roots, 0);
  return roots;
}

export function flattenVisible(nodes: TreeRow[], expandedIds: Set<string>): TreeRow[] {
  const result: TreeRow[] = [];
  const walk = (items: TreeRow[]) => {
    for (const node of items) {
      result.push(node);
      if (expandedIds.has(node.id as string) && node.__children.length > 0) {
        walk(node.__children);
      }
    }
  };
  walk(nodes);
  return result;
}
