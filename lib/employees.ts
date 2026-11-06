export type Employee = {
  id: string;
  name: string;
  position: string;
  department: string;
  responsibilities: string[];
  searchTerms: string[];
  email: string;
  phone: string;
  room: string;
  hours: string;
  topic: string;
};

export function normalizeEmployeeSearch(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function findEmployees(
  employees: Employee[],
  query: string,
  department = "all",
) {
  const words = normalizeEmployeeSearch(query).split(" ").filter(Boolean);
  return employees.filter((employee) => {
    if (department !== "all" && employee.department !== department)
      return false;
    const text = normalizeEmployeeSearch(
      [
        employee.name,
        employee.position,
        employee.department,
        ...employee.responsibilities,
        ...employee.searchTerms,
      ].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}
