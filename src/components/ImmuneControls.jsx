import PropTypes from 'prop-types';

const ImmuneControls = ({ running, setRunning, reset, addCell, addBacteria, cellCount, bacteriaCount }) => {
  const legendItems = [
    { color: '#E0E0E0', label: 'Healthy Tissue' },
    { color: '#FF69B4', label: 'Infected Tissue' },
    { color: '#FF4500', label: 'Macrophage (Eats Bacteria)' },
    { color: '#00CED1', label: 'T-Cell (Heals Infected)' },
    { color: '#FFD700', label: 'B-Cell (Marks Bacteria)' },
    { color: '#800080', label: 'Bacteria' },
    { color: '#800080', label: 'Marked Bacteria', border: true }
  ];

  return (
    <div className="controls">
      <div className="control-buttons">
        <button onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
        <button onClick={reset}>Reset</button>
        <button onClick={() => addCell()}>Add Immune Cell ({cellCount})</button>
        <button onClick={addBacteria}>Add Bacteria ({bacteriaCount})</button>
      </div>
      <div className="stats">
        <p>Bacteria: {bacteriaCount}</p>
        <p>Immune Cells: {cellCount}</p>
      </div>
      <div className="legend">
        <h3>Legend</h3>
        {legendItems.map((item, index) => (
          <div key={index} className="legend-item">
            <span
              className="legend-color"
              style={{
                backgroundColor: item.color,
                border: item.border ? '2px solid #FFFFFF' : 'none'
              }}
            ></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

ImmuneControls.propTypes = {
  running: PropTypes.bool.isRequired,
  setRunning: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  addCell: PropTypes.func.isRequired,
  addBacteria: PropTypes.func.isRequired,
  cellCount: PropTypes.number.isRequired,
  bacteriaCount: PropTypes.number.isRequired
};

export default ImmuneControls;