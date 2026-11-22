"use client";

import { useId, useRef, useState } from "react";
import {
  Bell,
  ArrowLeft,
  Megaphone,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateLabel, type Notice } from "@/lib/catalog";

const icons: Record<string, typeof Bell> = {
  announcement: Megaphone,
  request: FileText,
  schedule: CalendarDays,
  deadline: Clock3,
};

export function NotificationPopover({
  notices,
  onOpenNotice,
  onReadAll,
  onRead,
  onRefresh,
}: {
  notices: Notice[];
  onOpenNotice: (notice: Notice) => void;
  onReadAll: () => Promise<void>;
  onRead: (id: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const navigating = useRef(false);
  const titleId = useId();
  const [selectedId, setSelectedId] = useState("");
  const selected = notices.find(n => n.id === selectedId);
  const unread = notices.filter((notice) => !notice.read).length;

  async function readAll() {
    setMarking(true);
    try {
      await onReadAll();
    } finally {
      setMarking(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={next => {
      setOpen(next);
      setSelectedId("");
      if (next) onRefresh();
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="icon-btn notification-button"
          aria-label={`Уведомления${unread ? `, непрочитанных: ${unread}` : ""}`}
        >
          <Bell size={22} aria-hidden="true" />
          {unread > 0 && <span className="notification-dot" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="notification-popover"
        aria-labelledby={titleId}
        side="bottom"
        align="end"
        sideOffset={8}
        collisionPadding={12}
        onCloseAutoFocus={(event) => {
          if (navigating.current) {
            event.preventDefault();
            navigating.current = false;
          }
        }}
      >
        <header className="notification-popover-header">
          {selected && <button className="icon-btn" aria-label="К списку уведомлений" onClick={() => setSelectedId("")}><ArrowLeft size={18} /></button>}
          <h2 id={titleId}>{selected ? "Объявление деканата" : "Уведомления"}</h2>
          {!selected && unread > 0 && (
            <button
              type="button"
              className="text-button notification-read-all"
              disabled={marking}
              onClick={() => void readAll()}
            >
              Прочитать все
            </button>
          )}
          <button
            type="button"
            className="icon-btn notification-close"
            aria-label="Закрыть уведомления"
            onClick={() => setOpen(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {selected ? <article className="bulletin-detail">
          <small>{selected.audience === "*" ? "Все студенты" : `Группа ${selected.audience}`} · {dateLabel(selected.date, true)} МСК</small>
          <h3>{selected.title}</h3><p>{selected.text}</p>
        </article> : notices.length ? (
          <ul className="notification-feed">
            {notices.map((notice) => {
              const Icon = icons[notice.type] || Bell;
              return (
                <li key={notice.id}>
                  <button
                    type="button"
                    className="notification-feed-item"
                    data-unread={!notice.read}
                    onClick={() => {
                      if (notice.type === "announcement") {
                        setSelectedId(notice.id);
                        if (!notice.read) void onRead(notice.id);
                        return;
                      }
                      navigating.current = true;
                      setOpen(false);
                      onOpenNotice(notice);
                    }}
                  >
                    <span className={`notification-feed-icon ${notice.type}`}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="notification-feed-copy">
                      <strong>{notice.title}</strong>
                      <span className={notice.type === "announcement" ? "bulletin-preview" : undefined}>{notice.text}</span>
                      <time dateTime={notice.date}>
                        {dateLabel(notice.date, notice.type === "request")}
                      </time>
                    </span>
                    {!notice.read && <span className="sr-only">Новое</span>}
                    <ChevronRight
                      className="notification-feed-arrow"
                      size={16}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="notification-feed-empty">Пока нет уведомлений</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
