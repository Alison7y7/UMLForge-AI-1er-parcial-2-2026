import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Code, Sparkles, GitMerge } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { correo, password });
      login(data.token, {
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido,
        correo: data.correo,
        rol: data.rol,
        permisos: data.permisos || [],
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center font-sans">
      
      {/* Background Decorativo Suave */}
      <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-lila-light rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      <div className="absolute top-[20%] right-[20%] w-[20rem] h-[20rem] bg-blue-pastel rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      {/* Lineas curvas suaves en esquinas */}
      <svg className="absolute top-0 left-0 w-64 h-64 opacity-20 pointer-events-none" viewBox="0 0 100 100" fill="none">
        <path d="M0,0 L100,0 C100,0 50,50 0,100 Z" fill="url(#grad1)" />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F9A8D4" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
      
      <svg className="absolute bottom-0 right-0 w-64 h-64 opacity-20 pointer-events-none transform rotate-180" viewBox="0 0 100 100" fill="none">
        <path d="M0,0 L100,0 C100,0 50,50 0,100 Z" fill="url(#grad2)" />
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9A8D4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
        
        {/* LADO IZQUIERDO: Presentación (Oculto en móvil) */}
        <div className="hidden lg:flex flex-col flex-1 max-w-md pt-8">
          <h1 className="text-5xl font-extrabold text-text-dark leading-tight tracking-tight mb-6">
            Diagramas <br />
            <span className="text-lila-main">más simples</span> <br />
            con IA
          </h1>
          <p className="text-xl text-gray-500 font-medium mb-10 leading-relaxed">
            Visualiza. Diseña. Crea. <br />
            Conecta tus ideas.
          </p>
          
          {/* Gráfico decorativo de UML sutil */}
          <div className="relative w-48 h-48 opacity-80">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
              <rect x="10" y="10" width="35" height="25" rx="6" fill="#FCE7F3" stroke="#F9A8D4" strokeWidth="2"/>
              <rect x="55" y="60" width="35" height="25" rx="6" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="2"/>
              <path d="M27 35 L27 72 L55 72" fill="none" stroke="#BAE6FD" strokeWidth="3" strokeDasharray="4 4"/>
              <circle cx="55" cy="72" r="3" fill="#BAE6FD"/>
            </svg>
          </div>
        </div>

        {/* CENTRO: Tarjeta de Login principal */}
        <div className="flex-shrink-0 w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-md p-10 rounded-[2rem] shadow-xl shadow-lila-main/5 border border-white/50">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Logo className="w-10 h-10" />
                <span className="text-2xl font-bold text-text-dark tracking-tight">UMLForge AI</span>
              </div>
              <h2 className="text-3xl font-semibold text-text-dark tracking-tight">
                Inicia sesión
              </h2>
              <p className="mt-3 text-center text-sm text-gray-500 max-w-[280px]">
                Accede a tu cuenta y continúa trabajando en tus diagramas.
              </p>
            </div>
            
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Campo Correo */}
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5 ml-1">Correo electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-lila-main/60">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-bg-main/50 border border-lila-light/60 text-text-dark rounded-2xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium"
                      placeholder="ejemplo@umlforge.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5 ml-1">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-lila-main/60">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="appearance-none block w-full pl-11 pr-12 py-3.5 bg-bg-main/50 border border-lila-light/60 text-text-dark rounded-2xl focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all placeholder-gray-400 font-medium"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-lila-main transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 font-medium mt-4">{error}</div>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lila-main disabled:opacity-70 transition-all shadow-md shadow-pink-main/20"
                >
                  {loading ? 'Iniciando...' : 'Iniciar sesión'}
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
              <div className="mt-6 text-center text-sm text-gray-500">
                ¿No tienes una cuenta?{' '}
                <a href="/register" className="font-semibold text-lila-main hover:text-pink-main transition-colors">
                  Regístrate
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* LADO DERECHO: Decoraciones (Oculto en móvil) */}
        <div className="hidden lg:flex flex-col flex-1 items-end justify-center pt-12 relative h-[500px]">
          
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
