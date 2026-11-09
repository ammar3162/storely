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
    <section className={cn('storely-data-table', className)}>
      {(searchable || toolbar) && (
        <div className="storely-toolbar">
          {searchable ? (
            <label className="storely-search">
              <Search className="storely-search-icon" size={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="storely-input"
              />
            </label>
          ) : (
            <div />
          )}
          {toolbar ? <div className="storely-actions">{toolbar}</div> : null}
        </div>
      )}

      <div className="storely-table-scroll">
        <table className="storely-table">
          <thead >
            <tr>
              {columns.map((column) => {
                const active = sortKey === column.key
                const SortIcon = !active ? ChevronsUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown

                return (
                  <th
                    key={column.key}
                    className={cn(
                      'storely-table-heading',
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
                    'storely-table-row',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-dense={dense}
                      data-label={typeof column.header === 'string' ? column.header : undefined}
                      className={cn(
                        'storely-table-cell',
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
        <div className="storely-pagination">
          <span>
            عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sorted.length)} من {sorted.length}
          </span>
          <div className="storely-pagination-controls">
            <StorelyButton size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>
              السابق
            </StorelyButton>
            <span className="min-w-16 text-center font-semibold">
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
