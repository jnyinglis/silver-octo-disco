export type InteractionPayload = Record<string, unknown>;
export type InteractionType = 'filter' | 'drill' | 'select';

export interface InteractionEvent {
  type: InteractionType;
  sourceTileId: string;
  targetDimension?: string;
  payload?: InteractionPayload;
}

type InteractionListener = (event: InteractionEvent) => void;

export default class InteractionBus {
  private listeners = new Set<InteractionListener>();

  emit(event: InteractionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  subscribe(listener: InteractionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
