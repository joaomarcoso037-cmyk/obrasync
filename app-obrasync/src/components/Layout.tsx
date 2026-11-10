import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarDays, FileText, HardHat, LayoutDashboard, Menu, Settings, Users, Wallet } from 'lucide-react';
import { Marca } from './ui';
import { AvisoAssinatura } from './Assinatura';
import { nuvemAtiva, useSituacao } from '../lib/nuvem';

const MENU = [
  { para: '/', rotulo: 'Início', icone: LayoutDashboard },
  { para: '/obras', rotulo: 'Obras', icone: Building2 },
  { para: '/clientes', rotulo: 'Clientes', icone: Users },
  { para: '/orcamentos', rotulo: 'Orçamentos', icone: FileText },
  { para: '/financeiro', rotulo: 'Financeiro', icone: Wallet },
  { para: '/equipe', rotulo: 'Equipe', icone: HardHat },
  { para: '/agenda', rotulo: 'Agenda', icone: CalendarDays },
];

const BARRA = [
  { para: '/', rotulo: 'Início', icone: LayoutDashboard },
  { para: '/obras', rotulo: 'Obras', icone: Building2 },
  { para: '/orcamentos', rotulo: 'Orçamentos', icone: FileText },
  { para: '/financeiro', rotulo: 'Financeiro', icone: Wallet },
  { para: '/mais', rotulo: 'Mais', icone: Menu },
];

export function Layout() {
  const { pathname } = useLocation();
  const situacao = useSituacao();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <aside className="lateral">
        <Marca />
        <nav className="nav" aria-label="Principal">
          {MENU.map(({ para, rotulo, icone: Icone }) => (
            <NavLink key={para} to={para} end={para === '/'}>
              <Icone size={19} aria-hidden="true" /> {rotulo}
            </NavLink>
          ))}
        </nav>
        <nav className="nav nav-fim" aria-label="Configurações">
          <NavLink to="/ajustes"><Settings size={19} aria-hidden="true" /> Ajustes</NavLink>
        </nav>
      </aside>

      <div className="topo-movel"><Marca /></div>

      <main className="conteudo">
        <div className="pagina">
          <AvisoAssinatura />
          {situacao === 'offline' && (
            <div className="aviso ruim" role="alert">
              <AlertTriangle size={20} aria-hidden="true" />
              {nuvemAtiva
                ? 'Sem conexão. Suas alterações ficam guardadas neste aparelho e serão enviadas quando a internet voltar.'
                : 'Não foi possível salvar neste navegador. Baixe um backup em Ajustes antes de fechar.'}
            </div>
          )}
          {situacao === 'conflito' && (
            <div className="aviso" role="alert">
              <AlertTriangle size={20} aria-hidden="true" />
              Esses dados foram alterados em outro aparelho. A tela foi atualizada; confira sua última alteração.
            </div>
          )}
          <Outlet />
        </div>
      </main>

      <nav className="barra" aria-label="Principal">
        {BARRA.map(({ para, rotulo, icone: Icone }) => (
          <NavLink key={para} to={para} end={para === '/'}>
            <Icone size={22} aria-hidden="true" /> {rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
