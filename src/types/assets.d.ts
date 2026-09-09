// Ambient declarations so TypeScript accepts web-only CSS side-effect imports
// (global.css provides web font variables; native builds strip these).
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
