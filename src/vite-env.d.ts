/// <reference types="vite/client" />

// Allow CSS module side-effect imports in TypeScript
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
