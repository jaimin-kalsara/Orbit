import { useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../store/context'
import { ColorPicker, Dot } from '../../components/ui/Controls'
import { Menu } from '../../components/ui/Menu'
import { Button } from '../../components/ui/Button'
import { toast } from '../../components/ui/Toast'
import { SWATCHES } from '../../lib/utils'

function ColorButton({ color, onChange }) {
  return (
    <Menu
      align="start"
      width="w-[252px]"
      trigger={(props) => (
        <button {...props} aria-label="Change color" className="pressable grid size-8 shrink-0 place-items-center rounded-lg hover:bg-surface-3">
          <Dot color={color} className="size-3.5 ring-2 ring-surface" />
        </button>
      )}
    >
      <div className="p-2">
        <ColorPicker value={color} onChange={onChange} />
      </div>
    </Menu>
  )
}

function Row({ kind, item, extra, onDelete, onSaved, onDragEnd }) {
  const { updateItem } = useApp()
  const controls = useDragControls()
  const [name, setName] = useState(item.name)
  useEffect(() => setName(item.name), [item.name])

  const save = async (changes) => {
    try {
      await updateItem(kind, item.id, changes)
      onSaved?.()
    } catch (err) {
      setName(item.name)
      toast.error(err.message)
    }
  }

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative flex flex-wrap items-center gap-1 rounded-xl bg-surface p-1.5 ring-1 ring-line sm:flex-nowrap"
      whileDrag={{ boxShadow: 'var(--shadow-pop)', zIndex: 10 }}
    >
      <button
        aria-label="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
        className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center text-ink-3 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <ColorButton color={item.color} onChange={(color) => save({ color })} />
      <input
        value={name}
        maxLength={kind === 'projects' ? 60 : 40}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() !== item.name && save({ name: name.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Name"
        className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[13.5px] font-medium text-ink outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-1 focus:ring-line-strong"
      />
      {extra && <div className="flex w-full items-center gap-1 pl-[60px] sm:w-auto sm:pl-0">{extra(save)}</div>}
      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)} className="shrink-0 text-ink-3! hover:text-danger!">
        <Trash2 className="size-4" />
      </Button>
    </Reorder.Item>
  )
}

/** Editable, reorderable list for statuses, priorities, categories and projects. */
export function TaxonomyEditor({ kind, items, extra, onDelete, createDefaults = {}, placeholder, onReordered }) {
  const { createItem, reorderItems } = useApp()
  const [order, setOrder] = useState(items)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const orderRef = useRef(items)
  useEffect(() => {
    setOrder(items)
    orderRef.current = items
  }, [items])
  const onReorder = (next) => {
    orderRef.current = next
    setOrder(next)
  }
  const commit = async () => {
    const next = orderRef.current
    if (!next.some((x, i) => items[i]?.id !== x.id)) return
    await reorderItems(kind, next)
    onReordered?.(next)
  }

  async function add(e) {
    e.preventDefault()
    const value = name.trim()
    if (!value) return
    setBusy(true)
    try {
      await createItem(kind, { name: value, color: SWATCHES[(items.length * 5 + 2) % SWATCHES.length], ...createDefaults })
      setName('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={onReorder}
        className="flex flex-col gap-2"
      >
        {order.map((item) => (
          <Row
            key={item.id}
            kind={kind}
            item={item}
            extra={extra ? (save) => extra(item, save) : null}
            onDelete={onDelete}
            onDragEnd={commit}
          />
        ))}
      </Reorder.Group>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={kind === 'projects' ? 60 : 40}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 min-w-0 flex-1 rounded-[10px] bg-surface-2 px-3 text-ink ring-1 ring-inset ring-line outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/60"
        />
        <Button type="submit" variant="secondary" loading={busy} disabled={!name.trim()}>
          <Plus className="size-4" /> Add
        </Button>
      </form>
    </div>
  )
}

