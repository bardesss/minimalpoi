// lucide-react ships types only for its public barrel (`dist/lucide-react.d.ts`),
// not for this deep internal path — but the package declares no "exports"
// map, so the deep import still resolves at build and test time. Declaring
// it here just lets TypeScript find the module at all.
//
// We deliberately don't type this as `export default: Record<string,
// LucideIcon>`: TypeScript wraps a dynamic `import()` of an ambient module
// declared with `export default` (or `export =`) so the resolved value sits
// under a synthesized `.default` property. This module has no default
// export at runtime — it's a flat ESM re-export barrel, one named export per
// icon, each a LucideIcon component keyed by its PascalCase name (see
// lucide-react.mjs: `import * as index from './icons/index.mjs'; export {
// index as icons }`). Typing it as `export default` would type-check but
// read `undefined` at runtime. Callers of the dynamic import() cast the
// resolved namespace object straight to `Record<string, LucideIcon>`
// instead, matching its real shape.
declare module "lucide-react/dist/esm/icons/index.mjs";
