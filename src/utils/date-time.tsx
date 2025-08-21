export const formatDate = (date: Date | string | null) => {
  if (!date) return "Pending";
  date = date instanceof Date ? date : new Date(date);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
