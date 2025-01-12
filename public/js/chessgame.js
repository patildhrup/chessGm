const socket = io(); 

socket.emit('msg1'); // send to server

// received from server
socket.on('msg2', function () {
    console.log("msg2 received on frontend");
});

const chess = new Chess();
const boardElement = document.querySelector('.chessboard');
let capturedPieces = { w: [], b: [] };
let scores = { w: 0, b: 0 };

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;


const renderBoard = () => {
    const board = chess.board(); // 8 x 8
    console.log(board);
    
    boardElement.innerHTML = '';
    
    board.forEach((row, rowIndex) => {
        console.log(row,rowIndex); // row
        
        row.forEach((square, squareIndex) => {
            console.log(square,squareIndex); // col
            
            const squareElement = document.createElement('div');
            squareElement.classList.add('square', (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color === 'w' ? 'white' : 'black');
                pieceElement.innerHTML = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData('text/plain', '');
                    }
                });

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };

                    handleMove(sourceSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    } else {
        boardElement.classList.remove('flipped');
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q', // Default promotion to queen
    };

    const moveResult = chess.move(move);
    if (moveResult && moveResult.captured) {
        const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
        capturedPieces[capturedColor].push({ type: moveResult.captured, color: capturedColor });

        // Update score
        scores[capturedColor] += pieceValue(moveResult.captured);

        updateSidePanels();
    }

    // determineWinner(); // Check for game end conditions
    socket.emit('move', move);

};

const determineWinner = () => {
    if (chess.isCheckmate()) {
        // The player whose king is NOT in checkmate wins
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        alert(`${winner} wins by checkmate!`);
    } else if (chess.isStalemate()) {
        alert("Game ends in a stalemate!");
    } else if (chess.isDraw()) {
        alert("Game ends in a draw!");
    }
};

// document.getElementById('check-winner').addEventListener('click', decideWinnerByScore);
const decideWinnerByScore = () => {
    if (scores.w > scores.b) {
        alert("White wins by score!");
    } else if (scores.b > scores.w) {
        alert("Black wins by score!");
    } else {
        alert("It's a draw!");
    }
};



const pieceValue = (type) => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    return values[type] || 0;
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        'p': piece.color === 'w' ? '♙' : '♟',
        'r': piece.color === 'w' ? '♖' : '♜',
        'n': piece.color === 'w' ? '♘' : '♞',
        'b': piece.color === 'w' ? '♗' : '♝',
        'q': piece.color === 'w' ? '♕' : '♛',
        'k': piece.color === 'w' ? '♔' : '♚',
    };
    return unicodePieces[piece.type] || "";
};

const updateSidePanels = () => {
    const blackCaptures = document.getElementById("black-captures");
    const whiteCaptures = document.getElementById("white-captures");
    const whiteScore = document.getElementById("white-score");
    const blackScore = document.getElementById("black-score");

    blackCaptures.innerHTML = capturedPieces.b.map(piece => `<span>${getPieceUnicode(piece)}</span>`).join('');
    whiteCaptures.innerHTML = capturedPieces.w.map(piece => `<span>${getPieceUnicode(piece)}</span>`).join('');

    whiteScore.innerText = scores.w;
    blackScore.innerText = scores.b;
};


socket.on('playerRole', function (role) {
    playerRole = role;
    renderBoard();
});

socket.on('spectatorRole', function () {
    playerRole = null;
    renderBoard();
});

socket.on('boardState', function (fen) {
    try {
        chess.load(fen);
        renderBoard();
    } catch (error) {
        console.error("Invalid FEN string:", fen, error);
    }
});

socket.on('move', function (move) {
    const moveResult = chess.move(move);
    if (moveResult && moveResult.captured) {
        const capturedColor = moveResult.color === 'w' ? 'b' : 'w';
        capturedPieces[capturedColor].push({ type: moveResult.captured, color: capturedColor });

        // Update score
        scores[capturedColor] += pieceValue(moveResult.captured);

        updateSidePanels();
    }
    renderBoard();
});

renderBoard();
updateSidePanels();
