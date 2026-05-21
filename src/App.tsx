export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* black_column — 52px fijo, fondo #111111 */}
      <nav
        className="flex w-[52px] shrink-0 flex-col bg-u24-black"
        aria-label="Navegación principal"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* header — 52px fijo, fondo #111111 */}
        <header className="h-[52px] shrink-0 bg-u24-black" />

        {/* home_area — fondo amarillo, reemplazado por contenido blanco en módulos */}
        <main
          id="main-content"
          className="flex-1 overflow-auto bg-u24-yellow"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
