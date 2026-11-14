const test = require('node:test');
const assert = require('node:assert/strict');
const {
    checkWin,
    generateWinningLines,
    getBestMove,
    getKeyboardMove,
    getHandPose,
    getHandGesture,
    getHandAction,
    getDwellProgress
} = require('../script.js');

function emptyBoard() {
    return Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => Array(3).fill(0))
    );
}

function makeHand(extendedFingers = []) {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6, z: 0 }));
    landmarks[0] = { x: 0.5, y: 0.85, z: 0 };
    landmarks[5] = { x: 0.35, y: 0.62, z: 0 };
    landmarks[17] = { x: 0.65, y: 0.62, z: 0 };

    [[6, 8], [10, 12], [14, 16], [18, 20]].forEach(([joint, tip], index) => {
        const x = 0.35 + index * 0.1;
        landmarks[joint] = { x, y: 0.6, z: 0 };
        landmarks[tip] = { x, y: extendedFingers.includes(index) ? 0.2 : 0.7, z: 0 };
    });

    return landmarks;
}

test('genera las 49 líneas rectas únicas del tablero 3D', () => {
    const lines = generateWinningLines();
    const keys = new Set(lines.map(line => line.map(cell => cell.join(',')).join('|')));

    assert.equal(lines.length, 49);
    assert.equal(keys.size, 49);
    for (const line of lines) {
        const [start, middle, end] = line;
        assert.deepEqual(
            middle.map((value, i) => value - start[i]),
            end.map((value, i) => value - middle[i])
        );
    }
});

test('detecta una columna en una capa, incluida la columna antes omitida', () => {
    const board = emptyBoard();
    board[2][0][1] = 1;
    board[2][1][1] = 1;
    board[2][2][1] = 1;

    assert.equal(checkWin(board).winner, 1);
});

test('detecta diagonales tridimensionales de ambos jugadores', () => {
    const board = emptyBoard();
    board[0][0][0] = -1;
    board[1][1][1] = -1;
    board[2][2][2] = -1;

    assert.equal(checkWin(board).winner, -1);
});

test('detecta correctamente cada una de las 49 líneas ganadoras', () => {
    for (const line of generateWinningLines()) {
        for (const player of [1, -1]) {
            const board = emptyBoard();
            for (const [x, y, z] of line) board[x][y][z] = player;
            assert.equal(checkWin(board).winner, player);
            assert.deepEqual(checkWin(board).line, line);
        }
    }
});

test('prioriza una victoria sobre un tablero completo', () => {
    const board = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => Array(3).fill(1))
    );

    assert.equal(checkWin(board).winner, 1);
});

test('devuelve null mientras una partida siga abierta', () => {
    assert.equal(checkWin(emptyBoard()), null);
});

test('las flechas verticales siguen la dirección visual y Q/E cambian de capa', () => {
    assert.deepEqual(getKeyboardMove('ArrowUp'), [0, 1, 0]);
    assert.deepEqual(getKeyboardMove('ArrowDown'), [0, -1, 0]);
    assert.deepEqual(getKeyboardMove('q'), [0, 0, -1]);
    assert.deepEqual(getKeyboardMove('E'), [0, 0, 1]);
    assert.equal(getKeyboardMove('PageUp'), null);
});

test('clasifica mano abierta, puño e índice extendido usando distancias 3D', () => {
    const openHand = getHandPose(makeHand([0, 1, 2, 3]));
    assert.equal(openHand.fingersUp, 4);
    assert.equal(openHand.indexUp, true);
    assert.equal(getHandPose(makeHand()).fingersUp, 0);
    const pointingHand = getHandPose(makeHand([0]));
    assert.equal(pointingHand.fingersUp, 1);
    assert.equal(pointingHand.indexUp, true);
});

test('la detección de dedos extendidos no depende de la orientación de la mano', () => {
    const wrist = makeHand([0, 1, 2, 3])[0];
    const rotatedHand = makeHand([0, 1, 2, 3]).map(point => ({
        ...point,
        x: wrist.x - (point.y - wrist.y),
        y: wrist.y + (point.x - wrist.x)
    }));

    assert.equal(getHandPose(rotatedHand).fingersUp, 4);
});

test('clasifica puño, mano abierta, índice y poses intermedias', () => {
    assert.equal(getHandGesture(getHandPose(makeHand([0, 1, 2, 3]))), 'open');
    assert.equal(getHandGesture(getHandPose(makeHand())), 'fist');
    assert.equal(getHandGesture(getHandPose(makeHand([0]))), 'point');
    assert.equal(getHandGesture(getHandPose(makeHand([0, 1]))), null);
});

test('señalar selecciona sin activar expansión y la mano abierta la completa', () => {
    assert.equal(getHandAction('point', true), 'select');
    assert.equal(getHandAction('open', true), 'expand');
    assert.equal(getHandAction('open', false), 'rotate');
    assert.equal(getHandAction('fist', true), 'collapse');
});

test('el progreso del clic aéreo se limita al intervalo de permanencia', () => {
    assert.equal(getDwellProgress(100, 50, 1000), 0);
    assert.equal(getDwellProgress(100, 600, 1000), 0.5);
    assert.equal(getDwellProgress(100, 1200, 1000), 1);
});

test('la IA gana en una jugada cuando tiene una línea abierta', () => {
    const board = emptyBoard();
    board[1][1][1] = -1;
    board[0][0][0] = -1;
    const before = JSON.stringify(board);

    const result = getBestMove(board, 2);

    assert.ok(result.move);
    assert.equal(JSON.stringify(board), before);
    assert.equal(board[result.move.x][result.move.y][result.move.z], 0);
    board[result.move.x][result.move.y][result.move.z] = -1;
    assert.equal(checkWin(board).winner, -1);
    assert.ok(result.nodes > 0);
});

test('la IA bloquea una victoria inmediata del jugador', () => {
    const board = emptyBoard();
    board[0][0][1] = 1;
    board[1][0][1] = 1;

    const result = getBestMove(board, 1);

    assert.deepEqual(result.move, { x: 2, y: 0, z: 1 });
});

test('la búsqueda experta respeta el límite de nodos y devuelve una jugada legal', () => {
    const board = emptyBoard();
    const before = JSON.stringify(board);

    const result = getBestMove(board, 5, { iterative: true, maxNodes: 5000 });

    assert.ok(result.move);
    assert.equal(board[result.move.x][result.move.y][result.move.z], 0);
    assert.equal(JSON.stringify(board), before);
    assert.ok(result.nodes <= 5000);
    assert.ok(result.depth >= 1 && result.depth <= 5);
});
