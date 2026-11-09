import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/manrope';
import './styles.css';
import { aplicarProtecao } from './lib/protecao';
import { Layout } from './components/Layout';
import { Portao } from './components/Portao';
import { Inicio } from './pages/Inicio';
import { ObraDetalhe, Obras } from './pages/Obras';
import { ClienteDetalhe, Clientes } from './pages/Clientes';
import { OrcamentoEditor, OrcamentoVer, Orcamentos } from './pages/Orcamentos';
import { Financeiro } from './pages/Financeiro';
import { Equipe, FuncionarioDetalhe } from './pages/Equipe';
import { Agenda } from './pages/Agenda';
import { Ajustes, Mais } from './pages/Ajustes';

aplicarProtecao();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Portao>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="obras" element={<Obras />} />
          <Route path="obras/:id" element={<ObraDetalhe />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalhe />} />
          <Route path="orcamentos" element={<Orcamentos />} />
          <Route path="orcamentos/novo" element={<OrcamentoEditor />} />
          <Route path="orcamentos/:id" element={<OrcamentoVer />} />
          <Route path="orcamentos/:id/editar" element={<OrcamentoEditor />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="equipe/:id" element={<FuncionarioDetalhe />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="mais" element={<Mais />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Inicio />} />
        </Route>
      </Routes>
    </HashRouter>
    </Portao>
  </StrictMode>,
);
