import React, { useRef, useState } from "react";
import {
  getEventPosition,
  formatTime,
  formatDay,
  dayKey,
  endDayKey,
  toTimestamp,
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
} from "./calendarUtils";
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
// Pointer movement below this is a click, not a drag.
const DRAG_THRESHOLD_PX = 4;

const MINUTE_MS = 60_000;

type DragMode = "move" | "resize-start" | "resize-end";

type Props = {
  // The day the grid shows (YYYY-MM-DD); events from or into other days are clipped to it.
  day: string;
  lane: { column: number; columns: number };
  // Same number as the stop's pin on the map.
  number: number;
  title: string;
  start: string;
  end: string;
  selected: boolean;
  onClick: () => void;
  onTimeChange: (start: string, end: string) => void;
};

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export default function CalendarEvent({
  day,
  lane,
  number,
  title,
  start,
  end,
  selected,
  onClick,
  onTimeChange,
}: Props) {
  const drag = useRef<{ mode: DragMode; startY: number; moved: boolean } | null>(null);
  const [preview, setPreview] = useState<{ start: Date; end: Date } | null>(null);

  const originalStart = new Date(start);
  const originalEnd = new Date(end);
  const startDate = preview?.start ?? originalStart;
  const endDate = preview?.end ?? originalEnd;

  // Events that cross midnight are clipped to the shown day's grid, and can't be dragged
  // (moving them would need a multi-day view).
  const endsLaterDay = endDayKey(endDate) !== dayKey(startDate);
  const startsEarlier = dayKey(startDate) < day;
  const continuesLater = endDayKey(endDate) > day;
  const visibleStart = startsEarlier ? new Date(toTimestamp(day, START_HOUR * 60)) : startDate;
  const visibleEnd = continuesLater ? new Date(toTimestamp(day, END_HOUR * 60)) : endDate;
  const draggable = !endsLaterDay;

  const { top, height } = getEventPosition(
    visibleStart,
    visibleEnd,
    START_HOUR,
    HOUR_HEIGHT,
  );
  const compact = height < 40;
  // Activities cycle through the 6 pastel colors defined in globals.css.
  const pastel = ((number - 1) % 6) + 1;
  const timeLabel = `${endsLaterDay ? `${formatDay(dayKey(startDate), "short")}, ` : ""}${formatTime(startDate)} – ${
    endsLaterDay ? `${formatDay(dayKey(endDate), "short")}, ` : ""
  }${formatTime(endDate)}`;

  // New start/end for a drag of `deltaMinutes`, kept inside the visible grid.
  const applyDelta = (mode: DragMode, deltaMinutes: number) => {
    const gridStart = START_HOUR * 60;
    const gridEnd = END_HOUR * 60;
    const startMin = minutesOfDay(originalStart);
    const durationMin = (originalEnd.getTime() - originalStart.getTime()) / MINUTE_MS;

    let delta = deltaMinutes;
    if (mode === "move") {
      delta = Math.min(Math.max(delta, gridStart - startMin), gridEnd - durationMin - startMin);
      return {
        start: new Date(originalStart.getTime() + delta * MINUTE_MS),
        end: new Date(originalEnd.getTime() + delta * MINUTE_MS),
      };
    }
    if (mode === "resize-start") {
      delta = Math.min(Math.max(delta, gridStart - startMin), durationMin - MIN_DURATION_MINUTES);
      return { start: new Date(originalStart.getTime() + delta * MINUTE_MS), end: originalEnd };
    }
    const endMin = minutesOfDay(originalEnd);
    delta = Math.min(Math.max(delta, MIN_DURATION_MINUTES - durationMin), gridEnd - endMin);
    return { start: originalStart, end: new Date(originalEnd.getTime() + delta * MINUTE_MS) };
  };

  const beginDrag = (mode: DragMode, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (!draggable) {
      // Still select it, and keep the grid from starting a "create" drag.
      e.stopPropagation();
      if (mode === "move") onClick();
      return;
    }
    // Keep the grid from starting a "create" drag, and the edge handles from also starting a move.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, startY: e.clientY, moved: false };
  };

  const onMoveDown = (e: React.PointerEvent<HTMLElement>) => beginDrag("move", e);
  const onResizeStartDown = (e: React.PointerEvent<HTMLElement>) => beginDrag("resize-start", e);
  const onResizeEndDown = (e: React.PointerEvent<HTMLElement>) => beginDrag("resize-end", e);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const dy = e.clientY - current.startY;
    if (!current.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    current.moved = true;
    const deltaMinutes = Math.round((dy / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
    setPreview(applyDelta(current.mode, deltaMinutes));
  };

  const handlePointerUp = () => {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (!current.moved) {
      onClick();
      return;
    }
    if (preview && (preview.start.getTime() !== originalStart.getTime() || preview.end.getTime() !== originalEnd.getTime())) {
      onTimeChange(preview.start.toISOString(), preview.end.toISOString());
    }
    onClick();
    setPreview(null);
  };

  const dragHandlers = {
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: () => {
      drag.current = null;
      setPreview(null);
    },
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onPointerDown={onMoveDown}
      {...dragHandlers}
      // Classic calendar block in a pastel color; the selected one gets a blue outline.
      className={`group absolute flex flex-col justify-start rounded-[4px] px-1.5 py-1 overflow-hidden text-left touch-none select-none ${
        preview ? "cursor-grabbing z-20 opacity-90" : draggable ? "cursor-grab hover:brightness-[0.97]" : "cursor-pointer hover:brightness-[0.97]"
      } ${selected ? "z-10 ring-2 ring-primary" : "ring-1 ring-surface"}`}
      style={{
        backgroundColor: `var(--pastel-${pastel}-bg)`,
        color: `var(--pastel-${pastel}-text)`,
        top: `${top}px`,
        height: `${height}px`,
        // Overlapping events share the width in columns (2px left inset, 8px right).
        left: `calc(2px + (100% - 10px) * ${lane.column / lane.columns})`,
        width: `calc((100% - 10px) / ${lane.columns} - ${lane.columns > 1 ? 2 : 0}px)`,
      }}
    >
      {/* Edge handles for changing start and end, like Google Calendar.
          Their captured pointer events bubble up to the handlers above. */}
      {draggable && (
        <div
          aria-hidden
          onPointerDown={onResizeStartDown}
          className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
        />
      )}
      {draggable && (
        <div
          aria-hidden
          onPointerDown={onResizeEndDown}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        >
          <div className="mx-auto mt-0.5 h-1 w-8 rounded-full bg-current opacity-0 group-hover:opacity-30" />
        </div>
      )}

      {/* Short blocks get title and time on one line, like a classic calendar. */}
      <p className={`text-xs font-semibold leading-4 ${compact ? "truncate" : "line-clamp-2"}`}>
        {number}. {title}
        {compact && <span className="font-normal opacity-75">, {timeLabel}</span>}
      </p>
      {!compact && <p className="truncate text-[11px] leading-4 opacity-75">{timeLabel}</p>}
    </div>
  );
}
