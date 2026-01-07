
export interface Boundary {
  start: number; // Percentage 0-100
  end: number;   // Percentage 0-100
}

export interface GridLines {
  horizontal: Boundary[]; 
  vertical: Boundary[];
}

export interface SliceResult {
  dataUrl: string;
  index: number;
  row: number;
  col: number;
}
