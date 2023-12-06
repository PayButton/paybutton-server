import { useTable, useSortBy, usePagination } from 'react-table'

interface IProps {
  ssr: boolean
}

const TableContainer = ({ columns, data, opts, ssr }: IProps): JSX.Element => {
  const sortColumn = opts?.sortColumn
  const localPageSize = ssr ? 10 : localStorage.getItem('pageSize')
  const localStoragePageSize = localPageSize === null ? 10 : +localPageSize

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: localStoragePageSize, sortBy: [{ id: sortColumn !== undefined ? sortColumn : 'timestamp', desc: true }] }
    },
    useSortBy,
    usePagination
  )

  const generateSortingIndicator = (column: any): JSX.Element | null => {
    return column.isSorted === true ? (column.isSortedDesc === true ? <div className='table-sort-arrow-down' /> : <div className='table-sort-arrow-up' />) : null
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
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
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
