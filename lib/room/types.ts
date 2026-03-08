export type RoomObject = {
  id: string;
  type: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
  content?: string;
};

export type RoomState = {
  objects: RoomObject[];
  layout: string;
  theme: string;
};
