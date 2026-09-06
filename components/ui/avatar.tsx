import Image from "next/image";

export function Avatar({ name, src, size = "md" }: { name: string; src?: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  const dimensions = { sm: 28, md: 36, lg: 48 };
  return src ? <Image src={src} alt={name} width={dimensions[size]} height={dimensions[size]} unoptimized className={`${sizes[size]} rounded-full object-cover`} /> : <span aria-label={name} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#d8e2da] font-semibold text-[#315348] ${sizes[size]}`}>{initials || "?"}</span>;
}