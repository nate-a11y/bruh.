import { createClient } from "@/lib/supabase/client";
import { SmartFilterConfig, FilterCondition } from "@/lib/supabase/types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays } from "date-fns";

function resolveDateValue(value: string): string {
  const today = new Date();

  switch (value) {
    case 'today':
      return format(today, 'yyyy-MM-dd');
    case 'tomorrow':
      return format(addDays(today, 1), 'yyyy-MM-dd');
    case 'yesterday':
      return format(addDays(today, -1), 'yyyy-MM-dd');
    case 'start_of_week':
      return format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'end_of_week':
      return format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'start_of_month':
      return format(startOfMonth(today), 'yyyy-MM-dd');
    case 'end_of_month':
      return format(endOfMonth(today), 'yyyy-MM-dd');
    default:
      return value;
  }
}

export function buildFilterQuery(
  baseQuery: ReturnType<ReturnType<typeof createClient>['from']>,
  config: SmartFilterConfig
) {
  let query = baseQuery;

  for (const condition of config.conditions) {
    const value = ['due_date', 'start_date', 'snoozed_until'].includes(condition.field) && typeof condition.value === 'string'
      ? resolveDateValue(condition.value as string)
      : condition.value;

    switch (condition.operator) {
      case 'eq':
        query = query.eq(condition.field, value);
        break;
      case 'neq':
        query = query.neq(condition.field, value);
        break;
      case 'gt':
        query = query.gt(condition.field, value);
        break;
      case 'gte':
        query = query.gte(condition.field, value);
        break;
      case 'lt':
        query = query.lt(condition.field, value);
        break;
      case 'lte':
        query = query.lte(condition.field, value);
        break;
      case 'in':
        query = query.in(condition.field, value as unknown[]);
        break;
      case 'not_in':
        query = query.not(condition.field, 'in', `(${(value as unknown[]).join(',')})`);
        break;
      case 'is_null':
        query = query.is(condition.field, null);
        break;
      case 'is_not_null':
        query = query.not(condition.field, 'is', null);
        break;
      case 'contains':
        query = query.contains(condition.field, value as unknown[]);
        break;
    }
  }

  if (config.sort) {
    query = query.order(config.sort.field, { ascending: config.sort.direction === 'asc' });
  }

  return query;
}

export async function executeFilter(userId: string, config: SmartFilterConfig) {
  const supabase = createClient();

  let query = supabase
    .from('zeroed_tasks')
    .select('*, zeroed_lists(id, name, color), subtasks:zeroed_tasks!parent_id(id)')
    .eq('user_id', userId)
    .is('parent_id', null); // Exclude subtasks from main results

  query = buildFilterQuery(query, config);

  const { data, error } = await query.limit(100);

  if (error) throw error;
  return data || [];
}
