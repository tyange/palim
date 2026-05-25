export type CellKey = string;

export interface DisplayCell {
  row: number;
  col: number;
  value: string;
  guides: {
    borderLeft?: boolean;
    borderRight?: boolean;
    centerVertical?: boolean;
    centerHorizontal?: boolean;
    diagonalForward?: boolean;
    diagonalBackward?: boolean;
  };
  selected: boolean;
}
