import type { Category, CategoryRule } from '../schema';
import type { SqlDb } from '../sql';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: Category['kind'];
  is_default: number;
}

interface RuleRow {
  id: string;
  match_type: CategoryRule['matchType'];
  pattern: string;
  category_id: string;
  priority: number;
  created_by: CategoryRule['createdBy'];
}

export async function listCategories(db: SqlDb): Promise<Category[]> {
  const rows = await db.all<CategoryRow>('SELECT id, name, icon, color, kind, is_default FROM categories ORDER BY sort, rowid');
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, color: r.color, kind: r.kind, isDefault: r.is_default === 1 }));
}

export async function upsertCategory(db: SqlDb, c: Category, sort: number): Promise<void> {
  await db.run(
    'INSERT INTO categories (id, name, icon, color, kind, is_default, sort) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon, color = excluded.color, kind = excluded.kind',
    [c.id, c.name, c.icon, c.color, c.kind, c.isDefault ? 1 : 0, sort],
  );
}

// Rules and budgets for the category go with it (ON DELETE CASCADE); move its transactions first.
export async function deleteCategory(db: SqlDb, id: string): Promise<void> {
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
}

export async function listRules(db: SqlDb): Promise<CategoryRule[]> {
  const rows = await db.all<RuleRow>('SELECT id, match_type, pattern, category_id, priority, created_by FROM category_rules ORDER BY priority');
  return rows.map((r) => ({ id: r.id, matchType: r.match_type, pattern: r.pattern, categoryId: r.category_id, priority: r.priority, createdBy: r.created_by }));
}

export async function upsertRule(db: SqlDb, r: CategoryRule): Promise<void> {
  await db.run(
    'INSERT INTO category_rules (id, match_type, pattern, category_id, priority, created_by) VALUES (?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET pattern = excluded.pattern, category_id = excluded.category_id, priority = excluded.priority',
    [r.id, r.matchType, r.pattern, r.categoryId, r.priority, r.createdBy],
  );
}
