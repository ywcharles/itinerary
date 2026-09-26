"use client";

import React, { useState } from "react";
import type { NewStop } from "../types";

type FormState = {
  name: string;
  start_time: string;
  end_time: string;
  description: string;
  google_maps_url: string;
};

const emptyForm: FormState = {
  name: "",
  start_time: "",
  end_time: "",
  description: "",
  google_maps_url: "",
};

type Props = {
  itineraryId: string;
  nextStopOrder: number;
  onAdd: (stop: NewStop) => Promise<unknown>;
  onClose: () => void;
};

export default function AddEventDialog({
  itineraryId,
  nextStopOrder,
  onAdd,
  onClose,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.start_time || !form.end_time) {
      setError("Name, start time, and end time are required.");
      return;
    }

    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError("End time must be after start time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAdd({
        itinerary_id: itineraryId,
        stop_order: nextStopOrder,
        name: form.name,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        description: form.description || null,
        google_maps_url: form.google_maps_url || null,
        latitude: null,
        longitude: null,
        image_url: null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save this event.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20";
  const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add event</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Lunch at the market"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start</label>
              <input
                type="datetime-local"
                className={`${inputClass} [color-scheme:light]`}
                value={form.start_time}
                onChange={handleChange("start_time")}
              />
            </div>
            <div>
              <label className={labelClass}>End</label>
              <input
                type="datetime-local"
                className={`${inputClass} [color-scheme:light]`}
                value={form.end_time}
                onChange={handleChange("end_time")}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Optional details"
            />
          </div>

          <div>
            <label className={labelClass}>Google Maps link</label>
            <input
              className={inputClass}
              value={form.google_maps_url}
              onChange={handleChange("google_maps_url")}
              placeholder="https://maps.google.com/..."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}