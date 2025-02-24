import { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const CELL_EMOJIS = {
  HEALTHY: '🫀',
  INFECTED: '🩸',
  EMPTY: '⬜'
};

const IMMUNE_CELL_EMOJIS = {
  macrophage: '🛡️',
  tcell: '⚔️',
  bcell: '🎯'
};

const GridCanvas = ({ grid, immuneCells, bacteria, gridSize }) => {
  const canvasRef = useRef(null);
  const [cellSize, setCellSize] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const calculateSizes = useCallback(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width - 16;
    const containerHeight = containerRect.height - 16;

    const maxCellWidth = containerWidth / gridSize.width;
    const maxCellHeight = containerHeight / gridSize.height;
    
    const newCellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight, 35));
    
    const canvasWidth = gridSize.width * newCellSize;
    const canvasHeight = gridSize.height * newCellSize;

    setCellSize(newCellSize);
    setCanvasSize({ width: canvasWidth, height: canvasHeight });
  }, [gridSize.width, gridSize.height]);

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(calculateSizes);
    };

    calculateSizes();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateSizes]);

  useEffect(() => {
    if (!canvasRef.current || !cellSize) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.imageSmoothingEnabled = true;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= gridSize.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= gridSize.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvas.width, y * cellSize);
        ctx.stroke();
    }
    
    for (let y = 0; y < gridSize.height; y++) {
        for (let x = 0; x < gridSize.width; x++) {
            const centerX = x * cellSize + cellSize / 2;
            const centerY = y * cellSize + cellSize / 2;

            const fontSize = Math.max(Math.floor(cellSize * 0.85), 16);
            ctx.font = `${fontSize}px Arial`;
            let emoji = CELL_EMOJIS.EMPTY;
            
            if (grid[y][x] === '#E0E0E0') {
                emoji = CELL_EMOJIS.HEALTHY;
            } else if (grid[y][x] === '#FF69B4') {
                emoji = CELL_EMOJIS.INFECTED;
            }
            
            if (emoji !== CELL_EMOJIS.EMPTY) {
                ctx.fillText(emoji, centerX, centerY);
            }
        }
    }

    const drawEntity = (emoji, x, y) => {
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;
        const fontSize = Math.max(Math.floor(cellSize * 0.85), 16);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(emoji, centerX, centerY);
    };

    bacteria.forEach(cell => {
        if (cell.marked) {
            drawEntity('🎯', cell.x, cell.y);
        }
        drawEntity('🦠', cell.x, cell.y);
    });

    immuneCells.forEach(cell => {
        drawEntity(IMMUNE_CELL_EMOJIS[cell.type], cell.x, cell.y);
    });
  }, [grid, immuneCells, bacteria, gridSize, cellSize, canvasSize]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        touchAction: 'none',
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        margin: 'auto',
        backgroundColor: '#FAFAFA',
        imageRendering: 'pixelated',
      }} 
    />
  );
};

GridCanvas.propTypes = {
  grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  immuneCells: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    marked: PropTypes.bool
  })).isRequired,
  bacteria: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    marked: PropTypes.bool
  })).isRequired,
  gridSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }).isRequired
};

export default GridCanvas;