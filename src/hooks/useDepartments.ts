import { useSystemChoices, SelectOption } from './useSystemChoices';

export interface DepartmentOption extends SelectOption {}

export function useDepartments() {
  const { data, loading, error, refetch } = useSystemChoices('departments');
  const departments: DepartmentOption[] = Array.isArray(data) ? data : [];

  return { departments, loading, error, refetch };
}
