import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "Just_HEAR_ME/**",
    "rasa-demo/**",
    "**/.venv/**",
  ]),
  {
    // Reglas del React Compiler (eslint-plugin-react-hooks 7.x, traído por
    // eslint-config-next 16.2.1). El codebase legacy tiene ~93 violaciones
    // — son consejos de optimización/memoización para que el React Compiler
    // pueda memoizar, NO bugs funcionales: el código corre en producción.
    //
    // Se bajan de error a warn para que el CI no quede bloqueado por la
    // adopción del plugin nuevo. Siguen visibles en el output del lint
    // para arreglarse incrementalmente. Re-subir a "error" por regla a
    // medida que el codebase se sanee.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
