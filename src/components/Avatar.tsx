const COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function colorFor(initials: string): string {
  let sum = 0;
  for (const c of initials) sum += c.charCodeAt(0);
  return COLORS[sum % COLORS.length];
}

interface AvatarProps {
  initials: string;
  size?: "sm" | "md";
  title?: string;
}

export default function Avatar({ initials, size = "md", title }: AvatarProps) {
  const sz = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${sz} ${colorFor(initials)} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 font-mono`}
      title={title}
    >
      {initials}
    </div>
  );
}
