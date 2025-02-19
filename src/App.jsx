import { useState, useEffect, useRef, useCallback } from 'react';
import GridCanvas from './components/GridCanvas';
import ImmuneControls from './components/ImmuneControls';
import './App.css';

// Helper functions
const randomDir = () => ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];

const moveCell = (cell, dir, gridSize) => {
    const moves = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const move = moves[dir];
    return {
        x: (cell.x + move.x + gridSize.width) % gridSize.width,
        y: (cell.y + move.y + gridSize.height) % gridSize.height
    };
};

const moveTowardBacteria = (cell, bacteria) => {
    const nearest = bacteria.reduce((closest, b) => {
        const dist = Math.abs(b.x - cell.x) + Math.abs(b.y - cell.y);
        return dist < Math.abs(closest.x - cell.x) + Math.abs(closest.y - cell.y) ? b : closest;
    }, bacteria[0]);
    if (nearest.x > cell.x) return 'right';
    if (nearest.x < cell.x) return 'left';
    if (nearest.y > cell.y) return 'down';
    return 'up';
};

const getAwayFromImmuneCells = (bacteria, immuneCells) => {
    const nearest = immuneCells.reduce((closest, cell) => {
        const dist = Math.abs(cell.x - bacteria.x) + Math.abs(cell.y - bacteria.y);
        return dist < Math.abs(closest.x - bacteria.x) + Math.abs(closest.y - bacteria.y) ? cell : closest;
    }, immuneCells[0]);
    if (nearest.x > bacteria.x) return 'left';
    if (nearest.x < bacteria.x) return 'right';
    if (nearest.y > bacteria.y) return 'up';
    return 'down';
};

