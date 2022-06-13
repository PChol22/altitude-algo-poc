import { Box, Button, Grid, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import './App.css';

const initialTable = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
const initialTotalsRow = [0, 0, 0, 0, 0];
const initialTotalsCol = [0, 0, 0];
const initialTotal = 100000;

const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
const equals = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);

function isNumeric(str: string) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(+str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function App() {

  const [table, setTable] = useState(initialTable);
  const [totalsRow, setTotalsRow] = useState(initialTotalsRow);
  const [totalsCol, setTotalsCol] = useState(initialTotalsCol);
  const [total, setTotal] = useState(initialTotal);
  const [consistency, setConsistency] = useState(true);

  const updateTable = (i: number, j: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTable = table.map((row, y) => row.map((cell, x) => y === i && x === j ? +value : cell));
    setTable(newTable);
  };

  const updateTotalsRow = (j: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTotalsRow = totalsRow.map((cell, x) => x === j ? +value : cell);
    setTotalsRow(newTotalsRow);
  };

  const updateTotalsCol = (i: number, value: string) => {
    if (!isNumeric(value)) return;
    const newTotalsCol = totalsCol.map((cell, y) => y === i ? +value : cell);
    setTotalsCol(newTotalsCol);
  };
  
  const updateTotal = (value: string) => {
    if (!isNumeric(value)) return;
    setTotal(+value);
  }

  const checkConsistency = () => {
    const expectedTotalsCol = table.map(row => row.reduce((prv, cur) => prv + cur), 0);
    const expectedTotalsRow = table.reduce((prv, cur) => add(prv, cur), initialTotalsRow);
    const expectedTotal1 = totalsRow.reduce((p,c) => p+c, 0);
    const expectedTotal2 = totalsCol.reduce((p,c) => p+c, 0);
    setConsistency(equals(expectedTotalsCol, totalsCol) &&
                   equals(expectedTotalsRow, totalsRow) &&
                          expectedTotal1 === total &&
                          expectedTotal2 === total);
  }

  useEffect(checkConsistency, [table, totalsCol, totalsRow, total]);






  const split = () => {
    let tableCopy = table.map(row => row.map(cell => cell));
    let flatCells = tableCopy.flatMap((row, i) => row.flatMap((cell, j) => ({ cell, i, j })));
    let editableCells = flatCells
      .filter(({ cell }) => cell === 0).map(({ i, j }) => ({ i, j }));

    let fixedCols = totalsRow
      .map((total, j) => ({
        total,
        j,
        i: -1,
        cells: flatCells
                .filter(cell => cell.j === j)
                .map(cell => ({ ...cell, fixed: editableCells.filter(({i,j}) => i === cell.i && j === cell.j).length === 0 }))
      }))
    .filter(({total}) => total > 0);

    let fixedRows = totalsCol
      .map((total, i) => ({
        total,
        i,
        j: -1,
        cells: flatCells
                .filter(cell => cell.i === i)
                .map(cell => ({ ...cell, fixed: editableCells.filter(({i,j}) => i === cell.i && j === cell.j).length === 0 }))
      }))
      .filter(({total}) => total > 0);

    let fixedValues = [
      ...fixedCols,
      ...fixedRows,
    ];

    while (fixedValues.length > 0) {
      
      fixedCols = totalsRow
        .map((total, j) => ({
          total,
          j,
          i: -1,
          cells: flatCells
                  .filter(cell => cell.j === j)
                  .map(cell => ({ ...cell, fixed: editableCells.filter(({i,j}) => i === cell.i && j === cell.j).length === 0 }))
        }))
      .filter(fixedInfo => fixedValues.filter(({ i, j}) => i === fixedInfo.i && j === fixedInfo.j).length > 0);

      fixedRows = totalsCol
        .map((total, i) => ({
          total,
          i,
          j: -1,
          cells: flatCells
                  .filter(cell => cell.i === i)
                  .map(cell => ({ ...cell, fixed: editableCells.filter(({i,j}) => i === cell.i && j === cell.j).length === 0 }))
        }))
        .filter(fixedInfo => fixedValues.filter(({ i, j}) => i === fixedInfo.i && j === fixedInfo.j).length > 0);

      fixedValues = [
        ...fixedCols,
        ...fixedRows,
      ];

      const nextThreshHold = fixedValues.map(fixedInfo => ({
        ...fixedInfo,
        delta: fixedInfo.cells.filter(cell => !cell.fixed).length > 0 ? (fixedInfo.total - fixedInfo.cells.reduce((p,c) => p + c.cell, 0)) / fixedInfo.cells.filter(cell => !cell.fixed).length : 0,
        deltaRemainder: fixedInfo.cells.filter(cell => !cell.fixed).length > 0 ? (fixedInfo.total - fixedInfo.cells.reduce((p,c) =>  p + c.cell, 0)) % fixedInfo.cells.filter(cell => !cell.fixed).length : 0,
      })).reduce((p,c) => c.delta < p.delta ? c : p, { delta: Number.POSITIVE_INFINITY, i: -1, j: -1, total: -1, cells: [], deltaRemainder: 0 });

      if (nextThreshHold.delta < 0) throw { msg: "Impossible split", nextThreshHold};

      const newFixedCells = fixedValues.filter(fixedInfo => fixedInfo.i === nextThreshHold.i && fixedInfo.j === nextThreshHold.j)[0].cells;
      fixedValues = fixedValues.filter(fixedInfo => fixedInfo.i !== nextThreshHold.i || fixedInfo.j !== nextThreshHold.j);
      let buf = 0;
      tableCopy = tableCopy.map((row, y) => row.map((cell, x) => {
        if (editableCells.filter(({i,j}) => i === y && j === x).length === 0) return cell;
        const result = cell + Math.floor(nextThreshHold.delta);
        if (nextThreshHold.cells.filter(({i,j}) => i === y && j === x).length === 0) return result;
        buf += 1;
        return (buf <= nextThreshHold.deltaRemainder ? result + 1 : result);
      }));
      editableCells = editableCells.filter(({ i, j }) => newFixedCells.filter((cell) => cell.i === i && cell.j === j).length === 0);
      flatCells = tableCopy.flatMap((row, i) => row.flatMap((cell, j) => ({ cell, i, j })));
    }
    const newTotal = flatCells.reduce((p,c) => p + c.cell, 0);
    if (editableCells.length === 0 && newTotal != total) throw { msg: "Impossible split", editableCells };
    const lastDelta = (total - newTotal) / editableCells.length;
    const lastDeltaRemainder  = (total - newTotal) % editableCells.length;
    let buf = 0;
    tableCopy = tableCopy.map((row, y) => row.map((cell, x) => {
      if (editableCells.filter(({i,j}) => i === y && j === x).length === 0) return cell;
      buf += 1;
      return buf <= lastDeltaRemainder ? cell + Math.floor(lastDelta) + 1 : cell + Math.floor(lastDelta);
    }));
    const newTotalsCol = tableCopy.map(row => row.reduce((prv, cur) => prv + cur), 0);
    const newTotalsRow = tableCopy.reduce((prv, cur) => add(prv, cur), initialTotalsRow);
    setTable(tableCopy);
    setTotalsCol(newTotalsCol);
    setTotalsRow(newTotalsRow);
  }

  return (
    <Box>
      <Grid container>
        {table.map((row, i) => (
          <Grid container item>
            {
              row.map((_, j) => <Grid item><TextField value={table[i][j]} onChange={(e) => updateTable(i, j, e.target.value)}></TextField></Grid>)
            }
            <Grid item marginLeft={1}><TextField value={totalsCol[i]} onChange={(e) => updateTotalsCol(i, e.target.value)}></TextField></Grid>
          </Grid>
        ))}
        <Grid container item marginTop={1}>
          {
            totalsRow.map((_, j) => <Grid item><TextField value={totalsRow[j]} onChange={(e) => updateTotalsRow(j, e.target.value)}></TextField></Grid>)
          }
          <Grid item marginLeft={1}><TextField value={total} onChange={(e) => updateTotal(e.target.value)}></TextField></Grid>
        </Grid>
      </Grid>
      <Button onClick={split} variant="outlined">Split</Button>
      {consistency ? <h3>✅</h3> : <h3>❌</h3>}
    </Box>
  );
}

export default App
   