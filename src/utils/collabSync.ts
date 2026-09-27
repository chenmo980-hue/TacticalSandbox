import { CollabStaff, TacticalElement, TacticalLogMessage, TacticalState } from '../types/tactical';

export type CollabEvent =
  | { type: 'STATE_SYNC'; state: TacticalState; senderId: string }
  | { type: 'ELEMENT_ADD'; element: TacticalElement; senderId: string }
  | { type: 'ELEMENT_UPDATE'; element: TacticalElement; senderId: string }
  | { type: 'ELEMENT_DELETE'; elementId: string; senderId: string }
  | { type: 'CURSOR_MOVE'; staff: CollabStaff }
  | { type: 'TACTICAL_ORDER'; message: TacticalLogMessage }
  | { type: 'PING'; x: number; y: number; label: string; staffName: string; color: string }
  | { type: 'STAFF_JOIN'; staff: CollabStaff }
  | { type: 'STAFF_LEAVE'; staffId: string };

export class TacticalCollabManager {
  private channel: BroadcastChannel | null = null;
  private currentStaff: CollabStaff;
  private onEventCallback: (event: CollabEvent) => void;
  public activeStaffs: Map<string, CollabStaff> = new Map();

  constructor(currentStaff: CollabStaff, onEvent: (event: CollabEvent) => void) {
    this.currentStaff = currentStaff;
    this.onEventCallback = onEvent;
    this.activeStaffs.set(currentStaff.id, currentStaff);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('tactical_command_collab_bus');
      this.channel.onmessage = (e: MessageEvent<CollabEvent>) => {
        const event = e.data;
        if (!event) return;

        if (event.type === 'CURSOR_MOVE') {
          this.activeStaffs.set(event.staff.id, event.staff);
        } else if (event.type === 'STAFF_JOIN') {
          this.activeStaffs.set(event.staff.id, event.staff);
        } else if (event.type === 'STAFF_LEAVE') {
          this.activeStaffs.delete(event.staffId);
        }

        this.onEventCallback(event);
      };

      // 广播加入通知
      this.broadcast({
        type: 'STAFF_JOIN',
        staff: this.currentStaff,
      });
    }
  }

  public updateCurrentStaff(staff: CollabStaff) {
    this.currentStaff = staff;
    this.activeStaffs.set(staff.id, staff);
    this.broadcast({
      type: 'STAFF_JOIN',
      staff,
    });
  }

  public broadcast(event: CollabEvent) {
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn('Broadcast sync error:', err);
      }
    }
  }

  public broadcastCursor(x: number, y: number) {
    const updated: CollabStaff = {
      ...this.currentStaff,
      cursor: { x, y },
      lastActive: Date.now(),
    };
    this.activeStaffs.set(updated.id, updated);
    this.broadcast({
      type: 'CURSOR_MOVE',
      staff: updated,
    });
  }

  public broadcastPing(x: number, y: number, label = '战术重点关注') {
    this.broadcast({
      type: 'PING',
      x,
      y,
      label,
      staffName: this.currentStaff.name,
      color: this.currentStaff.color,
    });
  }

  public destroy() {
    if (this.channel) {
      this.broadcast({
        type: 'STAFF_LEAVE',
        staffId: this.currentStaff.id,
      });
      this.channel.close();
      this.channel = null;
    }
  }
}
