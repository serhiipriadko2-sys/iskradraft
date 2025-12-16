
import { PlanElement, CableRun, RoomDimensions, Wall } from '../types';

export const generateDXF = (
  elements: PlanElement[], 
  runs: CableRun[], 
  walls: Wall[],
  dimensions: RoomDimensions
): string => {
  let dxf = "";
  
  // Header
  dxf += "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
  
  // Entities
  dxf += "0\nSECTION\n2\nENTITIES\n";

  // Helpers
  const width = dimensions.width;
  const length = dimensions.length;

  const drawLine = (x1: number, y1: number, x2: number, y2: number, layer: string, color: number) => {
    return `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${x1}\n20\n${y1}\n30\n0.0\n11\n${x2}\n21\n${y2}\n31\n0.0\n`;
  };
  
  const drawCircle = (x: number, y: number, r: number, layer: string, color: number) => {
     return `0\nCIRCLE\n8\n${layer}\n62\n${color}\n10\n${x}\n20\n${y}\n30\n0.0\n40\n${r}\n`;
  };

  const drawText = (x: number, y: number, text: string, height: number, layer: string, rotation: number = 0) => {
    return `0\nTEXT\n8\n${layer}\n10\n${x}\n20\n${y}\n30\n0.0\n40\n${height}\n1\n${text}\n50\n${rotation}\n`;
  };

  const drawRect = (cx: number, cy: number, w: number, h: number, rotation: number, layer: string, color: number) => {
      // Very basic rect, ignores rotation for simplicity in this primitive implementation
      // To do proper rotation, we need to rotate corners around cx,cy
      const hw = w/2;
      const hh = h/2;
      // Drawing AABB for now to prevent complexity
      return drawLine(cx-hw, cy-hh, cx+hw, cy-hh, layer, color) +
             drawLine(cx+hw, cy-hh, cx+hw, cy+hh, layer, color) +
             drawLine(cx+hw, cy+hh, cx-hw, cy+hh, layer, color) +
             drawLine(cx-hw, cy+hh, cx-hw, cy-hh, layer, color);
  };

  // 1. Room Bounds (Layer 7 = White/Black)
  dxf += drawLine(0, 0, width, 0, "ROOM_BOUNDS", 7);
  dxf += drawLine(width, 0, width, length, "ROOM_BOUNDS", 7);
  dxf += drawLine(width, length, 0, length, "ROOM_BOUNDS", 7);
  dxf += drawLine(0, length, 0, 0, "ROOM_BOUNDS", 7);

  // 1.1 Drawn Walls
  // DXF Y is Up, Screen Y is Down. 
  const fixY = (yPerc: number) => length - ((yPerc / 100) * length);
  const realX = (xPerc: number) => (xPerc / 100) * width;

  walls.forEach(w => {
     dxf += drawLine(realX(w.x1), fixY(w.y1), realX(w.x2), fixY(w.y2), "WALLS", 7);
  });

  // 2. Cables
  runs.forEach(run => {
    const start = elements.find(e => e.id === run.fromId);
    const end = elements.find(e => e.id === run.toId);
    if (start && end) {
      const layer = run.type === 'light' ? 'CABLE_LIGHT' : 'CABLE_POWER';
      const color = run.type === 'light' ? 2 : 5; // 2=Yellow, 5=Blue

      // Simple straight line for DXF (Orthogonal points not stored in Run yet)
      // For a better DXF we would need to export the calculated orthogonal points
      dxf += drawLine(realX(start.x), fixY(start.y), realX(end.x), fixY(end.y), layer, color);
    }
  });

  // 3. Elements
  elements.forEach(el => {
    const x = realX(el.x);
    const y = fixY(el.y);
    const rot = el.rotation || 0;
    
    let layer = "DEVICES";
    let color = 3; // Green

    if (el.type === 'door' || el.type === 'window') {
        layer = "ARCH";
        color = 6; // Magenta
        // Draw Door/Window logic
        // Simple representation
        dxf += drawCircle(x, y, 0.4, layer, color); 
    } else {
        // Electrical Device
        dxf += drawCircle(x, y, 0.15, layer, color);
    }
    
    // Labels
    if (el.label) {
      dxf += drawText(x + 0.2, y + 0.2, el.label, 0.1, "TEXT", 0);
    }
    if (el.circuitId) {
      dxf += drawText(x + 0.2, y - 0.2, el.circuitId, 0.08, "TEXT", 0);
    }
  });

  dxf += "0\nENDSEC\n0\nEOF\n";
  return dxf;
};
