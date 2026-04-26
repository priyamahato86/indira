import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  wordmarkSize?: number;
  priority?: boolean;
};

export default function BrandLogo({
  size = 36,
  className,
  withWordmark = false,
  wordmarkSize,
  priority = false,
}: Props) {
  const wm = wordmarkSize ?? Math.round(size * 0.62);
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="Indira logo"
        width={size}
        height={size}
        priority={priority}
        className="rounded-[10px] shrink-0"
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {withWordmark && <Wordmark size={wm} />}
    </span>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span
        className="font-bold tracking-[-0.035em] bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(125deg, #1A1A1A 0%, #1A1A1A 55%, #2C68FF 100%)",
        }}
      >
        ind<span className="italic">i</span>ra
      </span>
      <span
        aria-hidden
        className="rounded-full bg-brand"
        style={{
          width: Math.max(4, size * 0.18),
          height: Math.max(4, size * 0.18),
          alignSelf: "flex-end",
          marginBottom: size * 0.08,
        }}
      />
    </span>
  );
}
