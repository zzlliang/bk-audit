export interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

export interface FilterGroup {
  connector: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface FilterRulesData {
  connector: 'and' | 'or';
  groups: FilterGroup[];
}

export interface FieldOption {
  label: string;
  value: string;
}

export const FILTER_OPERATORS = [
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
  { label: 'in', value: 'in' },
  { label: 'not_in', value: 'not_in' },
  { label: 'contains', value: 'contains' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
];

export const createDefaultCondition = (): FilterCondition => ({
  field: '',
  operator: '=',
  value: '',
});

export const createDefaultFilterRules = (): FilterRulesData => ({
  connector: 'or',
  groups: [{
    connector: 'and',
    conditions: [createDefaultCondition()],
  }],
});

const isFlatRule = (rule: Record<string, any>) => (
  typeof rule.field === 'string'
  && typeof rule.operator === 'string'
  && 'value' in rule
);

export const parseFilterRules = (rules: Record<string, any>[] = []): FilterRulesData => {
  if (!rules.length) {
    return createDefaultFilterRules();
  }

  const firstRule = rules[0];
  if (firstRule?.groups && Array.isArray(firstRule.groups)) {
    return {
      connector: firstRule.connector === 'and' ? 'and' : 'or',
      groups: firstRule.groups.map((group: Record<string, any>) => ({
        connector: group.connector === 'or' ? 'or' : 'and',
        conditions: (group.conditions || []).map((condition: Record<string, any>) => ({
          field: condition.field || '',
          operator: condition.operator || '=',
          value: condition.value ?? '',
        })),
      })),
    };
  }

  const flatRules = rules.filter(isFlatRule);
  if (!flatRules.length) {
    return createDefaultFilterRules();
  }

  return {
    connector: 'or',
    groups: [{
      connector: 'and',
      conditions: flatRules.map(rule => ({
        field: rule.field || '',
        operator: rule.operator || '=',
        value: rule.value ?? '',
      })),
    }],
  };
};

export const serializeFilterRules = (rules: FilterRulesData, enabled: boolean): Record<string, any>[] => {
  if (!enabled) {
    return [];
  }

  const groups = rules.groups
    .map(group => ({
      connector: group.connector,
      conditions: group.conditions
        .filter(condition => condition.field && condition.operator)
        .map(condition => ({
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
        })),
    }))
    .filter(group => group.conditions.length > 0);

  if (!groups.length) {
    return [];
  }

  return [{
    connector: rules.connector,
    groups,
  }];
};

export const countFilterConditions = (rules: FilterRulesData) => (
  rules.groups.reduce((total, group) => total + group.conditions.length, 0)
);
