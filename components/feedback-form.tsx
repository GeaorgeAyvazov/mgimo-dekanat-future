"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Send } from "lucide-react";
import {
  feedbackDepartment,
  feedbackReasons,
  services,
  type Case,
  type Student,
} from "@/lib/catalog";
import styles from "./feedback-form.module.css";

type FeedbackReason = (typeof feedbackReasons)[number]["id"];

export type FeedbackPayload = {
  service: "feedback";
  format: "electronic";
  feedbackReason: FeedbackReason;
  relatedRequestId?: string;
  message: string;
  idempotencyKey: string;
};

type FeedbackFormProps = {
  user: Student;
  relatedRequest?: Pick<Case, "id" | "service">;
  back: () => void;
  backLabel: string;
  create: (payload: FeedbackPayload) => Promise<void>;
};

export function FeedbackForm({
  user,
  relatedRequest,
  back,
  backLabel,
  create,
}: FeedbackFormProps) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reasonField = useRef<HTMLSelectElement>(null);
  const messageField = useRef<HTMLTextAreaElement>(null);
  const submissionKey = useRef<string | null>(null);
  const selectedReason = feedbackReasons.find((item) => item.id === reason);
  const linkedService = services.find(
    (item) => item.id === relatedRequest?.service,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const text = message.trim();
    if (!selectedReason || text.length < 10 || text.length > 2000) {
      setError(
        !selectedReason
          ? "Выберите тип проблемы."
          : "Опишите проблему. Нужно от 10 до 2000 символов.",
      );
      if (!selectedReason) reasonField.current?.focus();
      else messageField.current?.focus();
      return;
    }

    setError("");
    if (!reviewing) {
      setReviewing(true);
      requestAnimationFrame(() => reviewHeading.current?.focus());
      return;
    }

    setBusy(true);
    submissionKey.current ??= crypto.randomUUID();
    try {
      await create({
        service: "feedback",
        format: "electronic",
        feedbackReason: selectedReason.id,
        ...(relatedRequest && { relatedRequestId: relatedRequest.id }),
        message: text,
        idempotencyKey: submissionKey.current,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось отправить сообщение. Попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  }

  function edit() {
    setReviewing(false);
    setError("");
    requestAnimationFrame(() => reasonField.current?.focus());
  }

  const deliveryDetails = (
    <dl className={styles.details}>
      <div>
        <dt>Получатель</dt>
        <dd>{feedbackDepartment}</dd>
      </div>
      {relatedRequest && (
        <div>
          <dt>Связанная заявка</dt>
          <dd>
            № {relatedRequest.id.slice(-8).toUpperCase()}
            {linkedService && ` · ${linkedService.title}`}
          </dd>
        </div>
      )}
      {reviewing && (
        <>
          <div>
            <dt>Тип проблемы</dt>
            <dd>{selectedReason?.label}</dd>
          </div>
          <div>
            <dt>Данные профиля</dt>
            <dd>
              {user.name}
              {user.student_group && ` · ${user.student_group}`}
            </dd>
          </div>
        </>
      )}
    </dl>
  );

  return (
    <>
      <button
        type="button"
        className="back-button"
        onClick={back}
        disabled={busy}
      >
        <ArrowLeft size={17} />
        {backLabel}
      </button>
      <div className="page-heading">
        <div>
          <h1>Сообщить о проблеме</h1>
          <p>Ответ координатора появится в разделе «Обращения».</p>
        </div>
      </div>
      <form className="panel appeal-form" onSubmit={submit} aria-busy={busy}>
        {reviewing ? (
          <>
            <h2 ref={reviewHeading} tabIndex={-1}>
              Проверьте сообщение
            </h2>
            {deliveryDetails}
            <div className={styles.preview}>
              <h3>Ваше сообщение</h3>
              <p>{message.trim()}</p>
            </div>
          </>
        ) : (
          <>
            {deliveryDetails}
            <div className="form-field">
              <label htmlFor={`${id}-reason`}>Тип проблемы *</label>
              <select
                id={`${id}-reason`}
                ref={reasonField}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  submissionKey.current = null;
                  setError("");
                }}
                required
              >
                <option value="" disabled>
                  Выберите тип проблемы
                </option>
                {feedbackReasons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor={`${id}-message`}>Что произошло? *</label>
              <textarea
                id={`${id}-message`}
                ref={messageField}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  submissionKey.current = null;
                  setError("");
                }}
                aria-describedby={`${id}-privacy`}
                placeholder="Опишите ситуацию и укажите, что нужно исправить."
                rows={6}
                minLength={10}
                maxLength={2000}
                required
              />
            </div>
          </>
        )}
        <p id={`${id}-privacy`} className={styles.privacy}>
          В демо-режиме координатор увидит имя и группу из вашего профиля.
          Используйте вымышленные сведения без паспортных, медицинских и
          платёжных данных.
        </p>
        {error && <div className="error" role="alert">{error}</div>}
        <div className={`appeal-footer ${styles.actions}`}>
          <button className="button primary" type="submit" disabled={busy}>
            {reviewing ? (
              busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Send size={17} />
              )
            ) : (
              <ArrowRight size={17} />
            )}
            {reviewing
              ? busy
                ? "Отправляем…"
                : "Отправить сообщение"
              : "Проверить сообщение"}
          </button>
          {reviewing && (
            <button
              className="button secondary"
              type="button"
              onClick={edit}
              disabled={busy}
            >
              Изменить
            </button>
          )}
        </div>
      </form>
    </>
  );
}
