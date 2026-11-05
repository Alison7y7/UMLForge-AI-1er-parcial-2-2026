import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { Eye, EyeOff, Mail, Lock, ArrowRight, User, Briefcase, Sparkles, Code, GitMerge } from 'lucide-react';
import Logo from '../components/Logo';
import PwaInstallButton from '../components/pwa/PwaInstallButton';

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rol, setRol] = useState('ANFITRION');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', { 
        nombre, 
        apellido, 
        correo, 
        password, 
        rol 
      });
      setSuccess('Cuenta creada correctamente. Ya puedes iniciar sesión.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white relative overflow-hidden flex items-center justify-center font-sans py-6 px-4 sm:px-6">
      
      {/* Botón de instalación PWA con respeto a safe areas */}
      <div 
        className="absolute top-4 right-4 z-30"
        style={{
          top: 'max(1rem, env(safe-area-inset-top, 0px))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <PwaInstallButton />
      </div>

      {/* Background Decorativo Suave */}
      <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-lila-light rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[20%] w-[20rem] h-[20rem] bg-blue-pastel rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"></div>

      {/* Lineas curvas decorativas */}
      <svg className="absolute top-0 left-0 w-48 sm:w-64 h-48 sm:h-64 opacity-20 pointer-events-none" viewBox="0 0 100 100" fill="none">
        <path d="M0,0 L100,0 C100,0 50,50 0,100 Z" fill="url(#grad1)" />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F9A8D4" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
      
      <svg className="absolute bottom-0 right-0 w-48 sm:w-64 h-48 sm:h-64 opacity-20 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none">
        <path d="M0,0 L100,0 C100,0 50,50 0,100 Z" fill="url(#grad2)" />
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9A8D4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        
        {/* LADO IZQUIERDO: Presentación (Oculto en móvil) */}
        <div className="hidden lg:flex flex-col flex-1 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-text-dark leading-tight tracking-tight mb-6">
            Únete a la <br />
            <span className="text-lila-main">revolución</span> <br />
            del diseño
          </h1>
          <p className="text-lg xl:text-xl text-gray-500 font-medium mb-10 leading-relaxed">
            Crea diagramas colaborativos en segundos. <br />
            Invita a tu equipo y comparte ideas en tiempo real.
          </p>
          
          <div className="relative w-44 h-44 opacity-80">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
              <circle cx="30" cy="50" r="12" fill="#FCE7F3" stroke="#F9A8D4" strokeWidth="2"/>
              <circle cx="70" cy="50" r="12" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="2"/>
              <path d="M42 50 L58 50" fill="none" stroke="#BAE6FD" strokeWidth="3" strokeDasharray="4 4"/>
            </svg>
          </div>
        </div>

        {/* CENTRO: Tarjeta de Registro */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/85 backdrop-blur-md p-6 sm:p-10 rounded-3xl sm:rounded-[2rem] shadow-xl shadow-lila-main/5 border border-white/60">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="flex items-center gap-3 mb-3">
                <Logo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
                <span className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight">UMLForge AI</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-dark tracking-tight">
                Crear cuenta
              </h2>
            </div>
            
            <form className="space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                    Nombre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      className="appearance-none block w-full pl-9 pr-3 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium text-sm sm:text-base"
                      placeholder="Juan"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                    Apellido
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="family-name"
                      className="appearance-none block w-full pl-9 pr-3 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium text-sm sm:text-base"
                      placeholder="Pérez"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="appearance-none block w-full pl-9 pr-3 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium text-sm sm:text-base"
                    placeholder="ejemplo@umlforge.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    className="appearance-none block w-full pl-9 pr-10 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium text-sm sm:text-base"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-lila-main transition-colors min-h-[44px] min-w-[44px] justify-center"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    className="appearance-none block w-full pl-9 pr-10 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium text-sm sm:text-base"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-lila-main transition-colors min-h-[44px] min-w-[44px] justify-center"
                    aria-label={showConfirmPassword ? "Ocultar confirmación" : "Ver confirmación"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-text-dark mb-1 ml-1">
                  Rol inicial
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-lila-main/70">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="appearance-none block w-full pl-9 pr-3 py-2.5 sm:py-3 bg-bg-main/60 border border-lila-light text-text-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-sm sm:text-base cursor-pointer"
                  >
                    <option value="ANFITRION">Anfitrión</option>
                    <option value="COLABORADOR">Colaborador</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-xs sm:text-sm text-center bg-red-50 p-2.5 rounded-xl border border-red-100 font-medium animate-in fade-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-600 text-xs sm:text-sm text-center bg-green-50 p-2.5 rounded-xl border border-green-100 font-medium animate-in fade-in">
                  {success}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lila-main disabled:opacity-70 transition-all shadow-md shadow-pink-main/20 min-h-[48px]"
                >
                  <span>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>

              <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="font-bold text-lila-main hover:text-pink-main transition-colors">
                  Inicia sesión
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* LADO DERECHO: Decoraciones (Oculto en móvil) */}
        <div className="hidden lg:flex flex-col flex-1 items-end justify-center relative h-[500px]">
          <div className="absolute top-10 right-20 text-lila-main/40 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <span className="text-xl">✦</span>
          </div>
          <div className="absolute top-40 right-40 bg-white p-4 rounded-2xl shadow-sm border border-lila-light/50 flex items-center gap-3 transform rotate-3">
            <div className="bg-pink-light p-2 rounded-lg text-pink-main">
              <Code className="w-5 h-5" />
            </div>
            <div className="w-16 h-2 bg-gray-100 rounded-full"></div>
          </div>
          <div className="absolute bottom-32 right-10 bg-white p-5 rounded-2xl shadow-sm border border-blue-pastel/50 flex flex-col gap-2 transform -rotate-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-pastel p-2 rounded-lg text-blue-500">
                <GitMerge className="w-5 h-5" />
              </div>
              <div className="w-20 h-2 bg-gray-100 rounded-full"></div>
            </div>
            <div className="w-full h-2 bg-gray-50 rounded-full mt-2"></div>
          </div>
          <div className="absolute bottom-10 right-40 text-pink-main/30">
            <span className="text-3xl">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
