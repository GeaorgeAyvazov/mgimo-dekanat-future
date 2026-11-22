import type { PublicContact } from "./public-contacts";

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

export function findPublicContacts(contacts: PublicContact[], query: string, subject = "all") {
  const words = normalizeEmployeeSearch(query).split(" ").filter(Boolean);
  return contacts.filter((contact) => {
    if (subject !== "all" && contact.subject !== subject) return false;
    const text = normalizeEmployeeSearch([contact.name, contact.subject, contact.detail, contact.keywords,
      contact.email, ...contact.phones, contact.room].join(" "));
    return words.every((word) => text.includes(word));
  });
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
