import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, User, Users, Check } from 'lucide-react';

interface DemoCredentialsAccordionProps {
  onSelectAccount: (correo: string, password: string) => void;
}

interface DemoAccount {
  nombre: string;
  correo: string;
}

interface DemoGroup {
  rol: 'Administrador' | 'Anfitrión' | 'Colaborador';
  icono: React.ElementType;
  colorBadge: string;
  borderClass: string;
  cuentas: DemoAccount[];
}

const TEMPORAL_PASSWORD = 'admin123';

const DEMO_GROUPS: DemoGroup[] = [
  {
    rol: 'Administrador',
    icono: Shield,
    colorBadge: 'bg-purple-100 text-purple-700 border-purple-200',
    borderClass: 'border-lila-light hover:border-lila-main',
    cuentas: [
      {
        nombre: 'Alejandro arispe',
        correo: 'AlejandroAdmin@gmail.com',
      },
    ],
  },
  {
    rol: 'Anfitrión',
    icono: User,
    colorBadge: 'bg-pink-100 text-pink-700 border-pink-200',
    borderClass: 'border-pink-light hover:border-pink-main',
    cuentas: [
      {
        nombre: 'Noe Ali',
        correo: 'NoeAliAnfitrion@gmail.com',
      },
      {
        nombre: 'Carlos Anfitrion',
        correo: 'CarlosAnfitrion@gmail.com',
      },
    ],
  },
  {
    rol: 'Colaborador',
    icono: Users,
    colorBadge: 'bg-sky-100 text-sky-700 border-sky-200',
    borderClass: 'border-blue-100 hover:border-blue-300',
    cuentas: [
      {
        nombre: 'Elena Colaborador',
        correo: 'ElenaColaborador@gmail.com',
      },
      {
        nombre: 'Pedro Externo',
        correo: 'pedroColaborador@gmail.com',
      },
    ],
  },
];

export default function DemoCredentialsAccordion({ onSelectAccount }: DemoCredentialsAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  // Verificación adicional de entorno local
  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname === '[::1]');

  if (!isLocalHost) {
    return null;
  }

  const handleSelect = (correo: string) => {
    setSelectedEmail(correo);
    onSelectAccount(correo, TEMPORAL_PASSWORD);
  };

  return (
    <div className="mt-3 w-full border border-lila-light/80 rounded-2xl overflow-hidden bg-purple-50/30 transition-all text-xs sm:text-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left font-semibold text-text-dark hover:bg-lila-light/20 transition-colors focus:outline-none min-h-[44px]"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 font-bold text-gray-700">
          🔐 Credenciales de ingreso
        </span>
        <span className="text-lila-main">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-lila-light/40 bg-white/70 max-h-64 overflow-y-auto">
          <p className="text-[11px] text-gray-500 italic">
            Selecciona una cuenta para rellenar correo y contraseña temporal:
          </p>
          {DEMO_GROUPS.map((group) => {
            const Icon = group.icono;
            return (
              <div key={group.rol} className="space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <Icon className="w-3.5 h-3.5 text-lila-main" />
                  <span>{group.rol}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.cuentas.map((cuenta) => {
                    const isSelected = selectedEmail === cuenta.correo;
                    return (
                      <button
                        key={cuenta.correo}
                        type="button"
                        onClick={() => handleSelect(cuenta.correo)}
                        className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between text-xs min-h-[40px] ${
                          isSelected
                            ? 'bg-lila-light/40 border-lila-main text-lila-main shadow-sm'
                            : `bg-white/90 ${group.borderClass} text-gray-700 hover:bg-purple-50/40`
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-gray-800 truncate text-[11px] sm:text-xs">
                            {cuenta.nombre}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-gray-500 truncate font-mono">
                            {cuenta.correo}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${group.colorBadge}`}>
                            {group.rol}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-lila-main ml-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
