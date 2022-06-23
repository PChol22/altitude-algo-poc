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
export const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
export const mult = (t: number[], m: number) => t.map(v => v * m);
export const divide = (a: number[], b: number[]) => a.map((v, i) => v / b[i]);
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
  
// TODO - Fix remainder
const computeCompletedArrangedTable = (arrangedTable: { value: number, i: number, j: number }[][], arrangedSubTotalsByColumn: number[], arrangedSubTotalsByRow: number[]): { value: number, i: number, j: number }[][] => {
  const subTotalsByColumnTotal = arrangedSubTotalsByColumn.reduce((p,c) => p + c, 0);
  const subTotalsByRowTotal = arrangedSubTotalsByRow.reduce((p,c) => p + c, 0);

  const arrangedTableCopy = arrangedTable.map(row => row.map(col => col));
  // TODO - Good repartition of subtotals
  let proportionalsubTotalsByColumn = arrangedSubTotalsByColumn;

  if (subTotalsByColumnTotal > subTotalsByRowTotal) {
    const initialProportionalsubTotalsByColumn = (new Array(arrangedSubTotalsByColumn.length).fill(0)).map((_, j) => arrangedTable.reduce((p,c) => p + c[j].value, 0));
    const deltas = divide(sub(proportionalsubTotalsByColumn, initialProportionalsubTotalsByColumn), proportionalsubTotalsByColumn);
    const delta = deltas.reduce((p,c) => p+c);
    const increase = (subTotalsByRowTotal - initialProportionalsubTotalsByColumn.reduce((p,c) => p+c)) / delta;

    proportionalsubTotalsByColumn = add(initialProportionalsubTotalsByColumn, mult(deltas, increase)).map(Math.floor);

    const remaining = subTotalsByRowTotal - proportionalsubTotalsByColumn.reduce((p,c) => p + c, 0);
    proportionalsubTotalsByColumn = proportionalsubTotalsByColumn
      .map((subtotal, j) => j < remaining ? subtotal + 1 : subtotal);
    console.log(proportionalsubTotalsByColumn);
  }

  let proportionalsubTotalsByRow = arrangedSubTotalsByRow;

  if (subTotalsByRowTotal > subTotalsByColumnTotal) {
    const initialProportionalsubTotalsByRow = (new Array(arrangedSubTotalsByRow.length).fill(0)).map((_, i) => arrangedTable[i].reduce((p,c) => p + c.value, 0));
    const deltas = divide(sub(proportionalsubTotalsByRow, initialProportionalsubTotalsByRow), proportionalsubTotalsByRow);
    const delta = deltas.reduce((p,c) => p+c);
    const increase = (subTotalsByColumnTotal - initialProportionalsubTotalsByRow.reduce((p,c) => p+c)) / delta;

    proportionalsubTotalsByRow = add(initialProportionalsubTotalsByRow, mult(deltas, increase)).map(Math.floor);

    const remaining = subTotalsByColumnTotal - proportionalsubTotalsByRow.reduce((p,c) => p + c, 0);
    proportionalsubTotalsByRow = proportionalsubTotalsByRow
      .map((subtotal, j) => j < remaining ? subtotal + 1 : subtotal);
    console.log(proportionalsubTotalsByRow);
  }

  console.log({ proportionalsubTotalsByColumn, proportionalsubTotalsByRow, subTotalsByColumnTotal, subTotalsByRowTotal });

  for (let i = 0; i < arrangedTable.length; i++) {
    for (let j = 0; j < arrangedTable[0].length; j++) {
      const cell = arrangedTable[i][j];
      if (cell.value > 0) continue;

      const column = arrangedTable.map(row => row[j]);
      if (column.every((c, y) => c.value > 0 || y === i)) {
        arrangedTable[i][j] = { ...cell, value : proportionalsubTotalsByColumn[j] -  column.reduce((p,c) => p+c.value, 0)};
        continue;
      }

      if (arrangedTable[i].every((c, x) => c.value > 0 || x === j)) {
        arrangedTable[i][j] = { ...cell, value : proportionalsubTotalsByRow[i] -  arrangedTable[i].reduce((p,c) => p+c.value, 0)};
        continue;
      }
      

      const remaining = proportionalsubTotalsByRow[i] - arrangedTable[i].reduce((p,c) => p + c.value, 0);
      
      const total = Math.min(subTotalsByRowTotal, subTotalsByColumnTotal);

      const columnUpdatedSubtotal =  proportionalsubTotalsByColumn[j] - column.reduce((p,c) => p + c.value, 0);
      const updatedTotal = total //- proportionalsubTotalsByColumn.filter((_,x) => arrangedTable[i][x].value > 0).reduce((p,c) => p+c.value,0) - arrangedTable.reduce((pr,cr) => pr + cr.reduce((p,c,x) => arrangedTable[i][x].value > 0 ? p : p + c.value, 0), 0);
      console.log({ remaining, total, columnUpdatedSubtotal, updatedTotal });
      arrangedTable[i][j] = {
        ...cell,
        value: Math.floor(remaining * columnUpdatedSubtotal / updatedTotal),
      };
    }
  }
    
  /*for (let i = 0; i < arrangedTable.length; i++) {
    for (let j = 0; j < arrangedTable[0].length; j++) {
      const row = arrangedTable[i];
      const column = arrangedTable.map(row => row[j]);
      if (row.reduce((p,c) => p + c.value, 0) < proportionalsubTotalsByRow[i].value &&
          column.reduce((p,c) => p + c.value, 0) < proportionalsubTotalsByColumn[j].value &&
          arrangedTableCopy[i][j].value === 0) {
        arrangedTable[i][j].value++;
      }
    }
  }*/
  console.table(arrangedTable.map(row => row.map(({value}) => value)));

  return arrangedTable;
}

