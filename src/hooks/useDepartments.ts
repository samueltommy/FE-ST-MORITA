import { useSystemChoices, SelectOption, DEFAULT_DIVISIONS } from './useSystemChoices';

export interface DepartmentOption extends SelectOption {}

export function useDepartments() {
  const { data, loading, error, refetch } = useSystemChoices('departments');
  const departments: DepartmentOption[] =
    Array.isArray(data) && data.length > 0 ? data : DEFAULT_DIVISIONS;

  return { departments, loading, error, refetch };
}
