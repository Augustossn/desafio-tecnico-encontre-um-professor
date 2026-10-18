type Name =
  | "arrow"
  | "search"
  | "calendar"
  | "clock"
  | "globe"
  | "check"
  | "spark"
  | "close"
  | "chevron"
  | "grid";
const paths: Record<Name, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2m2 10h2m3 0h2m3 0h1m-11 4h2m3 0h2",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  globe:
    "M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20m10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m5 12 4 4L19 6",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m9 5 7 7-7 7",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
};
export function Icon({ name, size = 20 }: { name: Name; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