export const split = (table: Table, subTotalsByColumn: TableLine, subTotalsByRow: TableLine, total: number) => {
  let tableCopy = table.map(row => row.map(cell => cell));
  let flatTable = getFlatTable(table);

  const tableWithIndexes = tableCopy.map((row, i) => row.map((value, j) => ({ value, i, j})));
  const arrangedTable = tableWithIndexes.filter((_, i) => subTotalsByRow[i] > 0).map(row => row.filter((_, j) => subTotalsByColumn[j] > 0));

  const arrangedSubTotalsByColumn = subTotalsByColumn.map((value, j) => value - flatTable.reduce((p,c) => c.j === j && subTotalsByRow[c.i] === 0 ? p + (c.value ?? 0 ) : p, 0)).filter(value => value > 0);
  const arrangedSubTotalsByRow = subTotalsByRow.map((value, i) => value - flatTable.reduce((p,c) => c.i === i && subTotalsByColumn[c.j] === 0 ? p + (c.value ?? 0 ) : p, 0)).filter(value => value > 0);


  const completedArrangedTable = computeCompletedArrangedTable(arrangedTable, arrangedSubTotalsByColumn, arrangedSubTotalsByRow);

  const flatCompletedArrangedTable = completedArrangedTable.flatMap(row => row);
  
  const newTable = tableCopy.map((row, i) => row.map((cell, j) => flatCompletedArrangedTable.find(c => c.i === i && c.j === j)?.value ?? cell))

  subTotalsByColumn.forEach((subtotal, j) => {
    if (subtotal === 0) return;
    const freeCells = subTotalsByRow.map((sub, i) => ({ sub, i})).filter(({sub}) => sub === 0);
    if (freeCells.length === 0) return;
    const delta = Math.floor((subtotal - newTable.map(row => row[j]).reduce((p,c) => p + c, 0)) / freeCells.length);
    freeCells.forEach((y) => newTable[y.i][j] += delta);
    freeCells.forEach((y) => {
      if (newTable.map(row => row[j]).reduce((p,c) => p + c, 0) < subtotal) newTable[y.i][j]++;
    });
  });

  subTotalsByRow.forEach((subtotal, i) => {
    if (subtotal === 0) return;
    const freeCells = subTotalsByColumn.map((sub, j) => ({ sub, j})).filter(({sub}) => sub === 0);
    if (freeCells.length === 0) return;
    const delta = Math.floor((subtotal - newTable[i].reduce((p,c) => p + c, 0)) / freeCells.length);
    freeCells.forEach((x) => newTable[i][x.j] += delta);
    freeCells.forEach((x) => {
      if (newTable[i].reduce((p,c) => p + c, 0) < subtotal) newTable[i][x.j]++;
    });
  });

  const flatNewTable = getFlatTable(newTable);
  const remaining = total - flatNewTable.reduce((p,c) => p + (c.value ?? 0), 0);
  const editableCells = flatNewTable.filter(({i,j}) => subTotalsByColumn[j] === 0 && subTotalsByRow[i] === 0);
  if (remaining > 0 && editableCells.length === 0) {
    throw "impossible split";
  }
  const delta = remaining / editableCells.length;
  const deltaRemainder = remaining % editableCells.length;

  editableCells.forEach(({i,j}) => newTable[i][j] += Math.floor(delta));
  editableCells.forEach(({i,j}, index) => {
    if (index < deltaRemainder) newTable[i][j] ++;
  });

  const newSubtotalsByColumn = newTable.reduce((p,c) => add(p,c), new Array(newTable[0].length).fill(0));
  const newSubtotalsByRow = newTable.map(row => row.reduce((p,c) => p + c), 0);

  if (isTableNegative(newTable)) {
    throw "impossible split";
  }

  if (!checkSubTotals(newSubtotalsByColumn, subTotalsByColumn) || !checkSubTotals(newSubtotalsByRow, subTotalsByRow)) {
    throw "impossible split";
  }

  return {
    newTable: newTable,
    newSubtotalsByColumn: newSubtotalsByColumn,
    newSubtotalsByRow: newSubtotalsByRow,
  };
}
