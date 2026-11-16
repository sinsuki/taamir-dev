const BASE = [
  "123456789",
  "456789123",
  "789123456",
  "231564897",
  "564897231",
  "897231564",
  "312645978",
  "645978312",
  "978312645",
].map((row) => [...row].map(Number));

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dailyPuzzle(date = new Date()) {
  const random = mulberry32(hash(localDate(date)));
  let grid = BASE.map((row) => row.slice());
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  grid = grid.map((row) => row.map((n) => digits[n - 1]));
  for (const band of [0, 1, 2]) swapRows(grid, band * 3, random);
  swapGroups(grid, random, true);
  if (random() < 0.5) grid = transpose(grid);
  for (const stack of [0, 1, 2]) swapCols(grid, stack * 3, random);
  swapGroups(grid, random, false);
  const puzzle = grid.flat();
  const order = shuffle([...Array(81).keys()], random);
  let givens = 81;
  for (const index of order) {
    if (givens <= 34) break;
    const saved = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[index] = saved;
    else givens -= 1;
  }
  return puzzle;
}

export function hint(puzzle) {
  const marks = puzzle.map((value, index) => (value ? [] : open(puzzle, index)));
  for (let index = 0; index < 81; index += 1) {
    if (marks[index].length === 1) {
      const digit = marks[index][0];
      return { index, digit, text: `Only ${digit} can go in this cell.` };
    }
  }
  for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let unit = 0; unit < 9; unit += 1) {
      for (const [name, cells] of [
        ["row", rowCells(unit)],
        ["column", colCells(unit)],
        ["box", boxCells(unit)],
      ]) {
        const spots = cells.filter((index) => marks[index].includes(digit));
        if (spots.length === 1) return { index: spots[0], digit, text: `Only spot for a ${digit} in this ${name}.` };
      }
    }
  }
  return null;
}

export function solved(puzzle) {
  if (puzzle.some((value) => !value)) return false;
  for (let index = 0; index < 81; index += 1) {
    const value = puzzle[index];
    puzzle[index] = 0;
    const ok = open(puzzle, index).includes(value);
    puzzle[index] = value;
    if (!ok) return false;
  }
  return true;
}

function countSolutions(puzzle, limit) {
  const index = puzzle.findIndex((value) => !value);
  if (index < 0) return 1;
  let found = 0;
  for (const digit of open(puzzle, index)) {
    puzzle[index] = digit;
    found += countSolutions(puzzle, limit - found);
    puzzle[index] = 0;
    if (found >= limit) break;
  }
  return found;
}

function open(puzzle, index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const used = new Set();
  for (let i = 0; i < 9; i += 1) {
    used.add(puzzle[row * 9 + i]);
    used.add(puzzle[i * 9 + col]);
    const r = Math.floor(box / 3) * 3 + Math.floor(i / 3);
    const c = (box % 3) * 3 + (i % 3);
    used.add(puzzle[r * 9 + c]);
  }
  const left = [];
  for (let digit = 1; digit <= 9; digit += 1) if (!used.has(digit)) left.push(digit);
  return left;
}

function rowCells(row) {
  return Array.from({ length: 9 }, (_, col) => row * 9 + col);
}
function colCells(col) {
  return Array.from({ length: 9 }, (_, row) => row * 9 + col);
}
function boxCells(box) {
  const row = Math.floor(box / 3) * 3;
  const col = (box % 3) * 3;
  const cells = [];
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) cells.push((row + r) * 9 + col + c);
  return cells;
}

function swapRows(grid, start, random) {
  const rows = shuffle([0, 1, 2], random);
  const copy = grid.map((row) => row.slice());
  rows.forEach((from, to) => {
    grid[start + to] = copy[start + from];
  });
}
function swapCols(grid, start, random) {
  const cols = shuffle([0, 1, 2], random);
  for (const row of grid) {
    const copy = row.slice();
    cols.forEach((from, to) => {
      row[start + to] = copy[start + from];
    });
  }
}
function swapGroups(grid, random, rows) {
  const order = shuffle([0, 1, 2], random);
  if (rows) {
    const copy = grid.map((row) => row.slice());
    order.forEach((from, to) => {
      for (let i = 0; i < 3; i += 1) grid[to * 3 + i] = copy[from * 3 + i];
    });
    return;
  }
  for (const row of grid) {
    const saved = row.slice();
    order.forEach((from, to) => {
      for (let i = 0; i < 3; i += 1) row[to * 3 + i] = saved[from * 3 + i];
    });
  }
}
function transpose(grid) {
  return grid[0].map((_, col) => grid.map((row) => row[col]));
}
function shuffle(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
