import { useState, useEffect, useRef, useCallback } from 'react';
import GridCanvas from './components/GridCanvas';
import ImmuneControls from './components/ImmuneControls';
import './App.css';

// Helper functions
const randomDir = () => ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];

const moveCell = (cell, dir, gridSize) => {
    const moves = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const move = moves[dir];
    const newX = cell.x + move.x;
    const newY = cell.y + move.y;
    if (newX >= 0 && newX < gridSize.width && newY >= 0 && newY < gridSize.height) {
        return { x: newX, y: newY };
    } else {
        return { x: cell.x, y: cell.y }; // Stay in place if move is out of bounds
    }
};

const getDirectionTo = (from, to, gridSize) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
    } else {
        return dy > 0 ? 'down' : 'up';
    }
};

const findNearest = (from, targets, gridSize) => {
    if (targets.length === 0) return null;
    return targets.reduce((near, target) => {
        const distNear = Math.abs(near.x - from.x) + Math.abs(near.y - from.y);
        const distTarget = Math.abs(target.x - from.x) + Math.abs(target.y - from.y);
        return distTarget < distNear ? target : near;
    }, targets[0]);
};

const isImmuneCellNearby = (b, immuneCells, range, gridSize) => {
    return immuneCells.some(cell => {
        const dx = Math.abs(cell.x - b.x);
        const dy = Math.abs(cell.y - b.y);
        return dx + dy <= range;
    });
};

const getAdjacentPositions = (pos, gridSize) => {
    const adjacent = [];
    if (pos.y > 0) adjacent.push({ x: pos.x, y: pos.y - 1 }); // Up
    if (pos.y < gridSize.height - 1) adjacent.push({ x: pos.x, y: pos.y + 1 }); // Down
    if (pos.x > 0) adjacent.push({ x: pos.x - 1, y: pos.y }); // Left
    if (pos.x < gridSize.width - 1) adjacent.push({ x: pos.x + 1, y: pos.y }); // Right
    return adjacent;
};

const isAdjacent = (pos1, pos2, gridSize) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
};

const spawnImmuneCell = (gridSize, type = null) => {
    const types = type ? [type] : ['macrophage', 'tcell', 'bcell'];
    const colors = { macrophage: '#FF4500', tcell: '#00CED1', bcell: '#FFD700' };
    const chosenType = types[Math.floor(Math.random() * types.length)];
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.floor(Math.random() * gridSize.width),
        y: Math.floor(Math.random() * gridSize.height),
        type: chosenType,
        dir: randomDir(),
        color: colors[chosenType]
    };
};

const spawnBacteria = (gridSize) => ({
    id: Math.random().toString(36).substr(2, 9),
    x: Math.floor(Math.random() * gridSize.width),
    y: Math.floor(Math.random() * gridSize.height),
    color: '#800080',
    marked: false
});

