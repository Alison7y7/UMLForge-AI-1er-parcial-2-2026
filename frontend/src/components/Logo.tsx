export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="40" width="30" height="20" rx="4" fill="#8B5CF6" />
      <rect x="60" y="15" width="30" height="20" rx="4" fill="#F9A8D4" />
      <rect x="60" y="65" width="30" height="20" rx="4" fill="#BAE6FD" />
      <path d="M40 50 L60 25 M40 50 L60 75" stroke="#374151" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />
      {/* Detalles IA / Nodos interiores */}
      <circle cx="25" cy="50" r="3" fill="#FFFFFF" />
      <circle cx="75" cy="25" r="3" fill="#FFFFFF" />
      <circle cx="75" cy="75" r="3" fill="#FFFFFF" />
      {/* Elemento decorativo suave AI */}
      <path d="M45 40 Q 50 30 55 35 T 65 45" stroke="#F9A8D4" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  );
}
