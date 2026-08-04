export const titleCaseWords = (value = "") =>
  String(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const formatRoleLabel = (role = "") => {
  if (!role) return "";
  return titleCaseWords(String(role).replaceAll("_", " "));
};

export const formatEnumLabel = (value = "") => {
  if (!value) return "";
  return titleCaseWords(String(value).replaceAll("_", " "));
};

const ROLE_VALUE_PATTERN = /^(SUPER_ADMIN|CASE_MANAGER|TEAM_LEAD|MANAGER|FINANCE_HEAD)$/;

export const formatRoleValuesDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(formatRoleValuesDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        /role/i.test(key) && typeof nestedValue === "string"
          ? formatRoleLabel(nestedValue)
          : formatRoleValuesDeep(nestedValue),
      ])
    );
  }

  if (typeof value === "string" && ROLE_VALUE_PATTERN.test(value)) {
    return formatRoleLabel(value);
  }

  return value;
};
