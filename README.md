# Boss Pods

Sistema de gestão multi-loja e ponto de venda (POS) desenvolvido com Vue 3, TypeScript e Vite.

## Stack Tecnológica

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript**
- **Vite** (build tool)
- **Vue Router** (roteamento)
- **Pinia** (gerenciamento de estado)
- **ESLint** + **Prettier** (linting e formatação)

## Pré-requisitos

- Node.js `^20.19.0 || >=22.12.0`
- npm ou yarn

## Setup do Projeto

1. **Instalar dependências:**

```sh
npm install
```

2. **Configurar variáveis de ambiente:**

Copie o arquivo `.env.example` para `.env`:

```sh
cp .env.example .env
```

Edite o arquivo `.env` e configure a URL base da API:

```
VITE_API_BASE_URL=http://localhost/api/v1
```

## Scripts Disponíveis

### Desenvolvimento

```sh
npm run dev
```

Inicia o servidor de desenvolvimento com hot-reload.

### Build

```sh
npm run build
```

Compila o projeto para produção (inclui type-check).

### Preview

```sh
npm run preview
```

Visualiza o build de produção localmente.

### Type Check

```sh
npm run type-check
```

Verifica erros de TypeScript.

### Lint

```sh
npm run lint
```

Executa o ESLint e corrige problemas automaticamente quando possível.

### Format

```sh
npm run format
```

Formata o código usando Prettier.

## Estrutura do Projeto

```
src/
├── api/                 # Cliente HTTP e endpoints da API
│   ├── endpoints/       # Módulos de endpoints (um por recurso)
│   └── client.ts        # Cliente HTTP base
├── assets/              # Assets estáticos (imagens, fontes)
├── components/          # Componentes reutilizáveis
│   ├── ui/              # Componentes genéricos (Button, Input, Modal, etc.)
│   └── domain/          # Componentes específicos do domínio
├── composables/         # Lógica compartilhada (useAuth, usePagination, etc.)
├── layouts/             # Componentes de layout (DefaultLayout, AuthLayout)
├── router/              # Configuração de rotas e guards
├── stores/              # Stores do Pinia (auth, app config)
├── types/               # Tipos TypeScript compartilhados
├── utils/               # Funções utilitárias puras
└── views/               # Páginas de rota (um por rota/seção)
```

## Configuração do IDE

### VS Code

Recomendado usar:
- [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (e desabilitar Vetur)
- Extensão Prettier para formatação automática

### Configuração do Editor

O projeto usa ESLint e Prettier. Configure seu editor para:
- Formatar ao salvar usando Prettier
- Mostrar erros do ESLint em tempo real

## Navegadores Recomendados

- **Chromium-based** (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- **Firefox**:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

## Documentação

Para mais detalhes sobre:
- **Arquitetura e padrões**: Veja `Prompts/Frontend.md`
- **Guia de desenvolvimento**: Veja `Docs/DevGuide.md`
- **Visão geral do projeto**: Veja `Docs/Project.md`
- **Documentação da API**: Veja `Docs/api.md`

## Desenvolvimento

Este projeto segue uma arquitetura estruturada:

- **Sem lógica de negócio em views**: Use composables, stores ou camada de API
- **Sem `fetch` direto em componentes**: Toda comunicação HTTP via `api/`
- **Sem tipos duplicados**: Tipos relacionados à API em `api/types` ou `types/`
- **Composition API + `<script setup>`**: Sem Options API

## Licença

Projeto privado.
