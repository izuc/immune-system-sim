import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const GridCanvas = ({ grid, cells, size }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = Math.min(window.innerWidth / size.width, window.innerHeight / size.height) * 0.8;

    canvas.width = size.width * cellSize;
    canvas.height = size.height * cellSize;

    // Draw grid
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw cells (immune and bacteria)
    cells.forEach(cell => {
      ctx.fillStyle = cell.color;
      ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      if (cell.marked) { // Antibody marker
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
      }
    });
  }, [grid, cells, size]);

  return <canvas ref={canvasRef} style={{ touchAction: 'none' }} />;
};

GridCanvas.propTypes = {
  grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  cells: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    type: PropTypes.string,
    marked: PropTypes.bool
  })).isRequired,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired
  }).isRequired
};

export default GridCanvas;