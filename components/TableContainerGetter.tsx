import { useEffect, useState } from 'react'
import { useTable, usePagination } from 'react-table'

interface DataGetterReturn {
  data: any
  totalCount: number
}

interface IProps {
  ssr: boolean
  columns: any[]
  dataGetter: (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => Promise<DataGetterReturn>
  opts: any
  tableRefreshCounter: number
}

const TableContainer = ({ columns, dataGetter, opts, ssr, tableRefreshCounter }: IProps): JSX.Element => {
  const localPageSize = localStorage.getItem('pageSize')
  const localStoragePageSize = ssr ? 10 : localPageSize !== null ? +localPageSize : 10
  const [data, setData] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState(opts?.sortColumn ?? 'timestamp')
  const [sortDesc, setSortDesc] = useState(true)
  const [pageCount, setPageCount] = useState(0)

  const triggerSort = (column: any): void => {
    const id = column.id
    if (sortColumn === id) {
      setSortDesc(!sortDesc)
    } else {
      setSortDesc(true)
      setSortColumn(id)
    }
    gotoPage(0)
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
      console.log('oia', [pageSize, pageIndex, sortDesc, sortColumn])
      const d = await dataGetter(pageIndex, pageSize, sortColumn, sortDesc)
      setPageCount(Math.ceil(d.totalCount / pageSize))
      setData(d.data)
    })()
  }, [pageSize, pageIndex, sortColumn, sortDesc, tableRefreshCounter])

  const generateSortingIndicator = (column: any): JSX.Element | null => {
    if (sortColumn === column.id) {
      if (sortDesc) {
        return <div className='table-sort-arrow-down' />
      } else {
        return <div className='table-sort-arrow-up' />
      }
    }
    return null
  }

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
                <th {...column.getHeaderProps()} style={{ cursor: 'pointer' }} onClick={() => { triggerSort(column) }}>
                  {column.render('Header')}
                  {generateSortingIndicator(column)}
                </th>
              ))}
            </tr>
          ))}
          <tr className='header-spacer'></tr>
        </thead>

        <tbody {...getTableBodyProps()}>
          {page.map((row: any) => {
            prepareRow(row)
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell: any) => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

    {pageOptions.length > 1 &&
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
      }
    </>
  )
}

export default TableContainer