const App = () => {
    const [gridSize] = useState({ width: 50, height: 50 });
    const [grid, setGrid] = useState(initializeGrid(gridSize));
    const [immuneCells, setImmuneCells] = useState(initializeImmuneCells(gridSize));
    const [bacteria, setBacteria] = useState([]);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef(null);

    function initializeGrid(size) {
        const grid = Array(size.height).fill().map(() => Array(size.width).fill('#FFFFFF'));
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * size.width);
            const y = Math.floor(Math.random() * size.height);
            grid[y][x] = '#E0E0E0'; // Healthy tissue
        }
        return grid;
    }

    function initializeImmuneCells(size) {
        const positions = [];
        const cells = [
            { id: Math.random().toString(36).substr(2, 9), x: 20, y: 20, type: 'macrophage', dir: 'up', color: '#FF4500' },
            { id: Math.random().toString(36).substr(2, 9), x: 30, y: 30, type: 'tcell', dir: 'right', color: '#00CED1' },
            { id: Math.random().toString(36).substr(2, 9), x: 25, y: 25, type: 'bcell', dir: 'down', color: '#FFD700' }
        ];
        cells.forEach(cell => {
            while (positions.some(p => p.x === cell.x && p.y === cell.y)) {
                cell.x = Math.floor(Math.random() * size.width);
                cell.y = Math.floor(Math.random() * size.height);
            }
            positions.push({ x: cell.x, y: cell.y });
        });
        return cells;
    }

    const updateSimulation = useCallback(() => {
        const newGrid = grid.map(row => [...row]);

        // Current immune positions
        const currentImmunePositions = new Set(immuneCells.map(c => `${c.x},${c.y}`));

        // Move bacteria first, avoiding current immune positions
        const newBacteriaPositions = new Set();
        const newBacteria = bacteria.map(b => {
            let dir;
            const nearestImmune = findNearest(b, immuneCells, gridSize);
            const distToImmune = nearestImmune ? Math.abs(nearestImmune.x - b.x) + Math.abs(nearestImmune.y - b.y) : Infinity;
            if (distToImmune <= 2) {
                const dx = nearestImmune.x - b.x;
                const dy = nearestImmune.y - b.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    dir = dx > 0 ? 'left' : 'right';
                } else {
                    dir = dy > 0 ? 'up' : 'down';
                }
            } else {
                const healthyTissues = [];
                for (let y = 0; y < gridSize.height; y++) {
                    for (let x = 0; x < gridSize.width; x++) {
                        if (grid[y][x] === '#E0E0E0') {
                            healthyTissues.push({x, y});
                        }
                    }
                }
                if (healthyTissues.length > 0) {
                    dir = getDirectionTo(b, findNearest(b, healthyTissues, gridSize), gridSize);
                } else {
                    dir = randomDir();
                }
            }
            let newPos = moveCell(b, dir, gridSize);
            let attempts = 0;
            while ((currentImmunePositions.has(`${newPos.x},${newPos.y}`) || newBacteriaPositions.has(`${newPos.x},${newPos.y}`)) && attempts < 4) {
                dir = randomDir();
                newPos = moveCell(b, dir, gridSize);
                attempts++;
            }
            if (!currentImmunePositions.has(`${newPos.x},${newPos.y}`) && !newBacteriaPositions.has(`${newPos.x},${newPos.y}`)) {
                newBacteriaPositions.add(`${newPos.x},${newPos.y}`);
                return { ...b, x: newPos.x, y: newPos.y };
            }
            return b;
        });

        // Move immune cells based on new bacteria positions
        const newImmunePositions = new Set();
        const newImmuneCells = immuneCells.map(cell => {
            let target = null;
            if (cell.type === 'macrophage') {
                // Prioritize adjacent bacteria
                const adjacentBacteria = newBacteria.filter(b => isAdjacent(cell, b, gridSize));
                if (adjacentBacteria.length > 0) {
                    target = adjacentBacteria[0]; // Move to first adjacent bacterium
                } else {
                    const markedBacteria = newBacteria.filter(b => b.marked);
                    if (markedBacteria.length > 0) {
                        target = findNearest(cell, markedBacteria, gridSize);
                    } else if (newBacteria.length > 0) {
                        target = findNearest(cell, newBacteria, gridSize);
                    }
                }
            } else if (cell.type === 'tcell') {
                const infectedTissues = [];
                for (let y = 0; y < gridSize.height; y++) {
                    for (let x = 0; x < gridSize.width; x++) {
                        if (grid[y][x] === '#FF69B4') {
                            infectedTissues.push({x, y});
                        }
                    }
                }
                if (infectedTissues.length > 0) {
                    target = findNearest(cell, infectedTissues, gridSize);
                }
            } else if (cell.type === 'bcell') {
                if (newBacteria.length > 0) {
                    target = findNearest(cell, newBacteria, gridSize);
                }
            }
            let dir = target ? getDirectionTo(cell, target, gridSize) : randomDir();
            let newPos = moveCell(cell, dir, gridSize);
            let attempts = 0;
            while (newImmunePositions.has(`${newPos.x},${newPos.y}`) && attempts < 4) {
                dir = randomDir();
                newPos = moveCell(cell, dir, gridSize);
                attempts++;
            }
            if (!newImmunePositions.has(`${newPos.x},${newPos.y}`)) {
                newImmunePositions.add(`${newPos.x},${newPos.y}`);
                return { ...cell, x: newPos.x, y: newPos.y, dir };
            }
            return cell;
        });

        // Perform actions based on new positions
        let finalBacteria = [...newBacteria];

        // Macrophages eat bacteria on same or adjacent cells
        newImmuneCells.forEach(cell => {
            if (cell.type === 'macrophage') {
                const adjacentPositions = getAdjacentPositions(cell, gridSize);
                const positionsToCheck = [`${cell.x},${cell.y}`, ...adjacentPositions.map(pos => `${pos.x},${pos.y}`)];
                finalBacteria = finalBacteria.filter(b => !positionsToCheck.includes(`${b.x},${b.y}`));
            }
        });

        // T-cells heal infected tissues
        newImmuneCells.forEach(cell => {
            if (cell.type === 'tcell' && newGrid[cell.y][cell.x] === '#FF69B4') {
                newGrid[cell.y][cell.x] = '#E0E0E0';
            }
        });

        // B-cells mark bacteria within range
        newImmuneCells.forEach(cell => {
            if (cell.type === 'bcell') {
                const range = 3;
                finalBacteria.forEach(b => {
                    const dx = Math.abs(b.x - cell.x);
                    const dy = Math.abs(b.y - cell.y);
                    if (dx + dy <= range) {
                        b.marked = true;
                    }
                });
            }
        });

        // Bacteria infect healthy tissues
        finalBacteria.forEach(b => {
            if (newGrid[b.y][b.x] === '#E0E0E0') {
                newGrid[b.y][b.x] = '#FF69B4';
            }
        });

        // Bacteria multiplication
        const newBacteriaToAdd = [];
        finalBacteria.forEach(b => {
            if (newGrid[b.y][b.x] === '#FF69B4' && !isImmuneCellNearby(b, newImmuneCells, 2, gridSize) && Math.random() < 0.05) {
                const adjacent = getAdjacentPositions(b, gridSize);
                const emptyAdjacent = adjacent.filter(pos => !newImmunePositions.has(`${pos.x},${pos.y}`) && !newBacteriaPositions.has(`${pos.x},${pos.y}`));
                if (emptyAdjacent.length > 0) {
                    const spawnPos = emptyAdjacent[Math.floor(Math.random() * emptyAdjacent.length)];
                    newBacteriaToAdd.push({
                        id: Math.random().toString(36).substr(2, 9),
                        x: spawnPos.x,
                        y: spawnPos.y,
                        color: '#800080',
                        marked: false
                    });
                }
            }
        });

        finalBacteria = [...finalBacteria, ...newBacteriaToAdd];

        // Dynamically add macrophages when bacteria exceed threshold
        const bacteriaThreshold = 5;
        const maxImmuneCells = 15;
        if (finalBacteria.length > bacteriaThreshold && newImmuneCells.length < maxImmuneCells) {
            const excessBacteria = finalBacteria.length - bacteriaThreshold;
            const spawnChance = Math.min(0.05 * excessBacteria, 0.5); // 5% per extra bacterium, max 50%
            if (Math.random() < spawnChance) {
                const newCell = { id: Math.random().toString(36).substr(2, 9), type: 'macrophage', color: '#FF4500', dir: randomDir() };
                let attempts = 0;
                while (attempts < 100) {
                    const x = Math.floor(Math.random() * gridSize.width);
                    const y = Math.floor(Math.random() * gridSize.height);
                    const posKey = `${x},${y}`;
                    if (!newImmunePositions.has(posKey) && !newBacteriaPositions.has(posKey)) {
                        newCell.x = x;
                        newCell.y = y;
                        newImmuneCells.push(newCell);
                        newImmunePositions.add(posKey);
                        break;
                    }
                    attempts++;
                }
            }
        }

        // Randomly spawn new bacteria with 2% chance
        if (Math.random() < 0.02) {
            const newBact = spawnBacteria(gridSize);
            const posKey = `${newBact.x},${newBact.y}`;
            if (!newImmunePositions.has(posKey) && !newBacteriaPositions.has(posKey)) {
                finalBacteria.push(newBact);
            }
        }

        setGrid(newGrid);
        setImmuneCells(newImmuneCells);
        setBacteria(finalBacteria);
    }, [grid, immuneCells, bacteria, gridSize]);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(updateSimulation, 100);
        }
        return () => clearInterval(intervalRef.current);
    }, [running, updateSimulation]);

    const addBacteria = () => {
        const occupiedPositions = new Set([...immuneCells, ...bacteria].map(c => `${c.x},${c.y}`));
        let attempts = 0;
        let newBact;
        do {
            newBact = spawnBacteria(gridSize);
            attempts++;
        } while (occupiedPositions.has(`${newBact.x},${newBact.y}`) && attempts < 100);
        if (attempts < 100) {
            setBacteria(prev => [...prev, newBact]);
        }
    };

    return (
        <div className="app">
            <div className="title-container">
                <h1>Immune System Simulation</h1>
                <p className="subtitle">
                    Watch as immune cells defend against bacterial invasion in this interactive simulation.
                    Observe how different types of immune cells work together to protect the organism.
                </p>
            </div>

            <div className="simulation-container">
                <div className="main-area">
                    <div className="main-content">
                        <div className="canvas-container">
                            <GridCanvas
                                grid={grid}
                                immuneCells={immuneCells}
                                bacteria={bacteria}
                                gridSize={gridSize}
                            />
                        </div>
                    </div>

                    <div className="controls">
                        <div className="control-buttons">
                            <button onClick={() => setRunning(!running)}>
                                {running ? '⏸ Pause' : '▶️ Start'}
                            </button>
                            <button onClick={addBacteria}>
                                🦠 Add Bacteria
                            </button>
                            <button onClick={() => {
                                const newCell = spawnImmuneCell(gridSize);
                                const occupied = immuneCells.some(c => c.x === newCell.x && c.y === newCell.y) ||
                                                 bacteria.some(b => b.x === newCell.x && b.y === newCell.y);
                                if (!occupied) {
                                    setImmuneCells(prev => [...prev, newCell]);
                                }
                            }}>
                                🛡️ Add Immune Cell
                            </button>
                            <button onClick={() => {
                                setGrid(initializeGrid(gridSize));
                                setImmuneCells(initializeImmuneCells(gridSize));
                                setBacteria([]);
                                setRunning(false);
                            }}>
                                🔄 Reset
                            </button>
                        </div>

                        <div className="stats">
                            <p><span>🛡️</span> Immune Cells: <strong>{immuneCells.length}</strong></p>
                            <p><span>🦠</span> Bacteria: <strong>{bacteria.length}</strong></p>
                            <p><span>{running ? '⚡' : '⏸'}</span> Status: <strong>{running ? 'Active' : 'Paused'}</strong></p>
                        </div>
                    </div>
                </div>

                <div className="side-content">
                    <div className="legend">
                        <h3>Cell Types & Behaviors</h3>
                        <div className="legend-grid">
                            <div className="legend-item">
                                <div className="legend-emoji">🛡️</div>
                                <div className="legend-info">
                                    <strong>Macrophage</strong>
                                    <span>Eats bacteria</span>
                                </div>
                            </div>
                            <div className="legend-item">
                                <div className="legend-emoji">⚔️</div>
                                <div className="legend-info">
                                    <strong>T-Cell</strong>
                                    <span>Heals infected tissue</span>
                                </div>
                            </div>
                            <div className="legend-item">
                                <div className="legend-emoji">🎯</div>
                                <div className="legend-info">
                                    <strong>B-Cell</strong>
                                    <span>Marks bacteria</span>
                                </div>
                            </div>
                            <div className="legend-item">
                                <div className="legend-emoji">🦠</div>
                                <div className="legend-info">
                                    <strong>Bacteria</strong>
                                    <span>Infects healthy tissue</span>
                                </div>
                            </div>
                            <div className="legend-item">
                                <div className="legend-emoji">🫀</div>
                                <div className="legend-info">
                                    <strong>Healthy Tissue</strong>
                                    <span>Normal body cells</span>
                                </div>
                            </div>
                            <div className="legend-item">
                                <div className="legend-emoji">🩸</div>
                                <div className="legend-info">
                                    <strong>Infected Tissue</strong>
                                    <span>Tissue under bacterial attack</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="attribution">
                Created with 💜 by <a href="https://lance.name" target="_blank" rel="noopener noreferrer">Lance</a>
            </div>
        </div>
    );
};

export default App;