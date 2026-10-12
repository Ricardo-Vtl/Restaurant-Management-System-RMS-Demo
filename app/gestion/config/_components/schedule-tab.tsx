"use client";

import { useMemo } from "react";
import { useForm, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { scheduleSchema, timezoneSchema } from "@/lib/api-schemas";
import { useUpdateConfig, type FullConfig } from "../_hooks/use-config";
import { TabCard } from "./tab-card";

const scheduleFormSchema = z
  .object({
    schedule: scheduleSchema,
    closed_until: z
      .string()
      .datetime({ offset: true, message: "La fecha debe ser válida" })
      .nullable(),
    timezone: timezoneSchema,
  })
  .strict();

type ScheduleValues = z.infer<typeof scheduleFormSchema>;
type DayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

const DAY_LABELS: Record<DayKey, string> = {
  "0": "Domingo",
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
};
const DAY_KEYS: DayKey[] = ["0", "1", "2", "3", "4", "5", "6"];
const BASE_DAY = { open: "11:00", close: "21:00", closed: false };
const COMMON_TZ = [
  "America/Mexico_City",
  "America/Mazatlan",
  "America/Tijuana",
  "America/Monterrey",
  "America/Cancun",
  "America/Merida",
  "America/Chihuahua",
  "America/Hermosillo",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "UTC",
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DayRow({
  dayKey,
  register,
  control,
  onToggleClosed,
  error,
}: {
  dayKey: DayKey;
  register: UseFormRegister<ScheduleValues>;
  control: Control<ScheduleValues>;
  onToggleClosed: (v: boolean) => void;
  error?: string;
}) {
  const closed = useWatch({ control, name: `schedule.${dayKey}.closed` });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
      <Label className="w-full shrink-0 font-medium sm:w-24" htmlFor={`day-${dayKey}`}>
        {DAY_LABELS[dayKey]}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={`day-${dayKey}`}
          type="time"
          className="w-28"
          disabled={closed}
          {...register(`schedule.${dayKey}.open`)}
        />
        <span className="text-muted-foreground text-sm">a</span>
        <Input
          type="time"
          className="w-28"
          disabled={closed}
          aria-label={`Hora de cierre de ${DAY_LABELS[dayKey]}`}
          {...register(`schedule.${dayKey}.close`)}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Label htmlFor={`closed-${dayKey}`} className="text-sm text-muted-foreground">
          Cerrado
        </Label>
        <Switch id={`closed-${dayKey}`} checked={closed} onCheckedChange={onToggleClosed} />
      </div>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ScheduleTab({ config }: { config: FullConfig }) {
  const update = useUpdateConfig();

  const defaults = useMemo<ScheduleValues>(() => {
    const week = Object.fromEntries(
      DAY_KEYS.map((k) => [k, { ...BASE_DAY, ...(config.schedule?.[k] ?? {}) }]),
    );
    return {
      schedule: week as ScheduleValues["schedule"],
      closed_until: config.closed_until ?? null,
      timezone: config.timezone ?? "America/Mexico_City",
    };
  }, [config]);

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleFormSchema),
    values: defaults,
  });

  const closedUntil = useWatch({ control: form.control, name: "closed_until" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: config.id,
        updates: {
          schedule: values.schedule,
          closed_until: values.closed_until,
          timezone: values.timezone,
        },
      });
      toast.success("Horarios guardados");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  });

  return (
    <TabCard
      title="Horarios"
      description="Cuándo abre el local, cierres temporales y zona horaria del restaurante"
      onSave={onSubmit}
      isPending={update.isPending}
      isDirty={form.formState.isDirty}
    >
      <div className="flex flex-col gap-2">
        {DAY_KEYS.map((key) => (
          <DayRow
            key={key}
            dayKey={key}
            register={form.register}
            control={form.control}
            onToggleClosed={(v) => form.setValue(`schedule.${key}.closed`, v, { shouldDirty: true })}
            error={form.formState.errors.schedule?.[key]?.close?.message}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          Si el cierre es anterior a la apertura (ej. 13:00 a 01:00) el horario cruza la medianoche.
          Un día sin horario se toma como cerrado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="closed_until">Cerrado temporalmente hasta</Label>
          <Input
            id="closed_until"
            type="datetime-local"
            value={toLocalInput(closedUntil)}
            onChange={(e) =>
              form.setValue(
                "closed_until",
                e.target.value ? new Date(e.target.value).toISOString() : null,
                { shouldDirty: true },
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Vacaciones o remodelación: mientras dure, el sitio mostrará &quot;Cerrado&quot; sin tocar el
            horario semanal.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Zona horaria</Label>
          <Input
            id="timezone"
            list="tz-common"
            placeholder="America/Mexico_City"
            {...form.register("timezone")}
          />
          <datalist id="tz-common">
            {COMMON_TZ.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
          {form.formState.errors.timezone && (
            <p className="text-xs text-destructive">{form.formState.errors.timezone.message}</p>
          )}
        </div>
      </div>
    </TabCard>
  );
}
