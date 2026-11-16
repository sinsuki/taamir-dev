const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : "";
}

export function scores(board) {
  return board.map((cell, index) => {
    if (cell) return null;
    const next = board.slice();
    next[index] = "O";
    return minimax(next, "X");
  });
}

export function bestMove(board) {
  let choice = -1;
  let best = -2;
  for (const [index, score] of scores(board).entries()) {
    if (score != null && score > best) {
      best = score;
      choice = index;
    }
  }
  return choice;
}

function minimax(board, player) {
  const state = winner(board);
  if (state === "O") return 1;
  if (state === "X") return -1;
  if (state === "draw") return 0;
  let best = player === "O" ? -2 : 2;
  for (let index = 0; index < 9; index += 1) {
    if (board[index]) continue;
    board[index] = player;
    const score = minimax(board, player === "O" ? "X" : "O");
    board[index] = "";
    best = player === "O" ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}
