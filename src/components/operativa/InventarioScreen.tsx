import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useInventario, type InventarioItem } from '@/hooks/useInventario'
import { useActivacionStore } from '@/stores/useActivacionStore'

function groupBySubgrupo(items: InventarioItem[]): Map<string, InventarioItem[]> {
  const map = new Map<string, InventarioItem[]>()
  for (const item of items) {
    const list = map.get(item.subgrupo) ?? []
    list.push(item)
    map.set(item.subgrupo, list)
  }
  return map
}

function stockTone(stock: number): 'ok' | 'warn' | 'crit' {
  if (stock === 0) return 'crit'
  if (stock <= 2) return 'warn'
  return 'ok'
}

interface DeducirFormState {
  idItem: number
  subgrupo: string
  cantidad: string
}

export function InventarioScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const { items, isLoading, isSubmitting, error, cargarInventario, deducirMaterial } = useInventario()
  const [form, setForm] = useState<DeducirFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { cargarInventario() }, [cargarInventario])

  function openForm(item: InventarioItem) {
    setForm({ idItem: item.id_item, subgrupo: item.subgrupo, cantidad: '1' })
    setFormError(null)
  }

  function closeForm() { setForm(null); setFormError(null) }

  async function handleDeducir(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setFormError(null)

    const cant = parseInt(form.cantidad, 10)
    if (isNaN(cant) || cant <= 0) { setFormError('Introduce una cantidad válida (≥ 1).'); return }

    const item = items.find((i) => i.id_item === form.idItem && i.subgrupo === form.subgrupo)
    if (item && cant > item.stock_real) {
      setFormError(`Stock insuficiente. Disponible: ${item.stock_real}.`)
      return
    }

    const ok = await deducirMaterial(form.idItem, form.subgrupo, cant)
    if (ok) closeForm()
  }

  const groups = groupBySubgrupo(items)
  const activeItem = form
    ? items.find((i) => i.id_item === form.idItem && i.subgrupo === form.subgrupo)
    : null

  return (
    <div className="op-screen" role="main" aria-label="Inventario del vehículo">
      <div className="op-screen__header">
        <h2 className="op-screen__title">
          <i className="ti ti-package" aria-hidden="true" /> Doc-6 Gasto de material — {matricula}
        </h2>
        <Btn type="button" onClick={cargarInventario} disabled={isLoading || isSubmitting}>
          <i className="ti ti-refresh" aria-hidden="true" /> Actualizar
        </Btn>
      </div>

      {error && <p className="login__error" role="alert">{error}</p>}

      {isLoading ? (
        <LoadingSkeleton variant="card" rows={4} />
      ) : items.length === 0 ? (
        <p className="op-empty">No hay ítems en el inventario de este vehículo.</p>
      ) : (
        <div className="inventario-groups">
          {[...groups.entries()].map(([subgrupo, groupItems]) => (
            <section key={subgrupo} className="inventario-group">
              <h3 className="inventario-group__title">{subgrupo}</h3>
              <ul className="inventario-list" aria-label={`Subgrupo ${subgrupo}`}>
                {groupItems.map((item) => (
                  <li key={`${item.id_item}-${item.subgrupo}`} className="inventario-item">
                    <div className="inventario-item__info">
                      <span className="inventario-item__nombre">{item.nombre}</span>
                      {item.especificacion && (
                        <span className="inventario-item__spec">{item.especificacion}</span>
                      )}
                    </div>
                    <div className="inventario-item__actions">
                      <Badge tone={stockTone(item.stock_real)}>
                        {item.stock_real} ud.
                      </Badge>
                      <button
                        type="button"
                        className="inventario-item__btn"
                        aria-label={`Deducir ${item.nombre}`}
                        onClick={() => openForm(item)}
                        disabled={item.stock_real === 0 || isSubmitting}
                      >
                        <i className="ti ti-minus" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Inline deduction form */}
      {form && activeItem && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Deducir ${activeItem.nombre}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div className="modal">
            <div className="modal__hd">
              <span className="modal__title">Deducir material</span>
              <button className="modal__close" onClick={closeForm} aria-label="Cerrar">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleDeducir}>
              <div className="modal__body">
                <p><b>{activeItem.nombre}</b></p>
                {activeItem.especificacion && (
                  <p style={{ marginTop: '.25rem' }}>{activeItem.especificacion}</p>
                )}
                <p style={{ marginTop: '.5rem' }}>
                  Stock disponible: <b>{activeItem.stock_real} ud.</b>
                </p>
                <label className="login__label" style={{ marginTop: '1rem' }}>
                  Cantidad a deducir
                  <input
                    className="login__input"
                    type="number"
                    min={1}
                    max={activeItem.stock_real}
                    step={1}
                    value={form.cantidad}
                    onChange={(e) => setForm((f) => f ? { ...f, cantidad: e.target.value } : f)}
                    aria-required="true"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </label>
                {formError && <p className="login__error" role="alert" style={{ marginTop: '.5rem' }}>{formError}</p>}
              </div>
              <div className="modal__foot">
                <Btn type="button" onClick={closeForm} disabled={isSubmitting}
                  style={{ background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border-2)' }}>
                  Cancelar
                </Btn>
                <Btn type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando…' : 'Confirmar deducción'}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
