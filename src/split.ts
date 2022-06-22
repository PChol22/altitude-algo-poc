import { TableCell } from "@mui/material";

export type TableLine = number[];
export type Table = number[][];
export type TableCell = { i: number, j: number, value?: number, fixed?: boolean };
export type FlatTable = TableCell[];
export type FixedSubTotal = {
  subTotal: number,
  i: number,
  j: number,
  cells: TableCell[]
};
export type Threshold = {
  line: FixedSubTotal,
  delta: number,
  deltaRemainder: number,
};
export type TotalThreshold = {
  delta: number,
  deltaRemainder: number,
};


export const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const equals = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
const positiveModulo = (a: number, b: number) => ((a % b) + b) % b;

// Returns flattened table (i,j,value)[]
const getFlatTable = (table: Table): FlatTable =>
  table
    .flatMap((row, i) => row.flatMap((value, j) => ({ value, i, j })));

// Returns table cells that are editable by the algorithm
const getEditableCells = (flatTable: FlatTable): TableCell[] =>
  flatTable.filter(({ value }) => value === 0);

// Is a cell part of a cells set
const cellsIncludeCell = (cells: TableCell[], cell: TableCell): boolean =>
    cells.filter(({ i, j }) => i === cell.i && j === cell.j).length > 0;

// Returns subtotals fixed by the user, with info on their location (Column : i = -1, Line : j = -1)
// Each subtotal line has cells that belong to it, each cell know its value and status (fixed or free)
const getLinesFixedBySubTotal = (flatTable: FlatTable, subTotalsByLine: TableLine, editableCells: TableCell[], column: boolean): FixedSubTotal[] =>
  subTotalsByLine.map((subTotal, index) => ({
    subTotal,
    i: column ? -1 : index,
    j: column ? index : -1,
    cells: flatTable
      .filter(cell => (column && cell.j === index) || (!column && cell.i === index))
      .map(cell => ({ ...cell, fixed: !cellsIncludeCell(editableCells, cell) }))
  })).filter(({ subTotal }) => subTotal > 0);
  
// Updates subtotals that cannot be changed anymore and their info (cells value and status)
const getUpdatedLinesFixedBySubTotals = (linesFixedBySubtotals: FixedSubTotal[], flatTable: FlatTable, editableCells: TableCell[], threshold: Threshold): FixedSubTotal[] =>
  linesFixedBySubtotals.map(lineFixedBySubtotal => ({
    ...lineFixedBySubtotal,
    cells: flatTable
      .filter(cell => lineFixedBySubtotal.i === -1 ? (lineFixedBySubtotal.j === cell.j) : (lineFixedBySubtotal.i === cell.i))
      .map(cell => ({ ...cell, fixed: !cellsIncludeCell(editableCells, cell) }))
  })).filter(line => line.i !== threshold.line.i || line.j !== threshold.line.j);

// Get free cells from the cells of a subtotal line
const getLineFreeCells = (line: FixedSubTotal): TableCell[] =>
  line.cells.filter(cell => cell.fixed === false);

// Compute updated subtotal of a subtotal line (after cells values have changed)
const computeLineSubtotal = (line: FixedSubTotal): number => line.cells.reduce((p,c) => p + (c.value ?? 0), 0);

// Get next first subtotal line who's subtotal will be reached if we increase free cells value by 'delta'
const getNextSubTotalReached = (linesFixedBySubtotals: FixedSubTotal[]): Threshold =>
  linesFixedBySubtotals
    .map(line => ({
        line,
        delta: getLineFreeCells(line).length > 0 ? (line.subTotal - computeLineSubtotal(line)) / getLineFreeCells(line).length : 0,
        deltaRemainder: getLineFreeCells(line).length > 0 ? (line.subTotal - computeLineSubtotal(line)) % getLineFreeCells(line).length : 0,
    }))
    // length is > 0 by definition (while loop)
    .sort((threshold1, threshold2) => threshold1.delta - threshold2.delta)[0];

// Get table cells that have become fixed after a subtotal has been reached
// length is > 0 by definition (threshold is a member of linesFixedBySubtotals)
const getNewFixedTableCells = (linesFixedBySubtotals: FixedSubTotal[], threshold: Threshold): TableCell[] =>
  linesFixedBySubtotals.filter((line) => line.i === threshold.line.i && line.j === threshold.line.j)[0].cells;

