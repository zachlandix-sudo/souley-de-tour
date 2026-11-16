// The same page opening on every admin page: a small orange label, a big serif title, a line of help, actions on the right.
export default function AdminHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="adm-head">
      <div className="min-w-0">
        {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-4xl leading-[1.05] md:text-5xl">{title}</h1>
        {subtitle && <p className="adm-sub">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
