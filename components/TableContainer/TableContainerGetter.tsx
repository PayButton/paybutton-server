import { useEffect, useState } from 'react'
import { useTable, usePagination } from 'react-table'
import { DEFAULT_EMPTY_TABLE_MESSAGE } from 'constants/index'
import style from './table-container.module.css'

interface DataGetterReturn {
  data: any
  totalCount: number
}

interface IProps {
  ssr: boolean
  columns: any[]
  dataGetter: (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => Promise<DataGetterReturn>
  opts: any
  tableRefreshCount: number
  emptyMessage?: string
}

const getLocalStorageItem = (itemName: string): string | null => {
  try {
    return localStorage.getItem(itemName)
  } catch (error: any) {
    console.error(error.message)
    return null
  }
}

const TableContainer = ({ columns, dataGetter, opts, ssr, tableRefreshCount, emptyMessage }: IProps): JSX.Element => {
  const localPageSize = getLocalStorageItem('pageSize')
  const localStoragePageSize = ssr ? 10 : localPageSize !== null ? +localPageSize : 10
  const [data, setData] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState(opts?.sortColumn ?? 'timestamp')
  const [sortDesc, setSortDesc] = useState(true)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const emptyMessageDisplay = emptyMessage ?? DEFAULT_EMPTY_TABLE_MESSAGE
  const [hiddenColumns, setHiddenColumns] = useState({})

  const triggerSort = (column: any): void => {
    if (column.disableSortBy === true || hiddenColumns[column.id]) return

    const id = column.id
    if (sortColumn === id) {
      setSortDesc(!sortDesc)
    } else {
      setSortDesc(true)
      setSortColumn(id)
    }
    gotoPage(0)
  }
  
  const toggleColumn = (id: any): void => {
    setHiddenColumns((prev) => ({ ...prev, [id]: !prev[id]}))
  }

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      pageCount,
      autoResetPage: false,
      initialState: { pageIndex: 0, pageSize: localStoragePageSize, sortBy: [{ id: sortColumn, desc: true }] }
    },
    usePagination
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const d = await dataGetter(pageIndex, pageSize, sortColumn, sortDesc)
      setPageCount(Math.ceil(d.totalCount / pageSize))
      setData(d.data)
      setLoading(false)
    })()
  }, [pageSize, pageIndex, sortColumn, sortDesc, tableRefreshCount])


  const onChangeInSelect = (event: any): void => {
    const pageSize = Number(event.target.value)
    setPageSize(pageSize)
    localStorage.setItem('pageSize', pageSize.toString())
  }

  return (
    <>
    <div className="paybutton-table-ctn">
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup: any) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column: any) => (
                <th {...column.getHeaderProps()} style={column.disableSortBy === true ? null : { cursor: 'pointer' }} onClick={() => { triggerSort(column) }}>
                  <div>
                  {column.render('Header')}
                  {column.shrinkable && (
                    <span onClick={() => toggleColumn(column.id)} style={{ cursor: 'pointer' }}>
                      {hiddenColumns[column.id] ? <div style= {{marginRight: '5px'}} className='table-arrow-right' /> : <div style= {{marginRight: '5px'}} className='table-sort-arrow-down' />}
                    </span>
                  )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
          <tr className='header-spacer'></tr>
        </thead>
        <tbody {...getTableBodyProps()} className={loading ? style.loading : null}>
          <>
            { page.length > 0
              ? page.map((row: any) => {
                prepareRow(row)
                return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell: any) =>
                      hiddenColumns[cell.column.id] ? <td> </td> : <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  )}
                </tr>
                )
              })
              : <tr>
              <td colSpan={columns.length} className={style.no_data}>
                {emptyMessageDisplay}
              </td>
            </tr> }
          </>
        </tbody>
      </table>
    </div>

    <div className='table-navigation-ctn'>
      <button
        onClick={() => gotoPage(0)}
        disabled={!(canPreviousPage as boolean)}
      >
        {'<<'}
      </button>
      <button
        onClick={previousPage}
        disabled={!(canPreviousPage as boolean)}
      >
        {'<'}
      </button>
      <div className='pageof-table'>Page {(pageIndex as number) + 1} of {pageOptions.length}</div>
      <button color="primary" onClick={nextPage} disabled={!(canNextPage as boolean)}>
        {'>'}
      </button>
      <button
        color="primary"
        onClick={() => gotoPage(pageCount - 1)}
        disabled={!(canNextPage as boolean)}
      >
        {'>>'}
      </button>

      <div className='table-select-ctn'>
        <select value={pageSize} onChange={onChangeInSelect}>
          {[10, 25, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
    </>
  )
}

export default TableContainer