// Get the updated value of the table (Whole number only)
const getUpdatedTable = (oldTable: Table, editableCells: TableCell[], threshold: Threshold | TotalThreshold): Table => {
  let remainderBuffer = 0;
  return oldTable.map((row, y) => row.map((cell, x) => {
    const tableCell = { i:y, j:x };
    if (!cellsIncludeCell(editableCells, tableCell)) return cell;

    const result = cell + Math.floor(threshold.delta);
    if ('line' in threshold && !cellsIncludeCell(threshold.line.cells, tableCell)) return result;

    remainderBuffer += 1;
    return (remainderBuffer <= threshold.deltaRemainder ? result + 1 : result);
  }));
};

// Update table cells that can still be edited by the algorithm
const getUpdatedEditableCells = (editableCells: TableCell[], newFixedTableCells: TableCell[]): TableCell[] =>
  editableCells.filter((cell) => !cellsIncludeCell(newFixedTableCells, cell));

const isTableNegative = (table: Table): boolean =>
getFlatTable(table).some(({ value }) => value === undefined || value < 0);

const checkSubTotals = (subtotalLine: TableLine, originalSubTotalLine: TableLine): boolean => 
    originalSubTotalLine.every((value, index) => value === 0 || subtotalLine[index] === value);
  
const computeCompletedArrangedTable = (arrangedTable: { value: number, i: number, j: number }[][], arrangedSubTotalsByColumn: { value: number, j: number }[], arrangedSubTotalsByRow: { value: number, i: number }[]): { value: number, i: number, j: number }[][] => {
  const subTotalsByColumnTotal = arrangedSubTotalsByColumn.reduce((p,c) => p + c.value, 0);
  const subTotalsByRowTotal = arrangedSubTotalsByRow.reduce((p,c) => p + c.value, 0);

  let proportionalsubTotalsByColumn = arrangedSubTotalsByColumn;

  if (subTotalsByColumnTotal > subTotalsByRowTotal) {
    proportionalsubTotalsByColumn = proportionalsubTotalsByColumn
      .map(subtotal => ({ ...subtotal, value: Math.floor(subtotal.value * subTotalsByRowTotal / subTotalsByColumnTotal)}));
    const remaining = subTotalsByRowTotal - proportionalsubTotalsByColumn.reduce((p,c) => p + c.value, 0);
    proportionalsubTotalsByColumn = proportionalsubTotalsByColumn
      .map((subtotal, j) => ({ ...subtotal, value: j < remaining ? subtotal.value + 1 : subtotal.value }));
  }

  let proportionalsubTotalsByRow = arrangedSubTotalsByRow;

  if (subTotalsByRowTotal > subTotalsByColumnTotal) {
    proportionalsubTotalsByRow = proportionalsubTotalsByRow
      .map(subtotal => ({ ...subtotal, value: Math.floor(subtotal.value * subTotalsByColumnTotal / subTotalsByRowTotal)}));
    const remaining = subTotalsByColumnTotal - proportionalsubTotalsByRow.reduce((p,c) => p + c.value, 0);
    proportionalsubTotalsByRow = proportionalsubTotalsByRow
      .map((subtotal, i) => ({ ...subtotal, value: i < remaining ? subtotal.value + 1 : subtotal.value }));
  }

  console.log({ proportionalsubTotalsByColumn, proportionalsubTotalsByRow, subTotalsByColumnTotal, subTotalsByRowTotal });

  /*const almostCompletedArrangedTable = arrangedTable.map((row, i) => row.map((cell, j) => {
    const remaining = proportionalsubTotalsByRow[i].value - row.reduce((p,c) => p + c.value, 0);
    const total = Math.min(subTotalsByRowTotal, subTotalsByColumnTotal);
    return {
      ...cell,
      value: cell.value === 0 ? Math.floor(remaining * proportionalsubTotalsByColumn[j].value / (total - proportionalsubTotalsByColumn.filter((_, x) => arrangedTable[i][x].value > 0).reduce((p,c) => p + c.value, 0))) : cell.value,
    }
  }));*/

  for (let k = 0; k < arrangedTable.length + arrangedTable[0].length; k++) {
    const rowsDeltas = proportionalsubTotalsByRow.map((subtotal, i) => ({
      delta: arrangedTable[i].filter(({ value }) => value === 0).length > 0 ? (subtotal.value - arrangedTable[i].reduce((p,c) => p + c.value, 0)) / arrangedTable[i].filter(({ value }) => value === 0).length : 0,
      i,
      j: -1,
    }));
    const colsDeltas = proportionalsubTotalsByColumn.map((subtotal, j) => {
      const column = arrangedTable.map(row => row[j]);
      return {
        delta: column.filter(({ value }) => value === 0).length > 0 ? (subtotal.value - column.reduce((p,c) => p + c.value, 0)) / column.filter(({ value }) => value === 0).length : 0,
        i: -1,
        j,
      }
    });
    const deltas = [
      ...rowsDeltas,...colsDeltas,
    ];
    if (deltas.length === 0) break;

    console.log(deltas);

    const minDelta = deltas.sort((a,b) => a.delta - b.delta)[0];
    if (minDelta.j === -1) {
      arrangedTable = arrangedTable.map((row,i) => row.map((cell, j) => {
        if (cell.value > 0 || i !== minDelta.i) return cell;
        const remaining = proportionalsubTotalsByRow[minDelta.i].value - arrangedTable[minDelta.i].reduce((p,c) => p + c.value, 0);
        const total = Math.min(subTotalsByRowTotal, subTotalsByColumnTotal) - proportionalsubTotalsByColumn.filter((_, j) => arrangedTable[minDelta.i][j].value > 0).reduce((p,c) => p + c.value, 0);
        return { ...cell, value: Math.floor(remaining * proportionalsubTotalsByColumn[j].value / total)}
      }));
    }
    if (minDelta.i === -1) {
      arrangedTable = arrangedTable.map((row,i) => row.map((cell, j) => {
        if (cell.value > 0 || j !== minDelta.j) return cell;
        const column = arrangedTable.map(row => row[j]);
        const remaining = proportionalsubTotalsByColumn[minDelta.j].value - column.reduce((p,c) => p + c.value, 0);
        const total = Math.min(subTotalsByRowTotal, subTotalsByColumnTotal) - proportionalsubTotalsByRow.filter((_, i) => arrangedTable[i][minDelta.j].value > 0).reduce((p,c) => p + c.value, 0);
        return { ...cell, value: Math.floor(remaining * proportionalsubTotalsByRow[i].value / total)}
      }));
    }
  console.table(arrangedTable.map(row => row.map(({value}) => value)));
  }
    
  for (let i = 0; i < arrangedTable.length; i++) {
    for (let j = 0; j < arrangedTable[0].length; j++) {
      const row = arrangedTable[i];
      const column = arrangedTable.map(row => row[j]);
      if (row.reduce((p,c) => p + c.value, 0) < proportionalsubTotalsByRow[i].value &&
          column.reduce((p,c) => p + c.value, 0) < proportionalsubTotalsByColumn[j].value &&
          arrangedTable[i][j].value === 0) {
        arrangedTable[i][j].value++;
      }
    }
  }

  return arrangedTable;
}

