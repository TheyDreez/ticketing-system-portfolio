# Frontend Architecture

A estrutura de pastas foi reorganizada para facilitar o escalonamento e manter o código mais limpo.

## Pastas

- `features/`: Componentes que formam telas inteiras ou abas do sistema, agrupados por contexto de negócio (ex: dashboard, auth, tickets, settings).
- `shared/components/`: Componentes visuais genéricos que podem ser reaproveitados em diversas features.
  - `ui/`: Componentes puros da interface, como modais genéricos, esqueletos de loading (Skeleton), alertas.
  - `layout/`: Componentes de estrutura da página, como Sidebar e Header.
- `shared/hooks/`: Custom hooks compartilhados globalmente.
- `shared/utils/`: Funções utilitárias.
- `providers/`: Reservado para contextos globais da aplicação (React Contexts, Providers).
- `pages/`: Destinado a componentes de roteamento no nível mais alto, caso necessário futuramente.

## Próximos Passos
Esta base já prepara o terreno para refatorarmos o `App.tsx` utilizando um router como o `react-router-dom`, movendo o gerenciamento de navegação para a camada adequada e desacoplando as regras de UI.
