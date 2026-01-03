"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SmartFilterConfig, FilterCondition } from "@/lib/supabase/types";

const FIELD_OPTIONS = [
  { value: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
  { value: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'waiting'] },
  { value: 'list_id', label: 'List', type: 'list' },
  { value: 'due_date', label: 'Due Date', type: 'date' },
  { value: 'start_date', label: 'Start Date', type: 'date' },
  { value: 'estimated_minutes', label: 'Estimate (min)', type: 'number' },
  { value: 'has_subtasks', label: 'Has Subtasks', type: 'boolean' },
  { value: 'is_recurring', label: 'Is Recurring', type: 'boolean' },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  select: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is any of' },
  ],
  date: [
    { value: 'eq', label: 'is' },
    { value: 'lt', label: 'before' },
    { value: 'lte', label: 'on or before' },
    { value: 'gt', label: 'after' },
    { value: 'gte', label: 'on or after' },
    { value: 'is_null', label: 'is not set' },
    { value: 'is_not_null', label: 'is set' },
  ],
  number: [
    { value: 'eq', label: 'equals' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'at most' },
    { value: 'gt', label: 'more than' },
    { value: 'gte', label: 'at least' },
  ],
  boolean: [
    { value: 'eq', label: 'is' },
  ],
  list: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is any of' },
    { value: 'is_null', label: 'is not set' },
  ],
};

const DATE_VALUE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'end_of_week', label: 'End of this week' },
  { value: 'end_of_month', label: 'End of this month' },
];

interface FilterBuilderProps {
  config: SmartFilterConfig;
  onChange: (config: SmartFilterConfig) => void;
  lists: { id: string; name: string }[];
}

export function FilterBuilder({ config, onChange, lists }: FilterBuilderProps) {
  function addCondition() {
    onChange({
      ...config,
      conditions: [
        ...config.conditions,
        { field: 'priority', operator: 'eq', value: 'normal' },
      ],
    });
  }

  function updateCondition(index: number, updates: Partial<FilterCondition>) {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...config, conditions: newConditions });
  }

  function removeCondition(index: number) {
    onChange({
      ...config,
      conditions: config.conditions.filter((_, i) => i !== index),
    });
  }

  function getFieldType(field: string) {
    return FIELD_OPTIONS.find(f => f.value === field)?.type || 'select';
  }

  return (
    <div className="space-y-4">
      {/* Logic toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Select
          value={config.logic}
          onValueChange={(v) => onChange({ ...config, logic: v as 'and' | 'or' })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">All</SelectItem>
            <SelectItem value="or">Any</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">of these conditions</span>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {config.conditions.map((condition, index) => {
          const fieldType = getFieldType(condition.field);
          const operators = OPERATOR_OPTIONS[fieldType] || OPERATOR_OPTIONS.select;
          const fieldConfig = FIELD_OPTIONS.find(f => f.value === condition.field);

          return (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

              {/* Field */}
              <Select
                value={condition.field}
                onValueChange={(v) => updateCondition(index, { field: v as FilterCondition['field'], value: '' })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator */}
              <Select
                value={condition.operator}
                onValueChange={(v) => updateCondition(index, { operator: v as FilterCondition['operator'] })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              {!['is_null', 'is_not_null'].includes(condition.operator) && (
                <>
                  {fieldType === 'select' && fieldConfig?.options && (
                    <Select
                      value={condition.value as string}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldConfig.options.map(o => (
                          <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'date' && (
                    <Select
                      value={condition.value as string}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_VALUE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'number' && (
                    <Input
                      type="number"
                      value={condition.value as number}
                      onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) })}
                      className="w-24"
                    />
                  )}

                  {fieldType === 'list' && (
                    <Select
                      value={condition.value as string}
                      onValueChange={(v) => updateCondition(index, { value: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select list" />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {fieldType === 'boolean' && (
                    <Select
                      value={condition.value?.toString()}
                      onValueChange={(v) => updateCondition(index, { value: v === 'true' })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
                className="ml-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>

      {/* Sort */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <Select
          value={config.sort?.field || 'created_at'}
          onValueChange={(v) => onChange({
            ...config,
            sort: { field: v, direction: config.sort?.direction || 'desc' }
          })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="estimated_minutes">Estimate</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={config.sort?.direction || 'desc'}
          onValueChange={(v) => onChange({
            ...config,
            sort: { field: config.sort?.field || 'created_at', direction: v as 'asc' | 'desc' }
          })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