export const split = (table: Table, subTotalsByColumn: TableLine, subTotalsByRow: TableLine, total: number) => {
  let tableCopy = table.map(row => row.map(cell => cell));
  let flatTable = getFlatTable(table);
  let editableCells = getEditableCells(flatTable);

  const tableWithIndexes = tableCopy.map((row, i) => row.map((value, j) => ({ value, i, j})));
  const arrangedTable = tableWithIndexes.filter((_, i) => subTotalsByRow[i] > 0).map(row => row.filter((_, j) => subTotalsByColumn[j] > 0));

  const arrangedSubTotalsByColumn = subTotalsByColumn.map((value, j) => ({ value: value - flatTable.reduce((p,c) => c.j === j && subTotalsByRow[c.i] === 0 ? p + (c.value ?? 0 ) : p, 0), j })).filter(({ value }) => value > 0);
  const arrangedSubTotalsByRow = subTotalsByRow.map((value, i) => ({ value: value - flatTable.reduce((p,c) => c.i === i && subTotalsByColumn[c.j] === 0 ? p + (c.value ?? 0 ) : p, 0), i })).filter(({ value }) => value > 0);

  // console.log({ arrangedSubTotalsByColumn, arrangedSubTotalsByRow, arrangedTable });

  const completedArrangedTable = computeCompletedArrangedTable(arrangedTable, arrangedSubTotalsByColumn, arrangedSubTotalsByRow);
  //console.table(completedArrangedTable.map(row => row.map(({value}) => value)));

  return {
    newTable: tableCopy,
    newSubtotalsByColumn: subTotalsByColumn,
    newSubtotalsByRow: subTotalsByRow,
  };
}
