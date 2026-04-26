import BrandLogo from "./BrandLogo";

const columns = [
  {
    heading: "Product",
    links: ["Pre-claim audit", "Appeal generator", "Insurer benchmark", "Pricing"],
  },
  {
    heading: "For business",
    links: ["TPAs", "Hospitals", "Insurance brokers", "Developers"],
  },
  {
    heading: "Resources",
    links: ["IRDAI guide", "Ombudsman wins", "Blog", "Help center"],
  },
  {
    heading: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[color:var(--color-line)]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="text-[color:var(--color-ink)]">
              <BrandLogo size={36} withWordmark wordmarkSize={20} />
            </div>
            <p className="mt-4 max-w-[320px] text-[14px] leading-[1.6] text-[color:var(--color-muted)]">
              The independent second-opinion layer between every Indian
              policyholder and their insurer.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <ComplianceBadge label="DPDP" />
              <ComplianceBadge label="ISO 27001" />
              <ComplianceBadge label="SOC 2" />
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {columns.map((c) => (
              <div key={c.heading}>
                <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand)] mb-4">
                  {c.heading}
                </div>
                <ul className="space-y-3">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-[14px] text-[color:var(--color-muted)] hover:text-[color:var(--color-brand)] transition-colors"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[color:var(--color-line)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[13px] text-[color:var(--color-muted)]">
            © 2026 Indira Technologies Pvt. Ltd. Not affiliated with any
            insurer or IRDAI.
          </p>
          <div className="flex items-center gap-5 text-[13px] text-[color:var(--color-muted)]">
            <a href="#" className="hover:text-[color:var(--color-brand)]">
              Privacy
            </a>
            <a href="#" className="hover:text-[color:var(--color-brand)]">
              Terms
            </a>
            <a href="#" className="hover:text-[color:var(--color-brand)]">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ComplianceBadge({ label }: { label: string }) {
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--color-line)] text-[10px] font-bold text-[color:var(--color-muted)] text-center leading-tight px-1"
      aria-label={`${label} compliant`}
    >
      {label}
    </div>
  );
}
