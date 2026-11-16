// A round badge with the person's initials.
export default function Avatar({ name = '', size = 'h-9 w-9 text-sm' }) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full bg-orange font-display font-semibold text-black ${size}`}>{initials}</span>;
}