const spawnImmuneCell = (gridSize) => {
    const types = ['macrophage', 'tcell', 'bcell'];
    const colors = { macrophage: '#FF4500', tcell: '#00CED1', bcell: '#FFD700' };
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.floor(Math.random() * gridSize.width),
        y: Math.floor(Math.random() * gridSize.height),
        type,
        dir: randomDir(),
        color: colors[type]
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
    const [immuneCells, setImmuneCells] = useState(initializeImmuneCells());
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

    function initializeImmuneCells() {
        const positions = [];
        const cells = [
            { id: Math.random().toString(36).substr(2, 9), x: 20, y: 20, type: 'macrophage', dir: 'up', color: '#FF4500' },
            { id: Math.random().toString(36).substr(2, 9), x: 30, y: 30, type: 'tcell', dir: 'right', color: '#00CED1' },
            { id: Math.random().toString(36).substr(2, 9), x: 25, y: 25, type: 'bcell', dir: 'down', color: '#FFD700' }
        ];
        // Ensure no initial overlap
        cells.forEach(cell => {
            while (positions.some(p => p.x === cell.x && p.y === cell.y)) {
                cell.x = Math.floor(Math.random() * gridSize.width);
                cell.y = Math.floor(Math.random() * gridSize.height);
            }
            positions.push({ x: cell.x, y: cell.y });
        });
        return cells;
    }

    const updateSimulation = useCallback(() => {
        const updateTissue = (grid) => {
            const newGrid = grid.map(row => [...row]);
            bacteria.forEach(b => {
                if (newGrid[b.y][b.x] === '#E0E0E0') newGrid[b.y][b.x] = '#FF69B4';
            });
            return newGrid;
        };

        const updateImmuneCells = (cells, grid, bacteria) => {
            const occupiedPositions = new Set(cells.map(c => `${c.x},${c.y}`));
            const infectionMemory = new Set();

            const newCells = cells.map(cell => {
                let newDir = bacteria.length > 0 ? moveTowardBacteria(cell, bacteria) : randomDir();
                let newPos = moveCell(cell, newDir, gridSize);

                while (occupiedPositions.has(`${newPos.x},${newPos.y}`) && newPos.x !== cell.x && newPos.y !== cell.y) {
                    newDir = randomDir();
                    newPos = moveCell(cell, newDir, gridSize);
                }
                occupiedPositions.delete(`${cell.x},${cell.y}`);
                occupiedPositions.add(`${newPos.x},${newPos.y}`);

                let newCell = { ...cell, x: newPos.x, y: newPos.y, dir: newDir };

                switch (cell.type) {
                    case 'macrophage': {
                        const nearbyBacteria = bacteria.filter(b =>
                            Math.abs(b.x - newCell.x) <= 2 &&
                            Math.abs(b.y - newCell.y) <= 2
                        );

                        if (nearbyBacteria.length > 0) {
                            const target = nearbyBacteria.find(b => b.marked) || nearbyBacteria[0];
                            setBacteria(prev => prev.filter(b => b.id !== target.id));

                            newCell.x = target.x;
                            newCell.y = target.y;

                            occupiedPositions.delete(`${newPos.x},${newPos.y}`);
                            occupiedPositions.add(`${newCell.x},${newCell.y}`);
                        }
                        break;
                    }
                    case 'tcell': {
                        // Create a copy of the grid that we'll modify
                        const newGrid = grid.map(row => [...row]);
                        let gridChanged = false;

                        // Heal infected tissue in a 2-cell radius
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const nx = (newCell.x + dx + gridSize.width) % gridSize.width;
                                const ny = (newCell.y + dy + gridSize.height) % gridSize.height;
                                if (newGrid[ny][nx] === '#FF69B4') {  // If infected tissue found
                                    newGrid[ny][nx] = '#E0E0E0';  // Heal it back to healthy tissue
                                    gridChanged = true;
                                    infectionMemory.add(`${nx},${ny}`);

                                    // Check for and remove any bacteria at this location
                                    const bacteriaAtLocation = bacteria.find(b => b.x === nx && b.y === ny);
                                    if (bacteriaAtLocation) {
                                        setBacteria(prev => prev.filter(b => b.id !== bacteriaAtLocation.id));
                                    }
                                }
                            }
                        }

                        // Only update the grid if changes were made
                        if (gridChanged) {
                            setGrid(newGrid);
                        }
                        break;
                    }
                    case 'bcell': {
                        const markingRadius = 3;
                        bacteria.forEach(b => {
                            if (Math.abs(b.x - newCell.x) <= markingRadius &&
                                Math.abs(b.y - newCell.y) <= markingRadius &&
                                !b.marked) {
                                b.marked = true;
                                cells.forEach(c => {
                                    if (c.type === 'macrophage' &&
                                        Math.abs(c.x - b.x) <= 4 &&
                                        Math.abs(c.y - b.y) <= 4) {
                                        c.dir = moveTowardBacteria(c, [b]);
                                    }
                                });
                            }
                        });
                        break;
                    }
                    default:
                        break;
                }
                return newCell;
            });

            if (bacteria.length > 5 && Math.random() < 0.1) {
                const newCell = spawnImmuneCell(gridSize);
                if (!occupiedPositions.has(`${newCell.x},${newCell.y}`)) {
                    newCells.push(newCell);
                }
            }
            return newCells;
        };

        const updateBacteria = (bacteria, immuneCells) => {
            const occupiedPositions = new Set([...immuneCells, ...bacteria].map(c => `${c.x},${c.y}`));
            let newBacteria = bacteria.map(b => {
                let newDir = immuneCells.some(cell =>
                    Math.abs(cell.x - b.x) <= 2 &&
                    Math.abs(cell.y - b.y) <= 2
                ) ? getAwayFromImmuneCells(b, immuneCells) : randomDir();

                let newPos = moveCell(b, newDir, gridSize);
                while (occupiedPositions.has(`${newPos.x},${newPos.y}`)) {
                    newDir = randomDir();
                    newPos = moveCell(b, newDir, gridSize);
                }
                occupiedPositions.delete(`${b.x},${b.y}`);
                occupiedPositions.add(`${newPos.x},${newPos.y}`);
                return { ...b, x: newPos.x, y: newPos.y };
            });

            const nearbyBacteria = (b) => newBacteria.filter(other =>
                Math.abs(other.x - b.x) <= 1 && Math.abs(other.y - b.y) <= 1
            ).length;

            const dividingBacteria = newBacteria.filter(b =>
                !b.marked &&
                Math.random() < (nearbyBacteria(b) > 2 ? 0.08 : 0.05) &&
                [-1, 0, 1].some(dy =>
                    [-1, 0, 1].some(dx =>
                        grid[(b.y + dy + gridSize.height) % gridSize.height][(b.x + dx + gridSize.width) % gridSize.width] === '#FF69B4'
                    )
                )
            );

            dividingBacteria.forEach(b => {
                let newPos = moveCell(b, randomDir(), gridSize);
                if (!occupiedPositions.has(`${newPos.x},${newPos.y}`)) {
                    newBacteria.push({
                        id: Math.random().toString(36).substr(2, 9),
                        x: newPos.x,
                        y: newPos.y,
                        color: '#800080',
                        marked: false
                    });
                    occupiedPositions.add(`${newPos.x},${newPos.y}`);
                }
            });

            if (Math.random() < 0.02) {
                const newBact = spawnBacteria(gridSize);
                if (!occupiedPositions.has(`${newBact.x},${newBact.y}`)) newBacteria.push(newBact);
            }
            return newBacteria;
        };

        setGrid(prevGrid => updateTissue(prevGrid));
        setImmuneCells(prevCells => updateImmuneCells(prevCells, grid, bacteria));
        setBacteria(prevBacteria => updateBacteria(prevBacteria, immuneCells));
    }, [grid, bacteria, immuneCells, gridSize]);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                updateSimulation();
            }, 100);
        }
        return () => clearInterval(intervalRef.current);
    }, [running, updateSimulation]);

    const addBacteria = () => {
        const occupiedPositions = new Set([...immuneCells, ...bacteria].map(c => `${c.x},${c.y}`));
        const newBact = spawnBacteria(gridSize);
        if (!occupiedPositions.has(`${newBact.x},${newBact.y}`)) {
            setBacteria(prev => [...prev, newBact]);
        }
    };

    return (
        <div className="app">
            <h1>Immune System Sim</h1>
            <GridCanvas grid={grid} cells={[...immuneCells, ...bacteria]} size={gridSize} />
            <ImmuneControls
                running={running}
                setRunning={setRunning}
                reset={() => { setGrid(initializeGrid(gridSize)); setImmuneCells(initializeImmuneCells()); setBacteria([]); }}
                addCell={spawnImmuneCell}
                addBacteria={addBacteria}
                cellCount={immuneCells.length}
                bacteriaCount={bacteria.length}
                bacteria={bacteria}
            />
        </div>
    );
};

export default App;