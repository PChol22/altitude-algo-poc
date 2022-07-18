export const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const equals = (a: number[], b: number[]) =>
  a.every((v, i) => v === b[i]);
export const sum = (a: number[]) => a.reduce((p, c) => p + c, 0);
export const valueSum = (a: { value: number }[]) =>
  a.reduce((p, c) => p + c.value, 0);

const swap = (
  mat: number[][],
  row1: number,
  row2: number,
  col: number
): void => {
  for (let i = 0; i < col; i++) {
    const temp = mat[row1][i];
    mat[row1][i] = mat[row2][i];
    mat[row2][i] = temp;
  }
};

export const rankOfMatrix = (mat: number[][]): number => {
  const R = mat.length;
  const C = mat[0].length;

  let rank = Math.min(C, R);

  for (let row = 0; row < rank; row++) {
    if (mat[row][row] != 0) {
      for (let col = 0; col < R; col++) {
        if (col != row) {
          const mult = mat[col][row] / mat[row][row];

          for (let i = 0; i < rank; i++) {
            mat[col][i] -= mult * mat[row][i];
          }
        }
      }
    } else {
      let reduce = true;

      for (let i = row + 1; i < R; i++) {
        if (mat[i][row] != 0) {
          swap(mat, row, i, rank);
          reduce = false;
          break;
        }
      }
      if (reduce) {
        rank--;

        for (let i = 0; i < R; i++) mat[i][row] = mat[i][rank];
      }
      row--;
    }
  }
  return rank;
};
