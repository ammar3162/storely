'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react'
import { StorelyButton } from './button'
import { StorelyEmptyState } from './empty-state'
import { cn } from './utils'

export type StorelyDataTableColumn<T> = {
  key: string
  header: ReactNode
  accessor?: keyof T | ((row: T) => ReactNode)
  cell?: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number | Date | null | undefined
  className?: string
  headerClassName?: string
}

type SortDirection = 'asc' | 'desc'

type StorelyDataTableProps<T> = {
  columns: Array<StorelyDataTableColumn<T>>
  data: T[]
  rowKey: keyof T | ((row: T, index: number) => string)
  searchable?: boolean
  searchPlaceholder?: string
  searchValue?: (row: T) => string
  toolbar?: ReactNode
  emptyState?: ReactNode
  pageSize?: number
  className?: string
  dense?: boolean
  onRowClick?: (row: T) => void
}

function normalize(value: unknown) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return String(value ?? '').toLocaleLowerCase()
}

function renderValue<T>(column: StorelyDataTableColumn<T>, row: T) {
  if (column.cell) return column.cell(row)
  if (typeof column.accessor === 'function') return column.accessor(row)
  if (column.accessor) return row[column.accessor] as ReactNode
  return null
}

export function StorelyDataTable<T>({
  columns,
  data,
  rowKey,
  searchable = true,
  searchPlaceholder = 'بحث',
  searchValue,
  toolbar,
  emptyState,
  pageSize = 12,
  className,
  dense = true,
  onRowClick,
}: StorelyDataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase()
    if (!cleanQuery) return data

    return data.filter((row) => {
      const haystack = searchValue
        ? searchValue(row)
        : columns.map((column) => renderValue(column, row)).join(' ')
      return haystack.toLocaleLowerCase().includes(cleanQuery)
    })
  }, [columns, data, query, searchValue])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const column = columns.find((item) => item.key === sortKey)
    if (!column) return filtered

    return [...filtered].sort((a, b) => {
      const aValue = normalize(column.sortValue ? column.sortValue(a) : renderValue(column, a))
      const bValue = normalize(column.sortValue ? column.sortValue(b) : renderValue(column, b))
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [columns, filtered, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleSort(column: StorelyDataTableColumn<T>) {
    if (!column.sortable) return
    setPage(1)
    if (sortKey !== column.key) {
      setSortKey(column.key)
      setSortDirection('asc')
      return
    }
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <section className={cn('overflow-hidden rounded-[6px] border border-[#E7E1D8] bg-white', className)}>
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-[#E7E1D8] p-3 md:flex-row md:items-center md:justify-between">
          {searchable ? (
            <label className="relative block max-w-md flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8EA0B1]" size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-[6px] border border-[#D7CDC2] bg-white pr-9 pl-3 text-sm text-[#203640] outline-none transition placeholder:text-[#8EA0B1] focus:border-[#203640] focus:ring-2 focus:ring-[#203640]/15"
              />
            </label>
          ) : (
            <div />
          )}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-right text-sm leading-6">
          <thead className="bg-[#F8EEDF]/40">
            <tr>
              {columns.map((column) => {
                const active = sortKey === column.key
                const SortIcon = !active ? ChevronsUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown

                return (
                  <th
                    key={column.key}
                    className={cn(
                      'h-11 border-b border-[#E7E1D8] px-4 py-2 text-[13px] font-semibold text-[#56646D]',
                      column.sortable && 'cursor-pointer select-none hover:text-[#203640]',
                      column.headerClassName,
                    )}
                    onClick={() => toggleSort(column)}
                    scope="col"
                  >
                    <span className="inline-flex items-center gap-2">
                      {column.header}
                      {column.sortable ? <SortIcon size={13} /> : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => {
              const key = typeof rowKey === 'function' ? rowKey(row, index) : String(row[rowKey])
              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-[#E7E1D8] last:border-b-0 hover:bg-[#F8EEDF]/25',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        dense ? 'px-4 py-2.5' : 'px-4 py-3.5',
                        'h-11 align-middle text-sm text-[#203640]',
                        column.className,
                      )}
                    >
                      {renderValue(column, row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pageRows.length === 0 ? (
        <div className="p-4">
          {emptyState ?? <StorelyEmptyState title="لا توجد بيانات" description="غيّر الفلاتر أو أضف سجلاً جديداً للمتابعة." />}
        </div>
      ) : null}

      {sorted.length > pageSize ? (
        <div className="flex flex-col gap-3 border-t border-[#E7E1D8] px-4 py-3 text-[13px] text-[#66737C] md:flex-row md:items-center md:justify-between">
          <span>
            عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sorted.length)} من {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <StorelyButton size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>
              السابق
            </StorelyButton>
            <span className="min-w-16 text-center font-semibold text-[#203640]">
              {currentPage} / {totalPages}
            </span>
            <StorelyButton size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>
              التالي
            </StorelyButton>
          </div>
        </div>
      ) : null}
    </section>
  )
}
