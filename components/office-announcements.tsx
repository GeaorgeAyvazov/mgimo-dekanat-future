"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { dateLabel, type Announcement, type AnnouncementBoard } from "@/lib/catalog";

type Client = <T>(path: string, payload?: unknown) => Promise<T>;

export function OfficeAnnouncements({ client }: { client: Client }) {
  const [board, setBoard] = useState<AnnouncementBoard | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState("");
  const submissionKey = useRef("");

  useEffect(() => {
    let active = true;
    client<AnnouncementBoard>("announcements").then(result => {
      if (active) setBoard(result);
    }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [client, retry]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    submissionKey.current ||= crypto.randomUUID();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const item = await client<Announcement>("announcements", { ...payload, submissionKey: submissionKey.current });
      setBoard(old => old && { ...old, messages: [item, ...old.messages.filter(m => m.id !== item.id)].slice(0, 100) });
      form.reset();
      submissionKey.current = "";
      setNotice("Объявление опубликовано");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function withdraw(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await client(`announcements/${id}/withdraw`, {});
      setBoard(old => old && { ...old, messages: old.messages.map(item =>
        item.id === id ? { ...item, withdrawn_at: new Date().toISOString() } : item) });
      setConfirmId("");
      setNotice("Объявление снято с публикации");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="office-announcements">
    {error && <p className="error" role="alert">{error} {!board && <button className="text-button" onClick={() => { setError(""); setRetry(n => n + 1); }}>Повторить</button>}</p>}
    {!board && !error && <p role="status">Загружаем объявления…</p>}
    {board && <>
      <form className="panel bulletin-form" onSubmit={publish} onChange={() => { submissionKey.current = ""; setNotice(""); }}>
        <h2>Новое объявление</h2>
        <fieldset disabled={busy}>
          <label>Получатели<select name="audience" required defaultValue="">
            <option value="" disabled>Выберите получателей</option>
            {board.groups.map(group => <option key={group} value={group}>Группа {group}</option>)}
            <option value="*">Все студенты</option>
          </select></label>
          <label>Заголовок<input name="title" maxLength={120} required /></label>
          <label>Текст объявления<textarea name="message" rows={4} maxLength={1600} required /></label>
          <button className="button primary">Опубликовать</button>
        </fieldset>
      </form>
      <div aria-live="polite">{notice}</div>
      <section className="panel bulletin-history">
        <h2>Мои публикации</h2>
        {!board.messages.length && <p>Здесь появятся отправленные объявления.</p>}
        {board.messages.map(item => <article key={item.id}>
          <small>{item.audience === "*" ? "Все студенты" : `Группа ${item.audience}`} · {dateLabel(item.published_at, true)} МСК</small>
          <h3>{item.title}</h3><p>{item.message}</p>
          {item.withdrawn_at ? <small>Снято с публикации</small> : confirmId === item.id ? <div className="bulletin-confirm">
            <span>Убрать из уведомлений студентов?</span>
            <button disabled={busy} className="text-button" onClick={() => void withdraw(item.id)}>Да, снять</button>
            <button disabled={busy} className="text-button" onClick={() => setConfirmId("")}>Оставить</button>
          </div> : <button disabled={busy} className="text-button" onClick={() => setConfirmId(item.id)}>Снять с публикации</button>}
        </article>)}
      </section>
    </>}
  </div>;
}
