import React from 'react'
import { useTable, useSortBy, usePagination } from 'react-table'

const TableContainer = ({ columns, data }) => {
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
      initialState: { pageIndex: 0, pageSize: 20 }
    },
    useSortBy,
    usePagination
  )

  const generateSortingIndicator = column => {
    return column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''
  }

  const onChangeInSelect = event => {
    setPageSize(Number(event.target.value))
  }

  return (
    <>
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                {column.render('Header')}
                {generateSortingIndicator(column)}
              </th>
            ))}
          </tr>
        ))}
      </thead>

      <tbody {...getTableBodyProps()}>
        {page.map((row) => {
          prepareRow(row)
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
              })}
            </tr>
          )
        })}
      </tbody>
    </table>

<div>
 
    <button
      color="primary"
      onClick={() => gotoPage(0)}
      disabled={!canPreviousPage}
    >
      {"<<"}
    </button>
    <button
      color="primary"
      onClick={previousPage}
      disabled={!canPreviousPage}
    >
      {"<"}
    </button>

  <div>
    Page{" "}
    <strong>
      {pageIndex + 1} of {pageOptions.length}
    </strong>
  </div>
  {/* <div>
    <input
      type="number"
      min={1}
      style={{ width: 70 }}
      max={pageOptions.length}
      defaultValue={pageIndex + 1}
      onChange={onChangeInInput}
    />
  </div> */}
  <div>
    <select value={pageSize} onChange={onChangeInSelect}>
      {[10, 20, 30, 40, 50].map(pageSize => (
        <option key={pageSize} value={pageSize}>
          Show {pageSize}
        </option>
      ))}
    </select>
  </div>
  <div>
    <button color="primary" onClick={nextPage} disabled={!canNextPage}>
      {">"}
    </button>
    <button
      color="primary"
      onClick={() => gotoPage(pageCount - 1)}
      disabled={!canNextPage}
    >
      {">>"}
    </button>
  </div>
  </div>
  </>
  )
}

export default TableContainer
